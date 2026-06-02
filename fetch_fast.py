"""
Hizli stream fetcher - tek browser, tum kanallar
Ilerleme kaydeder, kesilirse kaldigi yerden devam eder.
"""
import sys, io, re, json, warnings
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from pathlib import Path

warnings.filterwarnings('ignore')
ROOT = Path(__file__).resolve().parent
PLAYLIST = ROOT / "playlist.m3u"
PROGRESS = ROOT / "fetch_progress.json"

SITES = [
    ('https://tr.tvkulesi.com', 'tvku'),
    ('https://amp.kavuntv.net', 'kavu'),
]
CATS = ['ulusal','haber','spor','cocuk','dini','yerel']
CAT_GROUP = {'ulusal':'Ulusal','haber':'Haber','spor':'Spor',
             'cocuk':'Cocuk','dini':'Dini','yerel':'Yerel'}

def load_progress():
    if PROGRESS.exists():
        return set(json.loads(PROGRESS.read_text(encoding='utf-8')))
    return set()

def save_progress(done):
    PROGRESS.write_text(json.dumps(sorted(done), ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    import sys as _sys
    update_mode = '--update' in _sys.argv  # Aylik mod: mevcut URL'leri de guncelle

    done = load_progress()
    if done:
        print(f'Onceki ilerleme bulundu: {len(done)} kategori tamamlandi, devam ediliyor...')
        for d in sorted(done):
            print(f'  atlandi: {d}')

    if update_mode:
        print('MOD: Guncelleme (mevcut URL\'ler de yenilenecek)')

    lines = PLAYLIST.read_text(encoding='utf-8').splitlines()
    added = 0
    updated = 0
    total_tested = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox','--disable-blink-features=AutomationControlled'])

        for base, site_key in SITES:
            ctx = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36')
            ctx.add_init_script('Object.defineProperty(navigator,"webdriver",{get:()=>undefined})')
            page = ctx.new_page()

            for cat in CATS:
                key = f'{site_key}:{cat}'
                if key in done:
                    print(f'\n[{site_key}] {cat}... (atlandi)')
                    continue

                group = CAT_GROUP[cat]
                print(f'\n[{site_key}] {cat}...', flush=True)

                try:
                    page.goto(f'{base}/kategori/{cat}', wait_until='domcontentloaded', timeout=15000)
                    page.wait_for_timeout(1500)
                    soup = BeautifulSoup(page.content(), 'lxml')
                except Exception as e:
                    print(f'  Liste hatasi: {e}')
                    continue

                slugs = []
                for a in soup.select('a[href]'):
                    href = a.get('href','')
                    name = a.get_text(strip=True)
                    if href and name and len(name)<40 and base in href:
                        if not any(x in href for x in ['kategori','iletisim','hakkimizda','#']):
                            slug = href.rstrip('/').split('/')[-1]
                            if slug and not any(s[1]==slug for s in slugs):
                                slugs.append((name, slug))

                print(f'  {len(slugs)} kanal, stream aliniyor...', flush=True)

                playlist_text = '\n'.join(lines)
                for ch_name, slug in slugs:
                    total_tested += 1
                    streams = []

                    def on_req(r, s=streams):
                        if '.m3u8' in r.url.lower() and 'chunk' not in r.url.lower():
                            s.append(r.url)

                    try:
                        page.on('request', on_req)
                        page.goto(f'{base}/{slug}', wait_until='domcontentloaded', timeout=12000)
                        page.wait_for_timeout(2500)
                        page.remove_listener('request', on_req)
                    except Exception:
                        try:
                            page.remove_listener('request', on_req)
                        except Exception:
                            pass

                    unique = list(dict.fromkeys(streams))
                    if not unique:
                        continue

                    stream_url = unique[0]

                    if stream_url in playlist_text and not update_mode:
                        continue

                    name_clean = re.sub(r'[^a-z0-9]', '', ch_name.lower())
                    slug_clean = re.sub(r'[-_]', '', slug).lower()
                    match_i = None
                    for i, line in enumerate(lines):
                        if not line.startswith('#EXTINF:'):
                            continue
                        line_name_m = re.search(r',([^,]+)$', line)
                        if line_name_m:
                            line_clean = re.sub(r'[^a-z0-9]', '', line_name_m.group(1).lower())
                            if line_clean in (name_clean, slug_clean) or name_clean in line_clean:
                                match_i = i
                                break

                    if match_i is not None:
                        if update_mode:
                            # Guncelleme modunda: mevcut URL'i degistir
                            old_url = lines[match_i + 1] if match_i + 1 < len(lines) else ''
                            if old_url != stream_url:
                                lines[match_i + 1] = stream_url
                                updated += 1
                                print(f'  ~  {ch_name}', flush=True)
                        else:
                            # Normal mod: variant olarak ekle
                            new_ext = re.sub(r',([^,]+)$', f',{ch_name} ({site_key})', lines[match_i])
                            lines.insert(match_i + 2, stream_url)
                            lines.insert(match_i + 2, new_ext)
                            updated += 1
                            print(f'  v+ {ch_name}', flush=True)
                    else:
                        tvg_id = f'{site_key}.{slug_clean}'
                        lines.append(f'#EXTINF:-1 tvg-id="{tvg_id}" group-title="{group}",{ch_name}')
                        lines.append(stream_url)
                        added += 1
                        print(f'  +  {ch_name}', flush=True)

                    playlist_text = '\n'.join(lines)

                # Kategori bitti - kaydet ve playlist'e yaz
                done.add(key)
                save_progress(done)
                PLAYLIST.write_text('\n'.join(lines), encoding='utf-8')
                print(f'  [{key}] tamamlandi, kaydedildi.', flush=True)

            ctx.close()
        browser.close()

    PLAYLIST.write_text('\n'.join(lines), encoding='utf-8')
    print(f'\nTamamlandi! Test: {total_tested} | Yeni: {added} | Variant: {updated}')

    # Tum kategoriler bitti, progress dosyasini temizle
    if PROGRESS.exists():
        PROGRESS.unlink()
        print('Progress dosyasi silindi.')

if __name__ == '__main__':
    main()
