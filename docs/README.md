# Belgeler

Bu klasörde projenin tüm belgeleri yer alır.

| Dosya | İçerik |
|-------|--------|
| [GENEL-BAKIS.md](GENEL-BAKIS.md) | Proje ne yapıyor? Büyük resim, dosya yapısı |
| [KURULUM.md](KURULUM.md) | Yeni repoya/bilgisayara taşıma rehberi |
| [ADAPTORLER.md](ADAPTORLER.md) | TV+, Tivibu, digiturkburada adaptörleri |
| [KANALLAR.md](KANALLAR.md) | Yeni kanal ekleme, channels.yaml formatı |
| [MIMARI.md](MIMARI.md) | Kod yapısı, merge motoru, XMLTV çıktısı |
| [SORUN-GIDERME.md](SORUN-GIDERME.md) | Sık karşılaşılan sorunlar ve çözümleri |

---

## Hızlı özet

**Bu proje:** Türk TV kanallarının yayın akışını otomatik çekip Samsung TV için EPG üretir.

**Nasıl çalışır:**
1. GitHub Actions her saat başı tetiklenir
2. Ev makinesindeki runner çalışır (Türk IP için)
3. TV+, Tivibu, DigiTürk Burada'dan veri çekilir
4. `epg.xml` GitHub'a push'lanır
5. Samsung TV bu dosyayı okur

**Kritik gereksinim:** Runner çalışıyor olmalı (`C:\actions-runner\run.cmd`)
