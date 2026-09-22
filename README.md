# Nanogemi

Volfied / Qix tarzı alan kapatma oyunu — ama sahne insan vücudunun içi.

Antibiyotikler işe yaramaz olmuştur; hastalıklara karşı son savunma, hastanın kan
dolaşımına gönderilen küçültülmüş gemilerdir. Sen *Kehribar*'ın kaptanısın. Dokuyu
kenardan tarayarak temizler, ışın izini güvenli bölgeye bağladığında kapattığın
alanı iyileştirirsin. Patojenin bulunduğu bölge temizlenmez — onu köşeye
sıkıştırırsan dokunun geri kalanı bir hamlede iyileşir.

Ana hikâye 12 bölüm: kılcal damardan beyin sapındaki çekirdeğe kadar, her bölüm
bir öncekinden zor. Kapattığın alan, düşürdüğün düşman ve görev primleri **altın**
kazandırır; altınla hangarda geminin altı parçasını yükseltirsin ve aldığın her
parça gemide görünür.

Aynı oyun motoru iki yerde çalışır: **mobil** (Expo / React Native + Skia) ve
**web** (Canvas2D, statik, wasm yok).

![Oynanış kareleri](docs/preview.png)

*Motor başsız çalıştırılarak üretilmiş kareler (`npm run preview`) — ham grid görünümü.*

## Oynanış

