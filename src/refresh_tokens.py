"""
Token tabanlı stream URL'lerini yenile.
Playlist.m3u'daki işaretli kanallar için taze token alır.

Çalıştır: python src/refresh_tokens.py
"""
from __future__ import annotations
import re
import sys
import urllib.parse
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PLAYLIST = ROOT / "playlist.m3u"

# tvg-id → (channel_id, base_url)  — token API parametreleri
TOKEN_CHANNELS = {
    "tr.atv":     (851502, "https://trkvz-live.ercdn.net/atv/atv.m3u8"),
    "tr.ahaber":  (851501, "https://trkvz-live.ercdn.net/ahaber/ahaber.m3u8"),
    "tr.aspor":   (851504, "https://trkvz-live.ercdn.net/aspor/aspor.m3u8"),
    "tr.apara":   (705995, "https://trkvz-live.ercdn.net/aparahd/aparahd.m3u8"),
    "tr.a2":      (851503, "https://trkvz-live.ercdn.net/a2/a2.m3u8"),
}

TOKEN_API = "https://securevideotoken.tmgrup.com.tr/webtv/secure"


def get_token_url(ch_id: int, base_url: str) -> str | None:
    encoded = urllib.parse.quote(base_url, safe="")
    url = f"{TOKEN_API}?{ch_id}&url={encoded}"
    try:
        r = requests.get(url, timeout=10,
                         headers={"User-Agent": "Mozilla/5.0",
                                  "Referer": "https://www.atv.com.tr/"})
        data = r.json()
        return data.get("Url") or None
    except Exception as e:
        print(f"  [token] hata: {e}")
        return None


def main():
    content = PLAYLIST.read_text(encoding="utf-8")
    lines = content.splitlines()
    updated = 0

    for i, line in enumerate(lines):
        if not line.startswith("#EXTINF:"):
            continue
        m = re.search(r'tvg-id="([^"]+)"', line)
        if not m:
            continue
        tvg_id = m.group(1)
        if tvg_id not in TOKEN_CHANNELS:
            continue

        ch_id, base_url = TOKEN_CHANNELS[tvg_id]
        token_url = get_token_url(ch_id, base_url)
        if token_url and i + 1 < len(lines):
            lines[i + 1] = token_url
            updated += 1
            print(f"  [token] {tvg_id}: {token_url[:70]}...")

    PLAYLIST.write_text("\n".join(lines), encoding="utf-8")
    print(f"Token yenilendi: {updated} kanal")


if __name__ == "__main__":
    main()
