# Sorun Giderme

---

## Samsung TV'de EPG gelmiyor

### 1. Repo public mi?
`https://raw.githubusercontent.com/KULLANICI/epg-generator/master/epg.xml`
adresini tarayıcıda aç. 404 dönüyorsa repo private.

**Çözüm:** GitHub → Settings → Danger Zone → Change visibility → Public

### 2. epg.xml oluştu mu?
GitHub reposunda `epg.xml` dosyası var mı kontrol et.
Yoksa Actions workflow hiç başarılı olmamış demek.

**Çözüm:** Actions → Run workflow (runner çalışıyorsa)

### 3. tvg-id uyuşuyor mu?
M3U'daki `tvg-id` ile channels.yaml anahtarı birebir aynı olmalı.

```
M3U:    tvg-id="tr.startv"
YAML:   tr.startv:
```

Büyük/küçük harf, nokta, tire farkı EPG'yi bozar.

### 4. Smart IPTV önbelleği
Smart IPTV eski EPG'yi önbellekte tutuyor olabilir.
TV'yi yeniden başlat veya Smart IPTV'de "Update" yap.

---

## Runner Offline görünüyor

Runner penceresi (`run.cmd`) kapanmış demek.

**Çözüm:**
```
cd C:\actions-runner
run.cmd
```

Pencereyi minimize et, kapatma.

---

## Workflow "pwsh: command not found" hatası

PowerShell Core (pwsh) yok. Workflow'da `shell: cmd` kullanılmalı.

Mevcut workflow bunu zaten hallediyor. Hata devam ederse `.github/workflows/epg.yml`'de şunu kontrol et:
```yaml
defaults:
  run:
    shell: cmd
```

---

## Workflow "UnicodeEncodeError" hatası

Windows'ta Türkçe karakter sorunu.

**Çözüm:** `.github/workflows/epg.yml`'de job altında şu env olmalı:
```yaml
jobs:
  build:
    env:
      PYTHONUTF8: "1"
```

---

## Tüm kanallar "Yayın akışı bilgisi mevcut değil" yazıyor

Tüm adaptörler 0 program dönüyor demek. Olası sebepler:

1. **Runner offline:** Runner penceresi kapalı → `run.cmd` başlat
2. **GitHub Actions sunucu IP'i kullanılıyor:** `runs-on: self-hosted` workflow'da olmalı, `ubuntu-latest` değil
3. **Site değişikliği:** Türk TV siteleri HTML yapısını değiştirmiş olabilir → adaptörü güncelle

GitHub Actions loglarına bak (Actions → son run → "EPG üret" adımını aç):
- ` <- ` olan satırlar başarılı fetch
- `[boş]` = fetch başarılı ama 0 program (site yapısı değişmiş)
- `[hata]` = HTTP hatası (site erişilemiyor veya 404)
- sadece `kaynak yok -> placeholder` = hiç kaynak çalışmıyor

---

## TV+ verisi gelmiyor

TV+ en önemli kaynak. Çalışmıyorsa büyük sorun.

**Sebep:** TV+ HTML yapısı değişmiş (`.epg-card__time`, `.epg-card__title` class'ları)

**Kontrol:**
```python
# Tarayıcıda tvplus.com.tr/canli-tv/yayin-akisi/star-tv-hd--89
# açıp F12 → Elements → li.epg-card içeriğini kontrol et
```

**Adapter:** `src/adapters/tvplus.py` → `_from_html()` metodunu güncelle

---

## Tivibu çalışmıyor

**Playwright kurulu mu?**
```bash
pip install playwright
playwright install chromium
```

**Hata türü:**
- `playwright kurulu degil, atlaniyor` → pip install yap
- Başka hata → Chromium indirilememiş, `playwright install chromium` tekrar çalıştır

---

## "epg.xml değişmedi, commit atlanıyor" her seferinde

Normal davranış. Veriler değişmemişse commit yapılmaz.

Sorun değil — bir önceki run'daki `epg.xml` hâlâ günceldir.

---

## GitHub Actions "non-fast-forward" push hatası

Runner çalışırken başka bir commit gelmiş (otomatik EPG commit), çakışma.

Workflow bunu zaten hallediyor:
```cmd
git pull --rebase origin master
git push
```

Bu satırlar workflow'da olduğu sürece sorun çıkmaz.

---

## Adaptör sitesi zaman aşımına uğruyor (timeout)

```
ReadTimeoutError: ... Read timed out.
```

Site geçici olarak erişilemiyor veya bu IP'i engelliyor.

**Kısa vadeli:** Birkaç saat bekle, tekrar dene.
**Uzun vadeli:** Site kalıcı olarak engelliyorsa channels.yaml'da o kaynağı kaldır.

---

## Hangi workflow loglarına bakılır?

GitHub → repo → Actions → En son "EPG update" → "EPG üret" adımı

Önemli log satırları:
```
tr.startv <- tvplus:star-tv-hd--89: 12 program   ✅ İyi
tr.atv <- tvplus:atv-hd--124: 0 program           ⚠️ Boş
[hata] tr.trt <- tvyayinakisi:trt-4k: 404        ❌ Hata
tr.trt: kaynak yok -> placeholder                  ⚪ Placeholder
```
