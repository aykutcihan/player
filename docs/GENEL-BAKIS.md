# EPG Generator — Genel Bakış

## Bu proje ne yapıyor?

Bu proje iki şey üretir:

1. **`epg.xml`** — Türk TV kanallarının yayın akışı (EPG), XMLTV formatında
2. **`playlist.m3u`** — 463 Türk TV kanalının stream URL'lerini içeren M3U playlist
3. **`films.m3u`** — Destanfilm'den otomatik çekilen güncel film listesi

Samsung TV, Smart IPTV, TiviMate gibi uygulamalar bu dosyaları okuyarak hem kanal listesini hem de "şu an ne oynuyor" bilgisini gösterir.

---

## Çıktı URL'leri (TV'ye eklenecek)

```
# Canlı TV Playlist
https://raw.githubusercontent.com/aykutcihan/epg-generator/master/playlist.m3u

# Film Playlist
https://raw.githubusercontent.com/aykutcihan/epg-generator/master/films.m3u

# EPG (Yayın Rehberi)
https://raw.githubusercontent.com/aykutcihan/epg-generator/master/epg.xml
```

---

## Büyük Resim

```
EPG Kaynakları              GitHub Repo                   Samsung TV / TiviMate
────────────────            ───────────                   ─────────────────────
TV+ (birincil, 10 gün) ──► epg.xml          ──────────► EPG gösterir
Türksat Kablo (7 gün)  ──► playlist.m3u     ──────────► Kanal listesi
Tivibu                 ──► films.m3u        ──────────► Film listesi
tvyayinakisi           ──►
                            ▲
                            │ (Python scriptleri)
                            │
                   Ev Makinesi (GitHub Actions self-hosted runner)
                   Otomatik tetiklenir (saatlik / günlük / aylık)
```

---

## Neden ev makinesi?

Türk TV siteleri (TV+, tvyayinakisi vb.) GitHub'ın sunucu IP'lerini **bot** olarak algılayıp blokluyor. Ev makinesi Türk IP'ine sahip olduğu için bloklanmıyor.

---

## Workflow Yapısı (3 ayrı zamanlama)

| Workflow | Sıklık | Ne yapar |
|----------|--------|----------|
| `epg.yml` | Her saat | EPG üret + Ciner token + YouTube URL yenile |
| `epg-streams.yml` | 06:00 & 18:00 | tvkulesi stream + film URL yenile |
| `epg-rescan.yml` | Ayın 1'i 03:00 | Tüm kanalları baştan tara, URL güncelle |

---

## EPG Kaynakları

| Adaptör | Kanal | Kapsam | Açıklama |
|---------|-------|--------|----------|
| **TV+** | ~150 | ~10 gün | Birincil kaynak, en zengin |
| **Türksat Kablo** | ~179 | 7 gün | İkincil kaynak, boşlukları doldurur |
| **Tivibu** | 113 | Bugün | Playwright ile, Tivibu Spor dahil |
| **tvyayinakisi** | 50 | Bugün | beIN Sports, BBC First dahil |

---

## Stream Kaynakları (playlist.m3u)

| Kaynak | Kanal sayısı | Token süresi | Yenileme |
|--------|-------------|--------------|----------|
| TRT, artidijital, ercdn vs. | ~273 | Kalıcı URL | Aylık kontrol |
| tvkulesi.com | 107 | 24 saat | Günde 2 kez |
| Ciner (ATV, A Haber, A Spor, A Para) | 4 | Birkaç saat | Saatlik |
| YouTube (Ekoturk) | 1 | Kısa | Saatlik |

---

## Dosya Yapısı

```
epg-generator/
├── src/
│   ├── main.py               # EPG ana orkestratör
│   ├── refresh_tokens.py     # Ciner token yenileme (ATV, A Haber...)
│   ├── refresh_youtube.py    # YouTube stream yenileme (Ekoturk)
│   ├── refresh_tvku.py       # tvkulesi stream yenileme (107 kanal)
│   ├── refresh_films.py      # Destanfilm film scraper
│   ├── merge.py              # Çoklu EPG kaynağı birleştirme
│   ├── models.py             # Veri modelleri
│   ├── normalize.py          # Zaman normalizasyonu
│   ├── xmltv.py              # XMLTV XML yazıcısı
│   ├── enrich_tmdb.py        # TMDB film zenginleştirme
│   └── adapters/             # EPG kaynak adaptörleri
├── .github/workflows/
│   ├── epg.yml               # Saatlik workflow
│   ├── epg-streams.yml       # Günlük stream yenileme
│   └── epg-rescan.yml        # Aylık tam tarama
├── config/
│   ├── channels.yaml         # Kanal listesi ve EPG kaynak tanımları
│   └── settings.yaml         # Genel ayarlar
├── cache/
│   ├── tmdb.json             # TMDB önbelleği
│   └── films_db.json         # Film veritabanı
├── fetch_fast.py             # Toplu kanal tarama (aylık rescan)
├── channel_slugs.json        # tvkulesi slug → kanal eşleşmesi (107 kanal)
├── playlist.m3u              # Canlı TV playlist (463 kanal)
├── films.m3u                 # Film playlist (otomatik güncellenir)
└── epg.xml                   # EPG çıktısı (otomatik güncellenir)
```
