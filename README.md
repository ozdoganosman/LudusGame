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
| Patojen (patron) | Bulunduğu bölge temizlenemez, her yerde tehlikelidir |
| Hapsetme | Kapattığın alanda kalan mikrop ve virüs olduğu yerde patlar, özel prim ve altın verir |
| Virüsler | Avcı türler; gemiyi takip eder, sıçrar ya da atılır |
| Işın topu | Satın alındıysa baktığın yöne otomatik ateş eder; mikrop ve virüsü düşürür, patronu savurur |
| Kalkan | Satın alındıysa mikrop/virüs darbesini emer (iz gider, can gitmez) ve zamanla dolar |

### Hapsetme primi

Kapattığın alanda kalan düşman yerinde şişip söner, beyaz bir flaş ve şok
halkasıyla türünün renginde damlacıklara dağılır; üstünde prim yazısı zıplayarak
yükselir. Prim alan puanından ayrıdır ve bölümle büyür:

| Hapsolan | Puan | Altın |
| --- | --- | --- |
| Mikrop | 500 × bölüm × zincir | 8 × zincir |
| Virüs (avcı) | 900 × bölüm × zincir | 8 × zincir |

Tek kapatmada birden fazla düşman hapsedersen **zincir** büyür (×2, ×3…) ve
patlamalar sırayla gelir. Bölümü bitiren son kapatmanın patlamaları da görünsün
diye sonuç paneli bir an gecikmeli açılır.

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

**Her bölümün kendi türleri var** — hem görünüş hem hareket olarak. 42 tür, 16
ayrı siluet; hepsi koyu konturlu, hacim degradeli, gölgeli ve gözlü (kaşlı,
göz bebeği gemiyi izleyen) çizgi film karakterleri (salkım, çubuk + kamçı, spiral, eklemli solucan, dikenli yıldız,
delikli halka, mızrak, dönen çarpı, çanlı denizanası, kristal, altıgen başlı faj,
amip; patronlar dişli ağız, dev göz, üç başlı hidra, dikenli taç) ve **11 hareket
davranışı**:

| Davranış | Nasıl hareket eder |
| --- | --- |
| Seken | Düz gider, duvardan seker |
| Kıvrılan | Yılan gibi yana salınarak ilerler |
| Nabızlı | İter, sürüklenir, yeniden iter (denizanası) |
| Atılgan | Bekler, sonra düz bir hatta fırlar |
| Zıplayan | Gemiye doğru kısa sıçramalar yapar |
| Duvarda gezen | Temizlediğin alanın sınırına yapışıp orada dolaşır |
| Takipçi | Israrla gemiyi kovalar |
| Dönen | Bir noktanın çevresinde dönerek alanı tarar |
| Hücum eden | Ağır ağır dolaşır, sonra üstüne atılır |
| Sekiz çizen | Sekiz şeklinde gezinir |
| Bölünen | Zamanla ikiye ayrılır, her kopya bir öncekinden küçük |

Her bölümün kadrosu ortak mikrop + ikinci bir tür + avcı + patron olarak kurulur;
aynı bölümde en az üç farklı davranış bulunur ve iki tür aynı silueti ya da rengi
paylaşmaz (testle sabit). Adlar da bölüme özel (balgam solucanı, trombosit dikeni,
lenf denizanası, BOĞAZ TIKACI…) ve brifingde yazılı.

**Zorluk ilk bölümden itibaren sıkıştırır:** 1. bölüm iki tür mikrop, bir avcı
virüs, hücum eden bir patojen ve 23 saniyede bir yeni doğumla başlar; her bölümde
temizlenecek alan büyür, tür sayısı ve hızları yükselir, doğumlar sıklaşır,
avcılar daha ısrarlı döner. 12. bölümde altı amip (duvarda gezen), iki spiral,
beş faj ve sekiz çizen bir patron var.

Görevi tamamlarsan puan ve can sıradaki bölüme taşınır; filo tükenirse kazandığın
altın kasada kalır, gemiyi güçlendirip aynı bölüme dönersin.

