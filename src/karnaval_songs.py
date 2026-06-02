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
    # mount -> karnaval.ID mapping (sabit, degismez)
    mount_to_tvgid = {s["mount"]: f"karnaval.{s['id']}" for s in stations if s.get("mount")}

    # Su an calani - istasyon bazli cek
    result = {}
    for station in stations:
        mount = station.get("mount")
        if not mount:
            continue
        tvg_id = f"karnaval.{station['id']}"
        try:
            r2 = requests.get(
                f"https://newapi.karnaval.com/station/{station['id']}/now-playing",
                headers=HEADERS, timeout=5
            )
            if r2.status_code == 200:
                song = r2.json().get("data", {})
                if song.get("title"):
                    result[tvg_id] = {
                        "title":    song.get("title", ""),
                        "artist":   song.get("artist", ""),
                        "cover":    song.get("album_cover_art", ""),
                        "progress": song.get("progress", 0),
                        "duration": song.get("duration_sec", 0),
                    }
                    continue
        except Exception:
            pass

        # Fallback: bulk API
        pass

    # Bulk API ile kalanları doldur
    if len(result) < len(stations) // 2:
        r_bulk = requests.put(SONG_API, headers=HEADERS, timeout=10, json={
            "command": "get_current_song",
            "station_id": "all",
            "lastVersion": 0,
            "custom_k_parameter": "karnaval_web_v6",
        })
        bulk = r_bulk.json()
        if bulk.get("result"):
            # mount adina gore eslesme - en guvenilir yontem
            # station list sirasiyla bulk data'yi eslestirelim
            station_list = stations
            for i, (key, song) in enumerate(bulk["data"].items()):
                if i >= len(station_list):
                    break
                s = station_list[i]
                tvg_id = f"karnaval.{s['id']}"
                if tvg_id not in result and song.get("title"):
                    result[tvg_id] = {
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
