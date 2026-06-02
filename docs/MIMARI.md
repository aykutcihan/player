# Mimari ve Kod Yapısı

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Actions Runner                   │
│                    (Ev Makinesi)                        │
│                                                         │
│  epg.yml (saatlik)                                      │
│    ├── refresh_tokens.py   → Ciner CDN token yenile     │
│    ├── refresh_youtube.py  → YouTube HLS URL yenile     │
│    └── main.py             → epg.xml üret               │
│                                                         │
│  epg-streams.yml (06:00 & 18:00)                        │
│    ├── refresh_tvku.py     → 107 kanal tvkulesi URL     │
│    └── refresh_films.py    → Destanfilm film scraper    │
│                                                         │
│  epg-rescan.yml (ayın 1'i)                              │
│    └── fetch_fast.py --update → Tüm kanalları güncelle  │
└─────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
      epg.xml                  playlist.m3u
      films.m3u            (GitHub'a commit)
```

---

## main.py — EPG Ana Akışı

```python
# 1. Ayarları yükle
settings = load_yaml("config/settings.yaml")
channels = load_yaml("config/channels.yaml")

# 2. Her kanal için
for tvg_id, channel_config in channels.items():
    per_source = []

    # 3. Her EPG kaynağını dene
    for source in channel_config.sources:
        adapter = registry[prefix]
        progs = adapter.fetch(source_id, tvg_id)
        if progs:
            per_source.append(progs)

    # 4. Kaynakları birleştir
    if per_source:
        merged = merge_sources(per_source)
    else:
        merged = placeholder_programmes(tvg_id)

    all_progs.extend(merged)

# 5. XMLTV yaz
write_xmltv(channels, all_progs)
```

---

## merge.py — EPG Kaynak Birleştirme

İki aşamalı birleştirme:

**Aşama 1: Boşluk Doldurma**
```
TV+ programları:     [08:00-10:00] [10:00-12:00]        [14:00-16:00]
Türksat programları:                          [12:00-14:30]
Sonuç:               [08:00-10:00] [10:00-12:00] [12:00-14:00] [14:00-16:00]
                                               ↑ Kırpıldı (14:00'da biter)
```

**Aşama 2: Alan Zenginleştirme**
```
TV+ prog:  title="Film X" desc=None    category=None
Tivibu:    title="Film X" desc="..."   category="Film"
Sonuç:     title="Film X" desc="..."   category="Film"
                           ↑ Boş alanlar ikincil kaynaktan doldurulur
```

---

## refresh_tvku.py — tvkulesi Stream Yenileme

```python
# channel_slugs.json'dan 107 kanal okur
# Her kanal için:
#   1. tvkulesi.com/SLUG sayfasını aç
#   2. m3u8 URL'ini yakala (Playwright network intercept)
#   3. playlist.m3u'daki URL'i güncelle
```

`channel_slugs.json` — tvkulesi slug eşleşmeleri:
```json
{
  "TRT 1": "trt1",
  "Show TV": "showtv",
  "A Haber": "a-haber",
  ...
}
```

---

## refresh_films.py — Film Scraper

```python
# 1. destanfilm.com/film/en-son-cikan-filmler/ tara
# 2. Her film için:
#    a. Film sayfasından embed URL'i çek (vidmoly veya YouTube)
#    b. vidmoly → Playwright ile m3u8 yakala
#    c. YouTube → yt-dlp ile HLS URL al
# 3. cache/films_db.json'a kaydet
# 4. films.m3u yaz
```

---

## fetch_fast.py — Aylık Toplu Tarama

tvkulesi.com ve kavuntv.net'teki tüm kategorileri tarar:
- `ulusal, haber, spor, cocuk, dini, yerel`
- `--update` parametresiyle mevcut URL'leri de günceller
- İlerlemeyi `fetch_progress.json`'a kaydeder (kesilirse devam eder)

---

## normalize.py — Zaman Yönetimi

```python
IST = tz.gettz("Europe/Istanbul")  # +0300, DST yok

def derive_stops(programmes):
    """Bitiş saati olmayan programlara stop ekler:
    programme[i].stop = programme[i+1].start
    Son programme.stop = start + 2 saat
    """
```

---

## Bağımlılıklar

| Paket | Kullanım |
|-------|----------|
| `requests` | HTTP istekleri |
| `beautifulsoup4` | HTML parse |
| `lxml` | BS4 için hızlı parser |
| `PyYAML` | channels.yaml okuma |
| `python-dateutil` | Tarih/saat parse |
| `playwright` | JS gerektiren siteler (Tivibu, tvkulesi) |
| `yt-dlp` | YouTube HLS stream URL alma |
