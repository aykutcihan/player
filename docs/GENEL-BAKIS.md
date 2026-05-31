# EPG Generator — Genel Bakış

## Bu proje ne yapıyor?

Bu proje, Türk TV kanallarının yayın akışı bilgilerini (EPG) otomatik olarak toplayıp
**XMLTV** formatında bir `epg.xml` dosyası üretir.

Samsung TV, Smart IPTV gibi uygulamalar bu XML dosyasını okuyarak kanallarda
"şu an ne oynuyor / sıradaki program ne" bilgisini gösterir.

---

## Nasıl çalışıyor? (Büyük Resim)

```
Türk TV Siteleri          GitHub Repo              Samsung TV
──────────────            ───────────              ──────────
TV+ (tvplus.com.tr)  ──►  epg.xml (public)  ──►   Smart IPTV
Tivibu               ──►  (ham URL)          ──►   EPG gösterir
DigiTürk Burada      ──►
tvyayinakisi         ──►
         ▲
         │ (Python scripti çalışır)
         │
  Ev Makinesi (GitHub Actions Runner)
  Her saat başı otomatik tetiklenir
```

**Akış:**
1. GitHub Actions her saat başı bir iş tetikler
2. İş, ev makinesindeki **self-hosted runner** üzerinde çalışır
3. Runner, Python scriptini çalıştırır
4. Script, Türk TV sitelerinden yayın akışı verisi çeker
5. Veriyi XMLTV formatına dönüştürür (`epg.xml`)
6. `epg.xml` GitHub reposuna commit'lenir
7. Samsung TV, bu dosyayı `url-tvg` üzerinden okur

---

## Neden ev makinesi?

Türk TV siteleri (TV+, tvyayinakisi vb.) GitHub'ın sunucu IP'lerini **bot** olarak
algılayıp blokluyor. Ev makinesi Türk IP'ine sahip olduğu için bloklanmıyor.

---

## Dosya yapısı

```
epg-generator/
├── src/
│   ├── main.py              # Ana orkestratör — her şeyi bir araya getirir
│   ├── models.py            # Veri modelleri (Programme, Channel)
│   ├── normalize.py         # Zaman normalizasyonu, bitiş türetme
│   ├── merge.py             # Çoklu kaynak birleştirme motoru
│   ├── xmltv.py             # XMLTV XML yazıcısı
│   ├── placeholder.py       # Verisi olmayan kanallar için "boş" blok üreticisi
│   ├── enrich_tmdb.py       # Film açıklamalarını TMDb API ile zenginleştirme
│   └── adapters/
│       ├── base.py          # Tüm adaptörlerin base sınıfı
│       ├── tvplus.py        # TV+ adaptörü (birincil kaynak)
│       ├── tivibu.py        # Tivibu adaptörü (Playwright ile)
│       ├── tvyayinakisi.py  # tvyayinakisi.com adaptörü
│       └── digiturkburada.py# DigiTürk Burada adaptörü (beIN yedek)
├── config/
│   ├── channels.yaml        # Kanal listesi ve kaynak tanımları
│   └── settings.yaml        # Genel ayarlar (timezone, pencere, TMDB)
├── docs/                    # Bu belgeler
├── .github/workflows/
│   └── epg.yml              # GitHub Actions workflow
├── requirements.txt         # Python bağımlılıkları
└── epg.xml                  # Üretilen çıktı (otomatik güncellenir)
```

---

## Üretilen çıktı

`epg.xml` — XMLTV formatında, şöyle görünür:

```xml
<tv generator-info-name="kisisel-epg">
  <channel id="tr.startv">
    <display-name>Star TV</display-name>
  </channel>
  <programme start="20260531203000 +0300" stop="20260531220000 +0300" channel="tr.startv">
    <title lang="tr">Aramızda Kalsın</title>
    <desc lang="tr">Antepli iki çocuk annesi Yadigar'ı...</desc>
    <category lang="tr">Dizi</category>
  </programme>
  ...
</tv>
```

---

## M3U ile bağlantı

M3U dosyanın başında şu satır olmalı:

```
#EXTM3U url-tvg="https://raw.githubusercontent.com/KULLANICI/epg-generator/master/epg.xml"
```

Her kanalın `tvg-id` değeri `channels.yaml`'daki anahtar ile **birebir** eşleşmeli:

```
#EXTINF:-1 tvg-id="tr.startv" tvg-name="Star TV" ...,Star TV
```

→ channels.yaml'da `tr.startv:` anahtarı olmalı.
