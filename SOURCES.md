# Kaynak Notları (keşif özeti)

Adaptörleri PC'de bitirirken referans. Tümü robots'a açık (mceu.tv / Türksat / Star TV hariç).

## TV+ (tvplus.com.tr) — birincil
- Kanal listesi: `/canli-tv` (~155 kanal, beIN YOK).
- Yayın akışı: `/canli-tv/yayin-akisi/{slug}`  → slug örn `star-tv-hd--89`, `trt1-hd--144`, `s-sport--11`.
- Veri/program: başlık + başlangıç+bitiş + tür + **tam paragraf açıklama**, ~10 gün.
- Next.js → veri büyük olasılıkla `__NEXT_DATA__` JSON'unda. Adaptör recursively program-benzeri
  dict arıyor; alan adlarını (startTime/title/description...) canlı şemaya göre doğrula.

## Tivibu (tivibu.com.tr) — yedek
- Kanal listesi JS ile lazy-render; kategori sayfaları: `/canli-tv/{ulusal|haber|spor|sinema|cocuk|muzik|belgesel|yasam-stil|dizi|global|diger}`.
- Kanal id: `ch00000000000000001170` (20 hane). Akış uç noktası: `/rv?i=2|ch{id}&datatype=2`.
- Satır: `Ad  Kategori - 20:00 → 21:30 Canlı` (BİTİŞ VAR). Açıklama listede yok (detayda olabilir).
- Tarih sekmeleri ~2 hafta (24.05→07.06). Çoklu-gün için parametre gerekebilir.
- Toplanan id'ler: TRT1 1266 · KanalD 1166 · Star 1170 · ATV 1017 · Show 1230 · NOW 1162 · TV8 1351
  · S Sport 1227 · Eurosport1 1131 · Eurosport2 1141 · W-Sport 2594
  · Tivibu Spor 1355 / Spor1 1356 / Spor2 1270 / Spor3 1357 / Spor4 1971
  · Sinema TV 1258 · Tarih TV 2187 · Türkçe Pop 1354 · Türkçe Slow 1269 · Türk Halk Müziği 1353
- Tivibu'ya ÖZEL (diğer ikisinde yok): Tivibu Spor (5), Tivibu Tanıtım 1358, Benim Kanalım 1481,
  Türkçe Pop/Slow/Halk Müziği, ID (Investigation Discovery), RT Arabic 1226, Saudi Quran 1168.

## tvyayinakisi (tvyayinakisi.com) — beIN + uzun kuyruk + 3. yedek
- Kanal listesi: `/tv-kanallari/` (~217 kanal, **beIN ailesi tam**).
- Akış: `/{slug}-yayin-akisi/` → slug örn `star-tv`, `trt-1`, `bein-sports-1..4`, `s-sport`.
- Satır: başlangıç + ad + tür. **BİTİŞ YOK, AÇIKLAMA YOK.** Statik HTML'de yalnız BUGÜN dolu.
- 'Az Sonra...' filler satırları var → eleniyor. Maç adları `simplify()` ile sadeleşir.
- beIN ailesi yalnız burada (+ digiturk).

## digiturkburada (digiturkburada.com.tr) — beIN yedeği
- beIN sayfası: `/{slug}-yayin-akisi-{id}.html` → örn `bein-sports-1-hd-yayin-akisi-60`.
- Tablo: ad + başlangıç (BİTİŞ/AÇIKLAMA YOK). 3 gün ayrı linklerde (yapı netleşince çoklu-gün ekle).

## Genel kurallar
- Timezone Europe/Istanbul, sabit +0300 (DST yok). XMLTV: `20260531203000 +0300`.
- Bitişi olmayan kaynakta stop = sonraki başlangıç (`normalize.derive_stops`).
- Çıktı DETERMİNİSTİK olmalı (stabil sıra, oynak zaman damgası yok) → cron'da "değiştiyse commit".
- Maç adı sadeleştirme: `Hafta (.+?) Maçı` → title=takımlar, desc=ham.
