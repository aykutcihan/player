# Kurulum Rehberi

Yeni bir GitHub reposuna veya farklı bir bilgisayara taşınırken adım adım yapılması gerekenler.

---

## 1. Repo hazırlığı

### Yeni GitHub reposu oluştur

1. GitHub'da yeni bir repo aç (örn. `epg-generator`)
2. **Public** yap — Samsung TV dosyayı okuyabilsin diye şart
3. Kodu push'la:

```bash
git clone https://github.com/SEN/epg-generator.git
cd epg-generator
# dosyaları kopyala, sonra:
git add .
git commit -m "ilk commit"
git push origin master
```

### Repo public kontrolü

`https://raw.githubusercontent.com/KULLANICI/REPO/master/epg.xml`
adresini tarayıcıda aç. Dosya görünüyorsa public demek.

---

## 2. Python ortamı (ev makinesi)

```bash
pip install -r requirements.txt
playwright install chromium
```

**Minimum gereksinimler:**
- Python 3.10+
- pip

---

## 3. GitHub Actions Self-Hosted Runner kurulumu

> Runner, GitHub'ın iş tetiklemesini ev makinesine yönlendirir.
> Türk TV siteleri Türk IP'inden engellenmiyor.

### 3a. Runner indir

GitHub'da: **Settings → Actions → Runners → New self-hosted runner**
Windows seç, indirme komutlarını kopyala.

```powershell
mkdir C:\actions-runner
cd C:\actions-runner
# GitHub'ın verdiği indirme komutunu çalıştır
```

### 3b. Runner yapılandır

```powershell
# GitHub'ın verdiği config komutunu çalıştır:
.\config.cmd --url https://github.com/KULLANICI/epg-generator --token VERILEN_TOKEN
```

Token tek kullanımlık, 1 saat geçerli. GitHub sayfasından al.

### 3c. Runner başlat

```powershell
cd C:\actions-runner
.\run.cmd
```

Bu pencere açık kaldığı sürece runner çalışır.

### 3d. Bilgisayar açılışında otomatik başlat (isteğe bağlı)

Başlat menüsünde başlangıç klasörü aç:
`shell:startup`

Oraya kısayol oluştur:
- Hedef: `cmd.exe`
- Argümanlar: `/c "C:\actions-runner\run.cmd"`
- Çalışma dizini: `C:\actions-runner`

### Runner durumu kontrol

GitHub → repo → Settings → Actions → Runners
- 🟢 **Idle** → Hazır, iş bekliyor
- 🟡 **Active** → Şu an iş yapıyor
- ⚫ **Offline** → Pencere kapanmış, runner çalışmıyor

---

## 4. Workflow ayarları

`.github/workflows/epg.yml` dosyası otomatik çalışır. Değiştirmen gereken bir şey yok.

**Workflow ne yapar:**
1. Repoyu indirir (checkout)
2. Python bağımlılıklarını yükler
3. Playwright Chromium'u yükler (ilk seferinde ~130MB indirir)
4. `python src/main.py` çalıştırır
5. `epg.xml` değiştiyse commit + push yapar

**Tetikleme:** Her saat başı otomatik + elle (Actions → Run workflow)

---

## 5. İlk test

GitHub → Actions → EPG update → **Run workflow**

5-10 dakika bekle, sonra:
- Actions sayfasında ✅ yeşil görünmeli
- Repo'da `epg.xml` dosyası oluşmalı
- `https://raw.githubusercontent.com/KULLANICI/epg-generator/master/epg.xml` erişilebilir olmalı

---

## 6. TMDB API (isteğe bağlı)

Film açıklamalarını zenginleştirmek için TMDB API anahtarı gerekir.

1. `https://www.themoviedb.org/settings/api` adresinden ücretsiz anahtar al
2. GitHub → repo → Settings → Secrets → New repository secret
3. İsim: `TMDB_API_KEY`, Değer: anahtarın

Yoksa da çalışır, sadece film açıklamaları TV+'tan gelen haliyle kalır.

---

## 7. Samsung TV'de kurulum

Smart IPTV uygulamasında:

1. M3U URL'ini veya dosyasını yükle
2. M3U'nun başında şu satır olmalı:
   ```
   #EXTM3U url-tvg="https://raw.githubusercontent.com/KULLANICI/epg-generator/master/epg.xml"
   ```
3. Smart IPTV uygulamasını yeniden başlat
4. Kanalları yenile

---

## Taşıma kontrol listesi

- [ ] Yeni repo oluşturuldu ve **public** yapıldı
- [ ] Kod push'landı
- [ ] `requirements.txt` kuruldu (`pip install -r requirements.txt`)
- [ ] `playwright install chromium` çalıştırıldı
- [ ] Runner indirildi ve yapılandırıldı (yeni token gerekli!)
- [ ] Runner başlatıldı (`run.cmd`)
- [ ] GitHub Actions'da test workflow çalıştırıldı
- [ ] `epg.xml` oluştu ve erişilebilir
- [ ] M3U'daki `url-tvg` adresi güncellendi
- [ ] Samsung TV'de test edildi
