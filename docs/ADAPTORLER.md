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

**Kaynak:** `https://www.tivibu.com.tr/canli-tv/` + kategori sayfaları

**Avantajlar:**
- **113 kanal** — Tivibu Spor 1-4 dahil tüm kategoriler
- Bazı kanallar için tek kaynak (Tivibu Spor, Sinema 1001, vb.)

**Nasıl çalışır:**
- Site JavaScript gerektirdiği için **Playwright** (headless Chromium) kullanır
- `--disable-blink-features=AutomationControlled` ile bot tespitini atlatır
- **11 kategori sayfasını** sırayla yükler, tüm kanalları önbelleğe alır:
  `/canli-tv/`, `/canli-tv/spor`, `/canli-tv/muzik`, `/canli-tv/ulusal`,
  `/canli-tv/haber`, `/canli-tv/dizi`, `/canli-tv/belgesel`, `/canli-tv/cocuk`,
  `/canli-tv/yasam-stil`, `/canli-tv/global`, `/canli-tv/sinema`
- `fetch()` çağrıları bu önbellekten okur

**Kısıtlamalar:**
- İlk kez Chromium indirilirken ~130MB indirme yapılır (sonra önbellekte kalır)
- Sadece **bugünkü** program verisi (TV+ gibi 10 günlük değil)

**Source ID formatı:** `tivibu:{chID}` → örn. `tivibu:ch00000000000000001170`

**Desteklenen kategoriler:**
| Kategori | Örnek kanallar |
|----------|----------------|
| Spor | Tivibu Spor 1-4, Eurosport 1-2, S Sport |
| Müzik | Türk Halk Müziği, Türkçe Pop, Türkçe Slow |
| Ulusal | ATV, Star TV, Kanal D, Show TV, TRT 1 |
| Haber | CNN Türk, NTV, A Haber, Haberturk |
| Dizi | BBC First, FX, Epic Drama |
| Belgesel | Discovery, National Geographic, Tarih TV |
| Çocuk | Disney Junior, Minika Go, Cartoon Network |
| Sinema | Sinema TV, Sinema 1001, Sinema Aksiyon, vb. |
| Global | NHK World, DW, France 24, Saudi Quran |

**Durum:** ✅ Çalışıyor (113 kanal)

---

## 3. tvyayinakisi (tvyayinakisi)

**Kaynak:** `https://www.tvyayinakisi.com/tvde-bugun-rehberi/`

**Avantajlar:**
- **Tek HTTP isteği** → **50 kanal**
- Başlangıç **ve** bitiş saati var (eski versiyonda sadece başlangıç vardı)
- Temiz CSS class-based yapı (fragile regex yok)

**Nasıl çalışır:**
- `/tvde-bugun-rehberi/` sayfasını **tek seferde** çeker
- `div.channels-today__program[data-channel-slug]` → her kanal bloğu
- `data-channel-slug="star-tv-yayin-akisi"` → slug = `star-tv`
- `.channels-today__program__title` → program başlığı
- `.channels-today__program__time` → `"HH:MM - HH:MM"` formatı
- Tüm kanallar önbelleğe alınır, `fetch()` önbellekten okur

**Source ID formatı:** `tvyayinakisi:{slug}` → örn. `tvyayinakisi:star-tv`

Slug = kanal URL'indeki parça:
`https://www.tvyayinakisi.com/`**`star-tv`**`-yayin-akisi/`

**Kısıtlamalar:**
- Sadece **bugünkü** program (yarın ve sonrası yok)
- 50 kanal → channels.yaml'daki tüm kanalları kapsamıyor

**Durum:** ✅ Çalışıyor (50 kanal, tek istek)

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
