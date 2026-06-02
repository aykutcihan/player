# EPG Generator — Genel Bakış

## Bu proje ne yapıyor?

Bu proje şunları üretir:

1. **`epg.xml`** — Türk TV kanallarının yayın akışı (EPG), XMLTV formatında
2. **`playlist.m3u`** — 500+ Türk TV kanalının stream URL'lerini içeren M3U playlist
3. **`radios.xml`** — TRT ve Karnaval radyolarının EPG'si
4. **`films.m3u`** — Destanfilm'den otomatik çekilen güncel film listesi
5. **`karnaval-songs.json`** — Karnaval radyolarında şu an çalan şarkı bilgisi
6. **React IPTV Uygulaması** — Canlı TV, Radyo, Filmler, Müzik bölümlü web uygulaması

Samsung TV, Smart IPTV, TiviMate gibi uygulamalar bu dosyaları okuyarak hem kanal listesini hem de "şu an ne oynuyor" bilgisini gösterir.

---

## Çıktı URL'leri

```
# Canlı TV Playlist (IPTV uygulamasına eklenecek)
https://raw.githubusercontent.com/aykutcihan/epg-data/master/playlist.m3u

# Film Playlist
https://raw.githubusercontent.com/aykutcihan/epg-data/master/films.m3u

# EPG (Yayın Rehberi)
https://raw.githubusercontent.com/aykutcihan/epg-data/master/epg.xml

# Radyo EPG
https://raw.githubusercontent.com/aykutcihan/epg-data/master/radios.xml

# Web Uygulaması
https://aykutcihan.github.io/epg-data/
```

---

## İki Repo Mimarisi

Kaynak kod **private**, çıktılar **public** repo'da:

```
epg-generator (private)          epg-data (public)
────────────────────             ─────────────────
Python scriptler        ──►      master branch:
React app kaynak kodu   ──►        epg.xml
config dosyaları        ──►        playlist.m3u
                                   films.m3u
                                   radios.xml
                                   karnaval-songs.json
                                   epg/ (JSON EPG dosyaları)

                                 gh-pages branch:
                                   React app (build)
                                   → GitHub Pages'ten serve edilir
```

**Branch ayrımı nedeni:** Veri dosyaları sık güncellenir (5 dakikada bir).
`gh-pages` ayrı tutulunca veri push'ları GitHub Pages'i yeniden build ettirmez → site 404 vermez.

---

## Büyük Resim

```
EPG Kaynakları              epg-data (public repo)        TV / Tarayıcı
────────────────            ──────────────────────        ─────────────
TV+ (birincil, 10 gün) ──► epg.xml          ──────────► EPG gösterir
Türksat Kablo (7 gün)  ──► playlist.m3u     ──────────► Kanal listesi
Tivibu                 ──► films.m3u        ──────────► Film listesi
tvyayinakisi           ──► radios.xml       ──────────► Radyo EPG
Karnaval API           ──► karnaval-songs   ──────────► Şarkı bilgisi
TRT Dinle              ──►
Destanfilm             ──►

epg-generator (private)
  ↓ GitHub Actions (self-hosted runner, Türk IP)
  ↓ Otomatik tetiklenir
```

---

## Neden ev makinesi (self-hosted runner)?

Türk TV siteleri (TV+, tvyayinakisi vb.) GitHub'ın sunucu IP'lerini **bot** olarak
algılayıp blokluyor. Ev makinesi Türk IP'ine sahip olduğu için bloklanmıyor.

---

## Workflow Yapısı

| Workflow | Sıklık | Ne yapar |
|----------|--------|----------|
| `epg.yml` | Her saat | EPG üret + Ciner token + YouTube URL yenile |
| `epg-streams.yml` | 06:00 & 18:00 | tvkulesi stream (107 kanal) + filmler yenile |
| `radio-epg.yml` | Her 5 dakika | Radyo EPG + Karnaval şarkı bilgisi |
| `epg-rescan.yml` | Ayın 1'i 03:00 | Tüm kanalları baştan tara, URL güncelle |
| `deploy-app.yml` | App değişince | React app build → gh-pages branch'e push |

