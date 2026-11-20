# SongWriter Pro

Tarayıcıda çalışan şarkı yazma ve kayıt uygulaması. React, TypeScript, Vite ve Web Audio API kullanır.

- **Groovebox:** gitar/piyano riff'i, seçilebilir solo enstrümanı, klavye ve dokunma ile çalma, nota döngüsü kaydı ve ×1–×4 aranje geçişleri.
- **Hazır fikirler:** 12 özgün tarz şablonu ve eşlik varyasyonları; seçili kısmı değiştirir veya giriş/söz/nakarat/köprü düzeni kurar. Başka bir düzenleme yapmadan önce son preset değişikliği geri alınabilir. Şablonlar güncel hit listesi ya da şarkı transkripsiyonları değildir.
- **Donanım yüzeyi:** 8×8 ışıklı performans padi, sekiz ses/efekt düğmesi, canlı aranje ekranı, sahne başlatma, tap tempo ve pad vuruş gücü. Melodik padler seçili gama göre dizilir; serbest modda 12 ses kullanılır. Bilgisayar klavyesi ve dokunmatik giriş desteklenir.
- **Adım düzenleyici:** ADIMLAR düğmesiyle sekiz melodi/davul satırı × 16 adım; 1–8 ve 9–16 sayfaları. Her bölümün her ölçüsü ayrı düzenlenir. Son 32 adım düzenlemesi geri alınabilir/yinelenebilir; işlem mevcut ölçü/enstrümanla sınırlıdır. Solo ve davul notaları bölüm kimliğiyle ayrı tutulur, ayrı temizlenir ve Studio'da ayrı şeritlerde görünür.
- **MIDI girişi:** MIDI bağla ile kullanıcı izninden sonra USB klavye/pad seçimi, nota ve hız bilgisi, sustain pedalı ve cihaz ayrıldığında notaları bırakma. Web MIDI destekleyen tarayıcı gerekir; SysEx erişimi istenmez. Fiziksel cihaz ve tarayıcı izinleri ayrıca doğrulanmalıdır.
- **Metronom:** CLICK ve bir ölçü ön sayım. Ön sayım sırasında nota kaydı yapılmaz. Click yalnızca dinleme çıkışındadır, miksin WAV kaydına girmez.
- **Söz defteri:** her kısmın kendi sözleri Groovebox ve Studio arasında korunur, proje dosyasına ve otomatik kayda dahildir.
- **Studio:** bölüm ekleme, kopyalama, sıralama, akor düzenleme, gerçek solo nota şeridi ve miks kaydı.
- **Global ton/gam:** tüm bölümlerin akorlarını ve kaydedilmiş melodiyi birlikte uyarlar.
- **WAV kanalı:** en fazla 20 MB WAV içe aktarma, gerçek dalga biçimi, seviye/sessize alma ve başlangıç zamanı. Dosya özgün hız/perdede çalar; otomatik tempo eşleme veya pitch-shift uygulanmaz.
- **Ses kaydı:** riff, solo, ritim ve WAV kanalını kaydeder. İsteğe bağlı mikrofon yalnızca kayıt çıkışına bağlanır; hoparlöre geri verilmez. Desteklenen tarayıcılarda WAV'a dönüştürülür; dönüşüm kullanılamazsa özgün WebM/M4A/OGG kaydı indirilir.
- **Proje dosyası:** JSON; bölümler, nota olayları, global ton/gam, mikser ayarları ve içe aktarılan WAV'ın kendisini içerir. Bitmiş miksin WAV kaydı ayrıca indirilir. Projeler bu tarayıcıda IndexedDB'ye otomatik kaydedilir; dosya indirmek başka cihaza taşımak ve yedeklemek içindir.

## Geliştirme

Node.js 24 ve pnpm 11 kullanın.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm test:e2e
pnpm build
```

Yerel adres: `http://localhost:3000`. Mikrofon için localhost veya HTTPS gerekir.

`pnpm test`, tüm tonlar/gamlar, pad eşlemesi, MIDI mesajları, ön sayım, zamanlama, aranje geçişleri, proje doğrulaması ve WAV başlığı testlerini; ayrıca React/Happy DOM ile proje açma/kaydetme, klavye, WAV içe aktarma, kayıt, hata durumları ve IndexedDB testlerini çalıştırır. Entegrasyon testlerinde Web Audio ve MediaRecorder için sıkı test adaptörleri kullanılır.

`pnpm test:e2e`, kurulu Chrome ile izole Playwright profillerinde masaüstü/mobil yüzeyi, adım kaydı ve geri almayı, IndexedDB'den geri yüklemeyi, gerçek Web Audio/MediaRecorder üzerinden ses içeren WAV'ı ve click'in kayda girmemesini doğrular. MIDI cihazı bu testte taklit edilir. Alternatif Chromium kurulumu için `pnpm exec playwright install chromium` ardından `PW_CHANNEL=chromium pnpm test:e2e` (PowerShell: `$env:PW_CHANNEL='chromium'; pnpm test:e2e`). Ekran görüntüleri ve örnek miks `test-results/` altına yazılır. Fiziksel MIDI, mikrofon izinleri ve cihaz ses kalitesi ayrıca denenmelidir.

Bu depo web sürümüdür. Native macOS/iOS uygulamaları ve VST3/AU/AAX eklentileri bu değişiklikte yer almaz.
