# SongWriter Pro

Tarayıcıda çalışan şarkı yazma ve kayıt uygulaması. React, TypeScript, Vite ve Web Audio API kullanır.

- **Groovebox:** gitar/piyano riff'i, seçilebilir solo enstrümanı, klavye ve dokunma ile çalma, nota döngüsü kaydı ve ×1–×4 aranje geçişleri.
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
pnpm build
```

Yerel adres: `http://localhost:3000`. Mikrofon için localhost veya HTTPS gerekir.

`pnpm test`, tüm tonlar/gamlar, zamanlama, aranje geçişleri, proje doğrulaması ve WAV başlığı testlerini; ayrıca React/Happy DOM ile proje açma/kaydetme, klavye, WAV içe aktarma, kayıt, hata durumları ve IndexedDB testlerini çalıştırır. Entegrasyon testlerinde Web Audio ve MediaRecorder için sıkı test adaptörleri kullanılır; gerçek tarayıcı/cihaz ses kalitesi ve mikrofon izinleri ayrıca denenmelidir.

Bu depo web sürümüdür. Native macOS/iOS uygulamaları ve VST3/AU/AAX eklentileri bu değişiklikte yer almaz.
