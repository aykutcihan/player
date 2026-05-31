# Adaptörler

Her adaptör bir Türk TV sitesinden yayın akışı verisi çeker.
`channels.yaml`'da kanal başına hangi adaptörün kullanılacağı belirtilir.

---

## Adaptör sistemi nasıl çalışır?

```
channels.yaml → main.py → adapter.fetch(source_id, channel_id) → [Programme]
```

Her kanal için `sources` listesindeki kaynaklar **sırayla** denenir.
İlk başarılı kaynak "birincil" olur; sonrakiler boşlukları doldurur.

---

## 1. TV+ (tvplus)

**Kaynak:** `https://tvplus.com.tr/canli-tv/yayin-akisi/{slug}`

**Avantajlar:**
- En zengin veri: başlık + bitiş saati + tür + açıklama + ~10 günlük program
- ~150 kanalı destekler

**Nasıl çalışır:**
- HTML sayfasını `requests` ile çeker
- `<li class="epg-card">` elementlerini parse eder
- Saat: `<p class="epg-card__time">` (format: `"09:00 - 11:30"`)
- Başlık: `<h3 class="epg-card__title">`
- Tür: `<p class="epg-card__genres">`
- Açıklama: `<p class="epg-card__description-desktop">`

**Source ID formatı:** `tvplus:{slug}` → örn. `tvplus:star-tv-hd--89`

Slug, TV+ URL'inden alınır:
`https://tvplus.com.tr/canli-tv/yayin-akisi/`**`star-tv-hd--89`**

**Durum:** ✅ Çalışıyor

---

## 2. Tivibu (tivibu)

**Kaynak:** `https://www.tivibu.com.tr/canli-tv/`

**Avantajlar:**
- Sinema kanalları için iyi kaynak (ücretsiz erişilenler)
- Bazı kanallar için tek kaynak (Sinema 1001, Sinema Aksiyon, vb.)

**Nasıl çalışır:**
- Site JavaScript gerektirdiği için **Playwright** (headless Chromium) kullanır
- `--disable-blink-features=AutomationControlled` ile bot tespitini atlatır
- Tek sayfa yüklemesinde **tüm görünür kanalları** önbelleğe alır
- `fetch()` çağrıları önbellekten okur (performans için)

**Kısıtlamalar:**
- Sadece **14 kanal** (ücretsiz erişilebilen sinema kanalları)
- Tivibu Spor, müzik kanalları → üyelik gerekiyor, erişilemiyor
- İlk kez Chromium indirilirken ~130MB indirme yapılır

**Source ID formatı:** `tivibu:{chID}` → örn. `tivibu:ch00000000000000001170`

**Desteklenen kanallar (ücretsiz):**
- Sinema TV, Sinema TV 2, Sinema 1001, Sinema 1002
- Sinema Aile, Sinema Aile 2, Sinema Aksiyon, Sinema Aksiyon 2
- Sinema Komedi, Sinema Komedi 2, Sinema Yerli, Sinema Yerli 2
- Tarih TV, Tivibu Tanıtım

**Durum:** ✅ Çalışıyor (14 kanal)

---

## 3. tvyayinakisi (tvyayinakisi)

**Kaynak:** `https://www.tvyayinakisi.com/{slug}-yayin-akisi/`

**Avantajlar:**
- Çok sayıda kanal
- Sadece bugünkü program

**Nasıl çalışır:**
- HTML'deki `<li>` elementlerini parse eder
- Saat: `<strong>HH</strong>:MM` formatı (`get_text("")` ile birleştirir)
- Kategori: `<a>Dizi</a>` şeklinde link içinde

**Source ID formatı:** `tvyayinakisi:{slug}` → örn. `tvyayinakisi:star-tv`

**Durum:** ⚠️ Geçici sorunlar (site zaman zaman timeout)

---

## 4. DigiTürk Burada (digiturkburada)

**Kaynak:** `https://www.digiturkburada.com.tr/{slug}.html`

**Avantajlar:**
- beIN Sports kanalları için iyi yedek kaynak
- Maç isimlerini otomatik sadeleştirir

**Nasıl çalışır:**
- HTML tablosunu parse eder: `<tr><td>Maç Adı</td><td>20:30</td></tr>`
- Spor maçları için "simplify" fonksiyonu ile gereksiz text temizlenir

**Source ID formatı:** `digiturkburada:{slug-id}` → örn. `digiturkburada:bein-sports-1-hd-yayin-akisi-60`

**Durum:** ✅ Çalışıyor (beIN kanalları)

---

## Yeni adaptör nasıl eklenir?

1. `src/adapters/yeni_site.py` oluştur:

```python
from adapters.base import BaseAdapter
from models import Programme

class YeniSiteAdapter(BaseAdapter):
    prefix = "yenisite"
    base_url = "https://www.yenisite.com"

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        url = f"{self.base_url}/{source_id}"
        html = self._get(url).text
        return self._parse(html, channel_id)

    def _parse(self, html: str, channel_id: str) -> List[Programme]:
        # ... parse kodu
        return []
```

2. `src/adapters/__init__.py`'ye ekle:

```python
from adapters.yeni_site import YeniSiteAdapter
...
def build_registry(session=None):
    insts = [
        ...
        YeniSiteAdapter(session),
    ]
```

3. `channels.yaml`'da kullan:

```yaml
tr.kanal:
  name: "Kanal"
  sources:
    - yenisite:kanal-slug
```

---

## Adaptör öncelik sırası

```yaml
sources:
  - tvplus:star-tv-hd--89      # 1. öncelik: en zengin veri
  - tivibu:ch00000000000001170  # 2. öncelik: boşlukları doldurur
  - tvyayinakisi:star-tv        # 3. öncelik: sadece bugün
```

`merge.py` bu kaynakları birleştirir:
- Birincil kaynak her zaman kazanır
- Boşlukları sonraki kaynaklar doldurur (zamanla kırpılarak)
- Alan zenginleştirme: açıklama/tür boşsa sonraki kaynaktan alınır