| Kural | Ayrıntı |
| --- | --- |
| Hedef | Bölümün istediği oranda dokuyu temizlemek (%62'den başlar, son bölümde %88) |
| Hareket | Gemi yalnızca temizlenmiş alanın **kenarında** yürür; bloğun içine giremez |
| Işın | Kenardan hastalıklı dokuya yalnızca **IŞIN** tuşu basılıyken çıkılır |
| Risk | Dokuya girdiğin anda iz bırakmaya başlarsın ve açıktasın |
| Geri sarma | İzde geldiğin yönde geri gidersen geçtiğin hücreler silinir; başa dönersen iz iptal olur |
| Ölüm | Düşman izine veya gemiye değerse, ya da kendi izinin **başka** bir yerine girersen |
| Patojen (pembe) | Bulunduğu bölge temizlenemez, her yerde tehlikelidir |
| Mikrop (renkli) | Rastgele seker; temizlenen bölgede kalırsa yok olur ve puan verir |
| Virüs | 3. bölümden sonra çıkar, gemiyi takip eder; görev görev daha ısrarlı döner |
| Işın topu | Satın alındıysa baktığın yöne otomatik ateş eder; mikrop ve virüsü düşürür, patronu savurur |
| Kalkan | Satın alındıysa mikrop/virüs darbesini emer (iz gider, can gitmez) ve zamanla dolar |

### Ana hikâye ve görevler

Bölümler sırayla açılır ve kaldığın yer kaydedilir. Her bölüm bir doku: kılcal
damar, soluk borusu, akciğer, mide astarı, kan dolaşımı, lenf düğümü, kemik iliği,
karaciğer, böbrek, kalp kapağı, omurilik, beyin sapı. Çekirdek dağıldıktan sonra
oyun bitmez — sonsuz **mutasyon dalgaları** başlar.

**Her bölümün kendi görüntüsü var.** Hastalıklı doku o organın hâline göre çizilir
(soluk borusunda sümüklü gri-yeşil iplikler, akciğerde kararmış hava keseleri,
kalp kapağında yırtılmış kas lifleri, beyin sapında çekirdekten yayılan halkalar);
temizlediğin alan aynı dokunun sağlıklı hâline döner (soluk borusunda temiz
kırmızı, lenf düğümünde berrak turkuaz). Desenler yordamsal: varlık dosyası yok,
her doku kendi görüntüsünü hesaplıyor.

**Her bölümün kendi canavarları var.** Mikrop/virüs/patojen davranışları aynı
kalır ama görünüşleri bölüme göre değişir: solucan, basil, kok kümesi, spor,
denizanası, kristal, faj, amip; patronlar dişli ağız, dev göz ya da üç başlı
hidra. Adları da bölüme özel (balgam solucanı, lenf denizanası, BOĞAZ TIKACI…) ve
brifingde yazılı.

**Zorluk ilk bölümden itibaren sıkıştırır:** 1. bölüm iki mikrop, hızlı bir
patojen ve 23 saniyede bir yeni doğumla başlar; her bölümde temizlenecek alan
büyür, düşman sayısı ve hızı yükselir, doğumlar sıklaşır, virüsler daha ısrarlı
döner. 12. bölümde sekiz mikrop, beş virüs ve iki kat hızlı bir patojen var.

Görevi tamamlarsan puan ve can sıradaki bölüme taşınır; filo tükenirse kazandığın
altın kasada kalır, gemiyi güçlendirip aynı bölüme dönersin.

### Hangar (yükseltmeler)

| Parça | Etkisi |
| --- | --- |
| **Kanat** | Temizlenmiş alanın kenarında hız |
| **Motor** | Hastalıklı dokuya dalışta hız |
| **Kuyruk** | İzde geri sarma hızı |
| **Kompozit gövde** | Yedek gemi (+can) ve daha hızlı toparlanma |
| **Işın topu** | Otomatik ateş: atış hızı ve menzil |
| **Kalkan** | Emilen darbe sayısı, dolum süresi, doğuşta ek dokunulmazlık |

Her parça 4 kademe. Fiyatlar kademeyle artar; tam bir kampanya gemiyi neredeyse
tamamen donatmaya yeter, gerisi mutasyon dalgalarından gelir. Altın, parçalar ve
kampanya ilerlemesi cihazda saklanır (web: `localStorage`, mobil: AsyncStorage).

**Kontrol:** ekrana parmağını koy — dokunduğun nokta joystick merkezi olur, 8 yöne
hareket edebilirsin; parmağını kaldırınca gemi durur. Hastalıklı dokuya dalmak için
sağdaki **IŞIN** tuşunu basılı tutman gerekir; tuşa basmadan kenardan çıkamazsın,
böylece kazara dalış olmaz. İz başladıktan sonra tuşu bırakabilirsin. Web sürümünde
klavye de çalışır: yön tuşları veya WASD ile hareket, **boşluk** basılı tutarak ışın,
**ESC** ile duraklat.

## Çalıştırma

### Web (en hızlısı)

```bash
npm install
npm run dev:web     # http://127.0.0.1:4173
```

`npm run build:web` üç çıktı üretir:

| Dosya | Ne işe yarar |
| --- | --- |
| `dist/index.html` + `dist/main.js` | Statik site (GitHub Pages, Netlify) |
| `dist/nanogemi.html` | Tek dosyalık sürüm — çift tıklayıp oynanır, tek başına paylaşılabilir |
| `dist/artifact.html` | Belge iskeletini kendisi saran ortamlar için gövde + stil |

### Mobil (Expo)

```bash
npm install
npx expo start
```

Telefondaki **Expo Go** ile QR kodu okut. Kullanılan tüm native modüller
(Skia, haptics, async-storage, safe-area-context) Expo Go içinde geldiği için
ayrı bir native derleme gerekmez.

## Yayınlama

Web sürümü `dist/` altına tamamen statik olarak derlenir (tek HTML + ~18 KB JS,
wasm yok), yani her statik barındırma servisinde çalışır.

### GitHub Pages

`.github/workflows/deploy-pages.yml` hazır. Tek seferlik ayar:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. `master` dalına gelen her push'ta yayın kendiliğinden güncellenir.
   Birleştirmeden önce denemek için **Actions → "Web sürümünü GitHub Pages'e yayınla" → Run workflow**
   ile istediğin daldan elle de çalıştırabilirsin.

Adres: `https://ozdoganosman.github.io/LudusGame/`

### Netlify

`netlify.toml` build komutunu ve yayın dizinini tanımlıyor; Netlify'da depoyu
bağlamak dışında ayar gerekmez (Add new site → Import an existing project).
Hızlı yol olarak `npm run build:web` sonrası `dist/` klasörünü
[app.netlify.com/drop](https://app.netlify.com/drop) adresine sürükleyebilirsin.

## Geliştirme

```bash
npm test         # motor ve arayüz testleri (69 test)
npm run typecheck
npm run lint
npm run build:web  # dist/ üretir
npm run preview    # motoru başsız oynatıp docs/preview.png üretir
```

## Yapı

```
src/engine/        Platformdan bağımsız oyun motoru (saf TypeScript, React içermez)
  types.ts         Hücre durumları, düşman, mermi ve olay tipleri
  campaign.ts      Görev planı: hedef yüzde, kadro, altın primi (sonsuz dalgalar dahil)
  config.ts        Alan boyutu, hızlar, zorluk eğrisi
  upgrades.ts      Parçalar, kademe fiyatları ve oynanış etkileri (ShipStats)
  field.ts         Grid, bölge etiketleme (flood fill), ele geçirme kuralları
  game.ts          Oyuncu adımları, düşman davranışı, çarpışma, seviye akışı
  input.ts         8 yöne yuvarlama + ölü bölge (mobil ve web ortak kullanır)
  rng.ts           Deterministik PRNG (testler tekrarlanabilir olsun diye)
src/ui/            React Native / Skia katmanı
  GameCanvas.tsx   Grid'i RGBA tamponundan Skia görüntüsüne çevirip çizer
  Joystick.tsx     PanResponder tabanlı serbest yerleşimli joystick
  Hud.tsx          Görev, puan, yüzde çubuğu, canlar, kalkan ve altın
  Hangar.tsx       Altınla parça alma ekranı (mobil)
  ShipPreview.tsx  Hangardaki gemi önizlemesi (Skia)
  SkiaShapes.tsx   Şekil listesini Skia düğümlerine çeviren ortak katman
  parts.ts         Parça adları ve etki metinleri
  profile.ts       Kalıcı profil: altın, parçalar, açılan bölüm, rekor
  contour.ts       Sınır çokgeni çıkarma ve merdiven köşelerini pahlama
  creatures.ts     Gemi, parçalar ve 11 canavar arketipinin şekilleri
  tissues.ts       Bölüm başına doku renkleri, arka plan deseni ve canavar kadrosu
  story.ts         Ana hikâye, bölüm brifingleri, düşman tema adları
  gridImage.ts     Yordamsal doku görüntüleri (hastalıklı zemin, iyileşmiş doku, ham grid)
  palette.ts       Arayüzün ortak renkleri (gemi, iz, paneller)
web/               Web sürümü: Canvas2D render + DOM arayüzü
  body.html        Arayüz iskeleti (HUD, alan, joystick, panel)
  styles.css       Görünüm; arayüz renklerini palette'ten CSS değişkeni olarak alır
  main.ts          Çizim, girdi (dokunmatik + klavye), HUD, ekran akışı
tools/
  build-web.mjs    esbuild paketleme; üç çıktıyı tek kaynaktan oluşturur
                   (--serve ile yerel sunucu ve izleme)
  preview.ts       Başsız oynatma + PNG kare üretimi
App.tsx            Mobil ekran akışı (menü / oyun / duraklatma / seviye sonu / oyun sonu)
```

### Tasarım notları

- **Motor React'ten bağımsız.** Tüm oyun mantığı `src/engine` içinde saf TypeScript;
  bu yüzden cihaz olmadan `node` ile test edilebiliyor, web sürümü aynı motoru
  paylaşıyor ve PNG önizlemesi üretilebiliyor.
- **Kenar hattı.** Volfied'daki gibi gemi ele geçirilmiş bölgenin dış hattında
  hareket eder (`Field.isEdge`: boş alana komşu dolu hücreler). Kapatma gemiyi
  bloğun içinde bırakırsa en yakın kenara çekilir. Kenar hücresinin tanımı gereği
  her zaman boş bir komşusu vardır, yani gemi asla kilitlenmez.
- **Ele geçirme.** İz kapandığında boş hücreler 4 komşuluk üzerinden bölgelere ayrılır;
  patronun bulunmadığı her bölge doldurulur. 4 komşuluk seçilmesi izin çapraz
  hareketlerde de sızdırmaz bir duvar olmasını sağlar.
- **Yükseltmeler tek yerden.** Parçaların oynanışa etkisi `shipStats(loadout)`
  ile türetilir (`src/engine/upgrades.ts`); motor yalnızca bu değerleri okur,
  arayüz de aynı değerleri metne çevirir (`src/ui/parts.ts`). Fabrika çıkışı gemi
  yükseltme öncesindeki değerleri birebir korur, bu da testle sabitlenmiştir.
- **Kampanya verisi ile metin ayrı.** Hedef yüzde, düşman kadrosu ve altın primi
  `src/engine/campaign.ts` içinde (oynanış); bölüm adları, başlıklar ve brifing
  metinleri `src/ui/story.ts` içinde (tema). İkisi `missionFor(index)` ile
  birleşir.
- **Tema ve oynanış ayrı.** Motor türleri davranışa göre adlandırılır
  (`drifter` / `hunter` / `boss`); mikrop, virüs, patojen adları ve görev
  metinleri yalnızca arayüz katmanındadır (`src/ui/story.ts`). Karakter
  çizimleri de renderdan bağımsız bir şekil listesidir (`src/ui/creatures.ts`),
  böylece web ve mobil aynı gemiyi ve aynı düşmanları çizer.
- **Doku görüntüleri yordamsal.** Her bölümün deseni (damar, sümük ipliği, hava
  kesesi, petek, kas lifi, sinir ağı, çekirdek halkası) konuma bağlı deterministik
  gürültüden hesaplanır; hücre başına 3 piksel üretilip yumuşatılarak ölçeklenir.
  İyileşmiş doku aynı deseni sağlıklı renklerle çizer ve sınır çokgeninin içine
  kırpılır (Canvas2D'de `clip`, Skia'da `Group clip`), yani temizlenen alan düz bir
  renk değil gerçek bir doku gibi görünür.
- **Çizim.** Oyun mantığı hücre tabanlı ama görüntü değil: ele geçirilmiş alanın
  sınırı `src/ui/contour.ts` ile çokgen olarak çıkarılır ve merdiven köşeleri
  pahlanır (tek hücrelik kenarların köşesi yarıdan kesilince ardışık basamaklar
  tek bir 45° doğruya dönüşür; alan çerçevesi gibi uzun kenarların köşeleri
  keskin kalır). Böylece çapraz kesimler pikselli merdiven yerine düz çizgi
  görünür. Zemin (boş alan + nokta dokusu) değişmediği için bir kez kodlanır;
  sınır çokgeni ve iz yalnızca hücreler değişince (`Field.version`) yeniden
  kurulur, her karede değil. Aynı çokgenler iki render katmanında da kullanılır:
  webde Canvas2D yolu, mobilde Skia `Path`.
- **`npm run preview` ham grid görünümünü üretir** (hücre hücre boyanmış):
  doldurma mantığını gözle denetlemek için kasıtlı olarak yumuşatılmamıştır.
- **Zaman adımı** `MAX_DT` ile sınırlıdır; uygulama arka plandan döndüğünde oyuncu
  veya düşmanlar ışınlanmaz.

## Bilinen sınırlar

- Ses/müzik yok.
- Mobil sürüm cihazda (Expo Go) elle oynanmadı; doğrulama motor testleri, Metro
  paketlemesi ve başsız PNG önizlemesi ile yapıldı. Web sürümü Chromium'da
  (dokunmatik emülasyonuyla) oynanarak doğrulandı.
- Expo'nun kendi web hedefi (`npx expo start --web`) denenmedi; Skia'nın web'de
  CanvasKit (wasm) gerektirmesi nedeniyle web için ayrı ve çok daha hafif olan
  Canvas2D sürümü yazıldı.
