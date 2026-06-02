"""
Karnaval'dan su an calani ceker, karnaval-songs.json yazar.
radio-epg workflow'undan cagirilir (5 dakikada bir).
"""
import sys, io, json, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pathlib import Path

ROOT   = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "karnaval-songs.json"

STATION_API = "https://newapi.karnaval.com/station?activeOn=web"
SONG_API    = "https://karnaval.com/functions/v6/api.functions.php"
HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer":         "https://karnaval.com/",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type":    "application/json; charset=UTF-8",
}


def main():
    # Istasyon sirasi
    r = requests.get(STATION_API, headers=HEADERS, timeout=10)
    stations = r.json()["data"]["stations"]
    id_map = {i + 1: s["id"] for i, s in enumerate(stations)}

    # Su an calani
    r2 = requests.put(SONG_API, headers=HEADERS, timeout=10, json={
        "command": "get_current_song",
        "station_id": "all",
        "lastVersion": 0,
        "custom_k_parameter": "karnaval_web_v6",
    })
    data = r2.json()
    if not data.get("result"):
        print("Veri alinamadi")
        return

    result = {}
    for key, song in data["data"].items():
        try:
            idx = int(key.replace("station_", ""))
        except ValueError:
            continue
        station_id = id_map.get(idx)
        if station_id:
            result[f"karnaval.{station_id}"] = {
                "title":    song.get("title", ""),
                "artist":   song.get("artist", ""),
                "cover":    song.get("album_cover_art", ""),
                "progress": song.get("progress", 0),
                "duration": song.get("duration_sec", 0),
            }

    OUTPUT.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(f"karnaval-songs.json yazildi: {len(result)} istasyon")


if __name__ == "__main__":
    main()
