# Mimari ve Kod Yapısı

## main.py — Ana Akış

```python
# 1. Ayarları yükle
settings = load_yaml("config/settings.yaml")
channels = load_yaml("config/channels.yaml")

# 2. Her kanal için
for tvg_id, channel_config in channels.items():
    per_source = []
    
    # 3. Her source'u dene
    for source in channel_config.sources:
        adapter = registry[prefix]
        progs = adapter.fetch(source_id, tvg_id)  # HTTP isteği
        if progs:
            per_source.append(progs)
    
    # 4. Kaynakları birleştir
    if per_source:
        merged = merge_sources(per_source)
    else:
        merged = placeholder_programmes(tvg_id)  # Boş bloklar
    
    all_progs.extend(merged)

# 5. XML yaz
write_xmltv(channels, all_progs)
```

---

## merge.py — Kaynak Birleştirme

İki aşamalı birleştirme:

**Aşama 1: Boşluk Doldurma**
```
TV+ programları:  [08:00-10:00] [10:00-12:00]        [14:00-16:00]
Tivibu programları:                         [12:00-14:30]
Sonuç:            [08:00-10:00] [10:00-12:00] [12:00-14:00] [14:00-16:00]
                                              ↑ Kırpıldı (14:00'da biter)
```

**Aşama 2: Alan Zenginleştirme**
```
TV+ prog: title="Film X" desc=None   category=None
Tivibu:   title="Film X" desc="..." category="Film"
Sonuç:    title="Film X" desc="..." category="Film"
          ↑ Birincil kazanır, boş alanlar doldurulur
```

---

## normalize.py — Zaman Yönetimi

```python
IST = tz.gettz("Europe/Istanbul")  # +0300, DST yok

def ist(naive_dt):
    """Naive datetime'i Istanbul timezone'a çevirir."""
    return naive_dt.replace(tzinfo=IST)

def derive_stops(programmes):
    """Bitiş saati olmayan programlara stop ekler:
    programme[i].stop = programme[i+1].start
    Son programme.stop = start + 2 saat
    """
```

---

## xmltv.py — XMLTV Çıktısı

Deterministic (kararlı) çıktı üretir — aynı giriş, her zaman aynı XML.
Bu sayede `git diff` gerçek değişiklikleri gösterir, commit gereksiz yapılmaz.

```xml
<tv generator-info-name="kisisel-epg">
  <channel id="tr.startv">
    <display-name>Star TV</display-name>
  </channel>
  <programme start="20260531090000 +0300" stop="20260531110000 +0300" channel="tr.startv">
    <title lang="tr">Aramızda Kalsın</title>
    <desc lang="tr">...</desc>
    <category lang="tr">Dizi</category>
    <date>2025</date>
    <credits><actor>Ali Vefa</actor></credits>
  </programme>
</tv>
```

---

## enrich_tmdb.py — Film Zenginleştirme

TMDB API'den film bilgisi çeker (isteğe bağlı):
- Film kategorisindeki programlar için açıklama ekler/geliştirir
- Oyuncu bilgisi ekler
- Yapım yılı ekler
- `cache/tmdb.json` dosyasına kaydeder (tekrar API çağrısını önler)

TMDB_API_KEY ortam değişkeni yoksa sessizce atlanır.

---

## placeholder.py — Boş Program Üretici

Herhangi bir kaynaktan veri gelmezse:

```python
TEXT = "Yayın akışı bilgisi mevcut değil"

# 7 gün, 2 saatlik bloklar
blocks = (24 // 2) * 7  # = 84 blok
```

Samsung TV, boş program yerine bu metni gösterir.

---

## Bağımlılıklar

| Paket | Kullanım |
|-------|----------|
| `requests` | HTTP istekleri (TV+, tvyayinakisi, digiturkburada) |
| `beautifulsoup4` | HTML parse |
| `lxml` | BS4 için hızlı HTML parser |
| `PyYAML` | channels.yaml ve settings.yaml okuma |
| `python-dateutil` | Tarih/saat parse (TV+ ISO string'leri için) |
| `playwright` | JavaScript gerektiren siteler (Tivibu) |

---

## settings.yaml açıklaması

```yaml
timezone: "Europe/Istanbul"    # Sabit +0300, yaz saati yok
tz_offset: "+0300"             # XMLTV'de kullanılan offset

window_days: 7                 # Placeholder kaç günlük üretilsin

min_gap_minutes: 2             # Bu kadardan küçük boşlukları doldurma
overlap_tolerance_minutes: 5   # Alan zenginleştirmede eşleşme toleransı

tmdb:
  enabled: true
  api_key_env: "TMDB_API_KEY"  # Secret adı
  language: "tr-TR"
  cache_path: "cache/tmdb.json"
  film_categories: ["Film", "Sinema", "Movie"]
  min_desc_len: 40             # Bundan kısa açıklama "zayıf" sayılır
  skip_desc_sources: ["tvplus"] # TV+'ın açıklaması zaten yeterli
  max_actors: 3

output_path: "epg.xml"
generator_name: "kisisel-epg"
```

---

## GitHub Actions Workflow (.github/workflows/epg.yml)

```yaml
on:
  schedule:
    - cron: "0 * * * *"   # Her saat başı (UTC)
  workflow_dispatch: {}     # Elle tetikleme

jobs:
  build:
    runs-on: self-hosted    # Ev makinesi runner'ı
    env:
      PYTHONUTF8: "1"       # Windows Türkçe karakter sorunu için
    defaults:
      run:
        shell: cmd          # Windows cmd.exe

    steps:
      - uses: actions/checkout@v4
      - pip install -r requirements.txt
      - playwright install chromium  # Tivibu için
      - mkdir cache          # İlk kurulumda cache klasörü
      - python src/main.py   # Ana script
      - git commit + push    # Değiştiyse
```
