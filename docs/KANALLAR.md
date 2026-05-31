# Kanal Yönetimi

## channels.yaml formatı

```yaml
channels:

  tr.startv:                    # tvg-id — M3U'daki tvg-id ile BİREBİR aynı olmalı
    name: "Star TV"             # Görünen ad (serbest)
    sources:
      - tvplus:star-tv-hd--89      # 1. öncelik (birincil)
      - tivibu:ch00000000000000001170  # 2. öncelik (yedek)
      - tvyayinakisi:star-tv           # 3. öncelik (yedek)
```

**Kurallar:**
- `tvg-id` M3U dosyandaki ile **tam olarak** eşleşmeli (büyük/küçük harf dahil)
- `sources` listesindeki sıra öncelik sırasıdır
- En az bir source olmalı, yoksa "Yayın akışı bilgisi mevcut değil" yazar

---

## Yeni kanal ekleme

### Adım 1: Source ID'lerini bul

**TV+ için:**
1. `https://tvplus.com.tr/canli-tv/yayin-akisi/` adresine git
2. Kanalı bul, URL'deki slug'ı kopyala
3. Örn: `.../yayin-akisi/trt1-hd--144` → `tvplus:trt1-hd--144`

**Tivibu için:**
1. `https://www.tivibu.com.tr/canli-tv/` sayfasında kanalı bul
2. Kanal linkindeki ch ID'yi al: `/rv?i=2|ch00000000000000001170` → `tivibu:ch00000000000000001170`

**tvyayinakisi için:**
1. `https://www.tvyayinakisi.com/{slug}-yayin-akisi/` URL'ini test et
2. Sayfa açılıyorsa slug geçerli → `tvyayinakisi:{slug}`

**DigiTürk Burada için:**
1. `https://www.digiturkburada.com.tr/` sitesinde kanalı bul
2. URL: `.../bein-sports-1-hd-yayin-akisi-60.html` → `digiturkburada:bein-sports-1-hd-yayin-akisi-60`

### Adım 2: channels.yaml'a ekle

```yaml
  tr.yenikanal:
    name: "Yeni Kanal"
    sources:
      - tvplus:yeni-kanal-hd--999
```

### Adım 3: M3U'ya ekle

```
#EXTINF:-1 tvg-id="tr.yenikanal" tvg-name="Yeni Kanal" group-title="EPG Test",Yeni Kanal
https://stream.url/stream.m3u8
```

`tvg-id="tr.yenikanal"` = channels.yaml'daki `tr.yenikanal:` anahtarı

---

## Mevcut kanal source'ları nasıl bulunur?

### TV+ slug bulma

TV+ sitesinde kanalı aç:
`https://tvplus.com.tr/canli-tv/yayin-akisi/kanal-adi-hd--123`

Son parça slug: `kanal-adi-hd--123`

### Tivibu ch ID bulma

Tivibu sitesinde kanalı aç, URL'deki linke bak:
`https://www.tivibu.com.tr/rv?i=2|ch00000000000000001170&datatype=2`

`ch00000000000000001170` = ch ID

Veya `canli-tv` sayfasında Geliştirici Araçları (F12) → Network → programBox linklerini incele.

---

## Kaynak eksik olduğunda ne olur?

Bir kanal için hiçbir source veri döndürmezse:
- `placeholder.py` devreye girer
- 2 saatlik bloklar halinde "Yayın akışı bilgisi mevcut değil" yazar
- Samsung TV'de program bilgisi yerine bu mesaj görünür

---

## tvg-id uyuşmazlığı sorunu

**Sorun:** M3U'da `tvg-id="tr24tv.tr"` ama channels.yaml'da `tr24tv.tr:` yok.
**Sonuç:** O kanal için EPG bilgisi gelmez.

**Çözüm:** İkisini eşleştir. Ya:
- channels.yaml'da anahtarı `tr24tv.tr:` yap, VEYA
- M3U'da `tvg-id="tr.24"` yap (channels.yaml'da `tr.24:` varsa)

---

## Büyük kanal listeleri

150+ kanal var. Gruplamak için channels.yaml'a yorum eklenebilir:

```yaml
channels:

  # ── HABERLER ──────────────────────────────
  tr.cnnturk:
    name: "CNN Türk"
    sources:
      - tvplus:cnn-turk-hd--158

  # ── SPOR ──────────────────────────────────
  tr.beinsports1:
    name: "beIN Sports 1"
    sources:
      - tvyayinakisi:bein-sports-1
```

Kod değişmez, sadece okunabilirlik artar.
