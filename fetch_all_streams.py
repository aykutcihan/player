"""
tvkulesi.com ve kavuntv.net'ten tüm kategorilerdeki kanalları çek.
Mevcut playlist'e variant olarak ekle, yeni kanalları da dahil et.
"""
import sys, io, re
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).resolve().parent
PLAYLIST = ROOT / "playlist.m3u"

SITES = {
    "tvkulesi": {
        "base": "https://tr.tvkulesi.com",
        "categories": ["ulusal", "haber", "spor", "cocuk", "dini", "yerel"],
    },
    "kavuntv": {
        "base": "https://amp.kavuntv.net",
        "categories": ["ulusal", "haber", "spor", "cocuk", "dini", "yerel"],
    },
}

CAT_GROUP = {
    "ulusal": "Ulusal",
    "haber": "Haber",
    "spor": "Spor",
    "cocuk": "Cocuk",
    "dini": "Dini",
    "yerel": "Yerel",
}


def get_channel_links(base, category):
    """Kategori sayfasındaki kanal linklerini al."""
    links = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36")
            ctx.add_init_script('Object.defineProperty(navigator,"webdriver",{get:()=>undefined})')
            page = ctx.new_page()
            page.goto(f"{base}/kategori/{category}", wait_until="networkidle", timeout=25000)
            page.wait_for_timeout(2000)
            content = page.content()
            browser.close()

        soup = BeautifulSoup(content, "lxml")
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            name = a.get_text(strip=True)
            if (href and name and len(name) < 40
                    and base in href
                    and not any(x in href for x in ["kategori", "iletisim", "hakkimizda", "#"])):
                slug = href.rstrip("/").split("/")[-1]
                if slug and slug not in [l[1] for l in links]:
                    links.append((name, slug))
    except Exception as e:
        print(f"  [liste] {category} hatasi: {e}")
    return links


def get_stream(base, slug):
    """Kanal sayfasından stream URL'ini al."""
    streams = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36")
            ctx.add_init_script('Object.defineProperty(navigator,"webdriver",{get:()=>undefined})')
            page = ctx.new_page()
            page.on("request", lambda r: streams.append(r.url)
                    if ".m3u8" in r.url.lower() and "chunk" not in r.url.lower() else None)
            page.goto(f"{base}/{slug}", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(3000)
            browser.close()
    except Exception:
        pass
    return list(dict.fromkeys(streams))


def main():
    content = PLAYLIST.read_text(encoding="utf-8")
    lines = content.splitlines()
    added = 0
    updated = 0

    for site_name, site in SITES.items():
        base = site["base"]
        for category in site["categories"]:
            group = CAT_GROUP.get(category, "Diger")
            print(f"\n[{site_name}] {category}...")

            channels = get_channel_links(base, category)
            print(f"  {len(channels)} kanal bulundu")

            for ch_name, slug in channels:
                streams = get_stream(base, slug)
                if not streams:
                    continue

                stream_url = streams[0]

                # Playlist'te bu stream zaten var mı?
                if stream_url in content:
                    continue

                # Mevcut tvg-id eşleşmesi ara (isim benzerliği)
                slug_clean = re.sub(r'[-_]', '', slug).lower()
                matching_tvg = None
                for i, line in enumerate(lines):
                    if line.startswith("#EXTINF:"):
                        name_m = re.search(r',([^,]+)$', line)
                        if name_m:
                            existing_name = re.sub(r'[^a-z0-9]', '', name_m.group(1).lower())
                            if existing_name == slug_clean or existing_name == re.sub(r'[^a-z0-9]', '', ch_name.lower()):
                                matching_tvg = i
                                break

                if matching_tvg is not None:
                    # Variant olarak ekle
                    orig_line = lines[matching_tvg]
                    new_extinf = re.sub(r',([^,]+)$', f',{ch_name} (v-{site_name[:4]})', orig_line)
                    lines.insert(matching_tvg + 2, stream_url)
                    lines.insert(matching_tvg + 2, new_extinf)
                    updated += 1
                    print(f"  v+ {ch_name}")
                else:
                    # Yeni kanal
                    tvg_id = f"{site_name[:4]}.{slug_clean}"
                    lines.append(f'#EXTINF:-1 tvg-id="{tvg_id}" group-title="{group}",{ch_name}')
                    lines.append(stream_url)
                    added += 1
                    print(f"  +  {ch_name}")

                content = "\n".join(lines)  # Güncelle

    PLAYLIST.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nTamamlandi: {added} yeni, {updated} variant")


if __name__ == "__main__":
    main()
