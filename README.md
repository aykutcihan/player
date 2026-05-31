# Kişisel EPG Üreteci (XMLTV)

Türk kanalları için kişisel yayın akışı (EPG) üretir, tek bir `epg.xml` (XMLTV) çıkarır,
GitHub Actions ile otomatik günceller. Oynatıcın bu dosyayı bir URL'den çekip `tvg-id` ile eşleştirir.

> Kişisel kullanım içindir. Kaynaklar robots/ToS'a uygun olanlardan seçilmiştir.

## Kaynak önceliği
1. **TV+** — birincil; en zengin (açıklama + bitiş + ~10 gün)
2. **Tivibu** — yedek + en geniş tarih (~2 hafta) + Tivibu Spor (özel)
3. **tvyayinakisi** — beIN ailesi + uzun kuyruk + 3. yedek
4. **digiturkburada** — beIN yedeği
- **TMDb API** — film açıklaması zayıfsa Türkçe özet

## Kurulum
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export TMDB_API_KEY="...."          # film zenginleştirme için (opsiyonel)
python src/main.py                  # epg.xml üretir
```

## Yapılandırma
- `config/channels.yaml` → kanalların + her biri için **öncelik sıralı** kaynaklar.
  `tvg-id` M3U'ndaki ile **birebir** aynı olmalı.
- `config/settings.yaml` → timezone, pencere, TMDb, çıktı yolu.

## Otomasyon (GitHub Actions)
- `.github/workflows/epg.yml` saat başı çalışır, **yalnız `epg.xml` değiştiyse commit'ler**.
- Repo Settings → Secrets → `TMDB_API_KEY` ekle.
- **Private repo öner**ilir (Actions yine ücretsiz). Oynatıcı için ham dosya URL'sini kullan.

## Yapılacaklar (PC'de canlı HTML'e göre)
Adaptörlerdeki `>>> CANLI HTML'E GÖRE AYAR GEREKEBİLİR <<<` notlarına bak:
- **TV+**: `__NEXT_DATA__` JSON şemasını doğrula (alan adları).
- **Tivibu**: `/rv` çıktısı HTML/JSON mu, çoklu-gün parametresi.
- **tvyayinakisi / digiturk**: satır CSS selector'ları.

Detaylı kaynak notları: `SOURCES.md`.

## Yapı
```
config/        channels.yaml, settings.yaml
src/
  adapters/    tvplus, tivibu, tvyayinakisi, digiturkburada
  models.py normalize.py merge.py enrich_tmdb.py placeholder.py xmltv.py main.py
.github/workflows/epg.yml
```
