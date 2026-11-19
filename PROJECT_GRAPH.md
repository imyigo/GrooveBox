# PROJECT_GRAPH.md — Acoustic Riff Studio

## 1. Proje Özeti
- **Adı:** Acoustic Riff Studio
- **Konum:** `/Users/iamyigit/Developer/AU VST`
- **Amaç:** Web Audio API ve React tabanlı, fiziksel akustik gitar modelleme, 16-step ritim motoru ve beste yazım stüdyosu.

---

## 2. Mimari ve Bileşen Haritası

```
src/
├── audio/
│   ├── AudioEngine.ts          # Web Audio Context yöneticisi, Master Limiter, Akustik Gövde EQ, Stereo Dağılım, Reverb & Chorus bus
│   ├── AcousticString.ts       # Fiziksel tel modelleme, pena atak transient (pick noise), harmonik tınılar & dinamik lowpass
│   ├── ImpulseGenerator.ts     # Akustik gövde (Dreadnought, Parlor, Jumbo) ahşap impuls yanıtı (IR Convolver)
│   ├── StrumEngine.ts          # Aşağı/yukarı telleme fiziği, insan dokunuşu (micro-jitter), perküsif slap & tel susturma
│   └── Sequencer.ts            # Chris Wilson Lookahead zamanlayıcı (sample-accurate, zero-drift müzikal saat)
├── config/
│   ├── chords.ts               # 6 telli gitar akor tanımları (open, barre, extended), perde frekans formülleri
│   ├── patterns.ts             # 16-step vuruş şablonları (Folk, Travis Picking, Modern Chuck, Ballad, Flamenko)
│   ├── progressions.ts         # Hit beste şablonları (Wonderwall, Pop Hit, Anatolian Rock, Flamenko vb.)
│   └── presets.ts              # Martin D-28, Taylor 814ce, Gibson SJ-200, 12-Telli ton profilleri
├── components/
│   ├── Header.tsx              # Üst kontrol çubuğu, Preset seçimi, Master Play/Stop, Ses seviyesi
│   ├── Fretboard.tsx           # 12 perdeli gül ağacı klavye, sedef kakmalar, tel titreşim animasyonları, interaktif perde tıklama
│   ├── ChordProgression.tsx    # Akor zaman çizelgesi, ölçü yönetimi, akor kartları, akor seçici çekmecesi
│   ├── StrumMatrix.tsx         # 16 adımlık ritim matrisi (Down, Up, Slap, Bass, Treble, Rest) ve canlı playhead
│   ├── VirtualStrummer.tsx     # Sanal ses deliği telleme alanı, klavye kısayolları (↓, ↑, M, 1-6)
│   ├── ToneRack.tsx            # Gövde rezonansı, parlaklık (bronze sheen), stüdyo reverb, chorus ve telleme hızı
│   └── SequencerBar.tsx        # Büyük Play butonu, Tap Tempo, BPM kaydırıcı, Swing ve JSON/Beste dışa aktarma
├── types/
│   └── index.ts                # TypeScript tip tanımları (GuitarChord, StrumBeat, StrumPattern, BodyPreset)
├── App.tsx                     # Ana düzen, reaktif durum yönetimi, orkestrasyon
├── main.tsx                    # React DOM girişi
└── index.css                   # Tailwind CSS ve tel titreşim animasyonları
```

---

## 3. Akustik Ses & Fiziksel Modelleme Standartları
1. **Mikro-Zamanlama (Strum Delay):** Akor basıldığında 6 tel aynı anda patlamaz; aşağı vuruşta kalın telden ince tele `15ms - 35ms` aralıkla kademeli tınlar.
2. **Pena Atağı (Pick Transient):** Vuruş anında 25ms filtrelenmiş bronz tel temas sesi üretilir.
3. **Harmonik Zenginlik:** Temel frekansın yanı sıra 1. ve 2. oktav ile 5. harmonik rezonanslar eklenerek gerçek fosfor bronz tel tınısı yakalanır.
4. **İki Katmanlı Ahşap Rezonansı:** Ses deliği hava rezonansı (~108Hz) ve ladin/maun üst kapak rezonansı (~880Hz) biquad filtrelerle dinamik şekillenir.
5. **Stereo Alanı:** Çalan kişinin perspektifinden bas teller hafif sola, tiz teller hafif sağa stereo dağıtılır.
