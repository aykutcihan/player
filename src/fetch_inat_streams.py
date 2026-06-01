"""
İnat TV stream URL'lerini saatlik çeker ve playlist.m3u'ya yazar.
Çalıştır: python src/fetch_inat_streams.py
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAYLIST = ROOT / "playlist.m3u"

GATEWAY = "https://inattvgiris.one/"

# tvg-id → inat channel id
INAT_CHANNELS = {
    "tr.beinsports1":    "zirve",
    "tr.beinsports2":    "b2",
    "tr.beinsports3":    "b3",
    "tr.beinsports4":    "b4",
    "tr.beinsports5":    "b5",
    "tr.beinsportsmax1": "bm1",
    "tr.beinsportsmax2": "bm2",
    "tr.ssport":         "ss",
    "tr.ssport2":        "ss2",
    "tr.tivibuspor":     "t1",
    "tr.tivibuspor2":    "t2",
    "tr.tivibuspor3":    "t3",
    "tr.tivibuspor4":    "t4",
    "tr.smartspor":      "smarts",
    "tr.smartspor2":     "sms2",
    "tr.trtspor":        "trtspor",
    "tr.trtsporyildiz":  "trtspor2",
    "tr.trt1":           "trt1",
    "tr.tv8":            "tv8",
    "tr.tv85":           "tv85",
    "tr.nbatv":          "nbatv",
    "tr.eurosport1":     "eu1",
    "tr.eurosport2":     "eu2",
}


def get_current_domain() -> str | None:
    """inattvgiris.one'dan güncel domain'i al."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
            )
            ctx.add_init_script(
                'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
            )
            page = ctx.new_page()
            page.goto(GATEWAY, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)
            content = page.content()
            browser.close()

        # Güncel domain linkini bul
        m = re.search(r'href=["\']+(https://inattvv?\d+\.[a-z]+/)', content)
        if m:
            return m.group(1).rstrip("/")
        # Alternatif pattern
        m = re.search(r'href=["\'](https://[a-z0-9]+\.[a-z]+/)["\']', content)
        if m and "inattv" in m.group(1):
            return m.group(1).rstrip("/")
    except Exception as e:
        print(f"  [inat] domain bulunamadi: {e}")
    return None


def get_stream_url(base_domain: str, channel_id: str) -> str | None:
    """Kanal sayfasından m3u8 URL'yi yakala."""
    try:
        from playwright.sync_api import sync_playwright
        found = []
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
            )
            ctx.add_init_script(
                'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
            )
            page = ctx.new_page()
            page.on(
                "request",
                lambda r: found.append(r.url)
                if ".m3u8" in r.url.lower() and "chunk" not in r.url.lower()
                else None,
            )
            url = f"{base_domain}/channel.html?id={channel_id}"
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(5000)
            browser.close()

        return found[0] if found else None
    except Exception as e:
        print(f"  [inat] {channel_id} hata: {e}")
        return None


def main():
    print("İnat TV stream URL'leri çekiliyor...")

    domain = get_current_domain()
    if not domain:
        print("  Domain bulunamadı, atlanıyor.")
        return

    print(f"  Domain: {domain}")

    content = PLAYLIST.read_text(encoding="utf-8")
    lines = content.splitlines()
    updated = 0
    prev_updated = 0

    for tvg_id, ch_id in INAT_CHANNELS.items():
        stream_url = get_stream_url(domain, ch_id)
        if not stream_url:
            print(f"  {tvg_id}: stream bulunamadı")
            continue

        # Playlist'te TÜM eşleşmeleri güncelle
        prev_updated = updated
        for i, line in enumerate(lines):
            if f'tvg-id="{tvg_id}"' in line and i + 1 < len(lines):
                lines[i + 1] = stream_url
                updated += 1
        if updated > prev_updated:
            print(f"  {tvg_id}: {stream_url[:70]}")

    PLAYLIST.write_text("\n".join(lines), encoding="utf-8")
    print(f"Güncellendi: {updated} kanal")


if __name__ == "__main__":
    main()
