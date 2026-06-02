"""
YouTube canli yayin URL'lerini yenile.
yt-dlp ile her saat taze HLS URL alir ve playlist.m3u'ya yazar.

Eklemek icin channels.yaml'a YOUTUBE_CHANNELS'a ekle:
  tvg_id: youtube_video_id
"""
from __future__ import annotations
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAYLIST = ROOT / "playlist.m3u"

# tvg-id → YouTube video ID (canli yayin)
YOUTUBE_CHANNELS = {
    "tr.ekoturk": "5ovykCkBWfU",
    "tr.cnbce": "aZ3ycSbSYBA",
    "tr.seksenler": "qGYlF1MiMxw",
    "tr.leylaileMecnun": "3nlND4audLg",
}


def get_youtube_stream(video_id: str) -> str | None:
    """yt-dlp ile YouTube canli yayin HLS URL'ini al."""
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--get-url",
                "-f", "b",
                "--no-warnings",
                f"https://www.youtube.com/watch?v={video_id}",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        url = result.stdout.strip().split("\n")[0]
        if url and "googlevideo.com" in url:
            return url
    except Exception as e:
        print(f"  [youtube] {video_id} hata: {e}")
    return None


def main():
    print("YouTube stream URL'leri yenileniyor...")

    content = PLAYLIST.read_text(encoding="utf-8")
    lines = content.splitlines()
    updated = 0

    for tvg_id, video_id in YOUTUBE_CHANNELS.items():
        stream_url = get_youtube_stream(video_id)
        if not stream_url:
            print(f"  {tvg_id}: URL alinamadi")
            continue

        prev = updated
        for i, line in enumerate(lines):
            if f'tvg-id="{tvg_id}"' in line and i + 1 < len(lines):
                lines[i + 1] = stream_url
                updated += 1

        if updated > prev:
            print(f"  {tvg_id}: {stream_url[:70]}...")

    PLAYLIST.write_text("\n".join(lines), encoding="utf-8")
    print(f"Guncellendi: {updated} kanal")


if __name__ == "__main__":
    main()