**Bölüm geçişlerinde kısa bir ara sahne** (~3 sn, dokununca/Enter/boşlukla
geçilir): tıbbi tarama ekranında bir insan silueti, temizlenen organlar yeşil
yanar, gemi bir önceki organdan sıradakine damar boyunca yol alır, hedef organ
nabız gibi atar ve adı daktiloyla yazılır. İlk görevde gemi enjektörden çıkar.

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
npm test         # motor ve arayüz testleri (86 test)
npm run typecheck
npm run lint
npm run build:web  # dist/ üretir
npm run preview    # motoru başsız oynatıp docs/preview.png üretir
```

## Yapı

```
src/engine/        Platformdan bağımsız oyun motoru (saf TypeScript, React içermez)
  types.ts         Hücre durumları, düşman, mermi ve olay tipleri
  campaign.ts      Görev planı: hedef yüzde, tür kadrosu, altın primi (sonsuz dalgalar dahil)
  species.ts       Türler: hareket davranışı, hız çarpanı, boyut
  config.ts        Alan boyutu, hızlar, zorluk eğrisi
  upgrades.ts      Parçalar, kademe fiyatları ve oynanış etkileri (ShipStats)
  field.ts         Grid, bölge etiketleme (flood fill), ele geçirme kuralları
  game.ts          Oyuncu adımları, 11 düşman davranışı, çarpışma, görev akışı
  input.ts         8 yöne yuvarlama + ölü bölge (mobil ve web ortak kullanır)
  rng.ts           Deterministik PRNG (testler tekrarlanabilir olsun diye)
src/ui/            React Native / Skia katmanı
  GameCanvas.tsx   Grid'i RGBA tamponundan Skia görüntüsüne çevirip çizer
  Joystick.tsx     PanResponder tabanlı serbest yerleşimli joystick
  Hud.tsx          Görev, puan, yüzde çubuğu, canlar, kalkan ve altın
  Hangar.tsx       Altınla parça alma ekranı (mobil)
  ShipPreview.tsx  Hangardaki gemi önizlemesi (Skia)
  SkiaShapes.tsx   Şekil listesini Skia düğümlerine çeviren ortak katman
  CutsceneView.tsx Bölüm geçişi ara sahnesi (mobil)
  parts.ts         Parça adları ve etki metinleri
  profile.ts       Kalıcı profil: altın, parçalar, açılan bölüm, rekor
  contour.ts       Sınır çokgeni çıkarma ve merdiven köşelerini pahlama
  shapes.ts        Ortak şekil tipi (daire/çokgen/çizgi, degrade, kontur)
  creatures.ts     Gemi, parçalar ve ışın topu mermisinin şekilleri
  monsters.ts      16 canavar ailesinin çizgi film çizimleri (kontur, degrade, göz)
  effects.ts       Hapsolan/vurulan düşmanın patlaması ve prim yazıları
  cutscene.ts      Ara sahnenin kareleri (vücut haritası, rota, yazılar)
  tissues.ts       Bölüm başına doku renkleri ve arka plan deseni
  bestiary.ts      Türlerin silueti, rengi ve tema adı
  story.ts         Ana hikâye, bölüm brifingleri, düşman tema adları
  gridImage.ts     Yordamsal doku görüntüleri (hastalıklı zemin, iyileşmiş doku, ham grid)
  palette.ts       Arayüzün ortak renkleri (gemi, iz, paneller)
web/               Web sürümü: Canvas2D render + DOM arayüzü
  body.html        Arayüz iskeleti (HUD, alan, joystick, panel)
  styles.css       Görünüm; arayüz renklerini palette'ten CSS değişkeni olarak alır
  main.ts          Çizim, girdi (dokunmatik + klavye), HUD, ekran akışı
  draw.ts          Şekil listesini Canvas2D'ye çizer (oyun, hangar, ara sahne)
tools/
  build-web.mjs    esbuild paketleme; üç çıktıyı tek kaynaktan oluşturur
                   (--serve ile yerel sunucu ve izleme)
  preview.ts       Başsız oynatma + PNG kare üretimi
App.tsx            Mobil ekran akışı (menü / ara sahne / brifing / oyun / duraklatma / sonuçlar)
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
- **Davranış ile görünüş ayrı ama tek kimliğe bağlı.** Bir türün kimliği
  (`SpeciesId`) motorda hareketini, hızını ve boyutunu (`src/engine/species.ts`),
  arayüzde siluetini, rengini ve adını (`src/ui/bestiary.ts`) belirler. Motor
  arayüzü bilmez; iki tablonun aynı anahtarları paylaştığı testle sabitlenmiştir.
  Davranışlar ortak bir iskelet üzerinde çalışır: `heading` gidilen yön, `speed`
  temel hız, davranış o anki çarpanı belirler; duvardan sekme her davranış için
  ortaktır ve yönü günceller.
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
  çizimleri de renderdan bağımsız bir şekil listesidir (`src/ui/shapes.ts`:
  daire, çokgen ya da açık çizgi; dolgu, radyal degrade ve kontur). Gemi,
  canavarlar, patlama efektleri ve ara sahne bu listeyi üretir; web
  (`web/draw.ts`, Canvas2D) ve mobil (`SkiaShapes.tsx`, Skia) aynı listeyi çizer.
- **Efektler deterministik.** Patlama parçacıkları rastgele sayı değil efekt
  kimliğinden türetilir; efekt zamanı oyun döngüsünden gelir, duraklatınca durur.
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
