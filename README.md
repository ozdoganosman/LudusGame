# Kuşat

Volfied / Qix tarzı alan kapatma oyunu — Expo (React Native) ile mobil için.

Kenardan içeri dalıp iz bırakırsın, izi ele geçirilmiş alana bağladığında kapattığın
bölge senin olur. Patronun bulunduğu bölge dolmaz; onu köşeye sıkıştırırsan alanın
geri kalanı bir hamlede senin olur. Sıradan düşmanlar kapattığın bölgede kalırsa yok olur.

![Oynanış kareleri](docs/preview.png)

*Motor başsız çalıştırılarak üretilmiş gerçek kareler (`npm run preview`).*

## Oynanış

| Kural | Ayrıntı |
| --- | --- |
| Hedef | İç alanın **%80'ini** ele geçirmek |
| Güvenli bölge | Ele geçirilmiş alanda dururken düşmanlar sana değemez |
| Risk | Boş alana girdiğin anda iz bırakmaya başlarsın ve açıktasın |
| Ölüm | Düşman izine veya sana değerse, ya da kendi izine girersen |
| Patron (pembe) | Bulunduğu bölge ele geçirilemez, her yerde tehlikelidir |
| Gezgin (turuncu) | Rastgele seker; kapatılan bölgede kalırsa yok olur ve puan verir |
| Avcı (sarı) | 4. seviyeden sonra çıkar, seni takip eder |

Kontrol: ekranın alt bölgesine parmağını koy — dokunduğun nokta joystick merkezi olur,
8 yöne hareket edebilirsin. Parmağını kaldırınca gemi durur.

## Çalıştırma

```bash
npm install
npx expo start
```

Telefondaki **Expo Go** ile QR kodu okut. Kullanılan tüm native modüller
(Skia, haptics, async-storage, safe-area-context) Expo Go içinde geldiği için
ayrı bir native derleme gerekmez.

## Geliştirme

```bash
npm test         # motor testleri (26 test)
npm run typecheck
npm run lint
npm run preview  # motoru başsız oynatıp docs/preview.png üretir
```

## Yapı

```
src/engine/      Platformdan bağımsız oyun motoru (saf TypeScript, React içermez)
  types.ts       Hücre durumları, düşman ve olay tipleri
  config.ts      Alan boyutu, hızlar, zorluk eğrisi
  field.ts       Grid, bölge etiketleme (flood fill), ele geçirme kuralları
  game.ts        Oyuncu adımları, düşman davranışı, çarpışma, seviye akışı
  rng.ts         Deterministik PRNG (testler tekrarlanabilir olsun diye)
src/ui/          React Native / Skia katmanı
  GameCanvas.tsx Grid'i RGBA tamponundan Skia görüntüsüne çevirip çizer
  Joystick.tsx   PanResponder tabanlı serbest yerleşimli joystick
  Hud.tsx        Seviye, puan, yüzde çubuğu, canlar
  gridImage.ts   Alan -> piksel dönüşümü (uygulama ve önizleme aracı paylaşır)
tools/preview.ts Başsız oynatma + PNG kare üretimi
App.tsx          Ekran akışı (menü / oyun / duraklatma / seviye sonu / oyun sonu)
```

### Tasarım notları

- **Motor React'ten bağımsız.** Tüm oyun mantığı `src/engine` içinde saf TypeScript;
  bu yüzden cihaz olmadan `node` ile test edilebiliyor ve PNG önizlemesi üretilebiliyor.
- **Ele geçirme.** İz kapandığında boş hücreler 4 komşuluk üzerinden bölgelere ayrılır;
  patronun bulunmadığı her bölge doldurulur. 4 komşuluk seçilmesi izin çapraz
  hareketlerde de sızdırmaz bir duvar olmasını sağlar.
- **Render maliyeti.** Grid 64×96 hücre; her hücre bir piksel olarak RGBA tamponuna
  yazılır ve Skia görüntüsü olarak ölçeklenir. Görüntü yalnızca hücreler değiştiğinde
  (`Field.version`) yeniden kodlanır, her karede değil.
- **Zaman adımı** `MAX_DT` ile sınırlıdır; uygulama arka plandan döndüğünde oyuncu
  veya düşmanlar ışınlanmaz.

## Bilinen sınırlar

- Ses/müzik yok.
- Cihazda (Expo Go) elle oynanış testi yapılmadı; doğrulama motor testleri, Metro
  paketleme ve başsız PNG önizlemesi ile yapıldı.
- Web hedefi denenmedi (Skia web için ek Metro yapılandırması gerekir).