---

## EPG Kaynakları

| Adaptör | Kanal | Kapsam | Açıklama |
|---------|-------|--------|----------|
| **TV+** | ~150 | ~10 gün | Birincil kaynak, en zengin |
| **Türksat Kablo** | ~179 | 7 gün | İkincil kaynak, boşlukları doldurur |
| **Tivibu** | 113 | Bugün | Playwright ile, Tivibu Spor dahil |
| **tvyayinakisi** | 50 | Bugün | beIN Sports, BBC First dahil |
| **TRT Dinle** | 14 | Bugün | TRT radyo programları |

---

## Stream Kaynakları (playlist.m3u)

| Kaynak | Kanal | Token süresi | Yenileme |
|--------|-------|--------------|----------|
| TRT, artidijital, ercdn vs. | ~273 | Kalıcı URL | Aylık kontrol |
| tvkulesi.com | 106 | 24 saat | Günde 2 kez |
| Ciner (ATV, A Haber, A Spor, A Para) | 4 | Birkaç saat | Saatlik |
| YouTube (Ekoturk, CNBC-e, Seksenler vs.) | 25+ | Kısa | Saatlik |
| Karnaval radyo (streamtheworld) | 35 | Kalıcı | Aylık kontrol |
| TRT radyo | 14 | Kalıcı | Aylık kontrol |

---

## React Uygulaması (app/)

```
app/
├── src/
│   ├── lib/
│   │   ├── config.ts      # URL sabitleri (epg-data raw URL'leri)
│   │   ├── m3u.ts         # M3U parser (# source: yorum desteği)
│   │   ├── epg.ts         # Kanal bazlı JSON EPG fetcher (lazy load)
│   │   └── nowplaying.ts  # Karnaval şarkı bilgisi (epg-data'dan)
│   ├── store/
│   │   └── useStore.ts    # Zustand global state
│   ├── components/
│   │   ├── tv/            # ChannelList, Player, EpgPanel
│   │   ├── radio/         # RadioList, RadioPlayer (şarkı bilgisi)
│   │   └── VideoPlayer.tsx # HLS.js player
│   └── pages/
│       ├── LiveTV.tsx
│       ├── Radio.tsx
│       ├── Films.tsx
│       └── Music.tsx
└── vite.config.ts         # base: '/epg-data/'
```

**Hedef platformlar:** Web (öncelikli), Tizen TV, Android WebView, iOS WebView

---

## Dosya Yapısı (epg-generator repo)

```
epg-generator/
├── src/
│   ├── main.py               # EPG ana orkestratör → epg.xml + epg/ JSON
│   ├── json_epg.py           # Kanal bazlı EPG JSON üretici
│   ├── refresh_tokens.py     # Ciner token yenileme
│   ├── refresh_youtube.py    # YouTube stream yenileme (25+ kanal)
│   ├── refresh_tvku.py       # tvkulesi 106 kanal stream yenileme
│   ├── refresh_films.py      # Destanfilm film scraper
│   ├── refresh_trt_radio.py  # TRT radyo URL yenileme
│   ├── refresh_karnaval.py   # Karnaval radyo URL yenileme (aylık)
│   ├── refresh_radio_epg.py  # Radyo EPG üretici (TRT + Karnaval)
│   ├── karnaval_songs.py     # Karnaval şarkı bilgisi (5 dakikada bir)
│   └── adapters/             # EPG kaynak adaptörleri
├── app/                      # React IPTV uygulaması
├── config/
│   ├── channels.yaml         # TV kanal tanımları
│   ├── radios.yaml           # Radyo kanal tanımları
│   └── settings.yaml         # Genel ayarlar
├── channel_slugs.json        # tvkulesi slug eşleşmeleri
├── fetch_fast.py             # Aylık toplu kanal tarama
└── .github/workflows/        # 5 ayrı workflow
```
