/**
 * Ana hikâye ve görev metinleri. Yalnızca yazı: hedef yüzde, zorluk ve altın
 * primi motorun kampanya planından gelir (src/engine/campaign.ts).
 */
import { CAMPAIGN_LENGTH, missionPlan } from '../engine/campaign';
import type { MissionPlan } from '../engine/campaign';

export const GAME_TITLE = 'Nanogemi';

/** Geminin adı; brifinglerde ve hangarda geçer. */
export const SHIP_NAME = 'KEHRİBAR';

export const STORY_LINES = [
  'Antibiyotikler yıllar önce işe yaramaz oldu.',
  'Son savunma hattı, hastanın kan dolaşımına gönderilen küçültülmüş gemiler.',
  `Sen ${SHIP_NAME}'ın kaptanısın.`,
  'Hasta 41: dokuz yaşında ve içinde daha önce görülmemiş bir koloni var.',
];

export const MISSION_BRIEF =
  'Dokuyu kenardan tarayarak temizle. Işın izini güvenli bölgeye bağladığında kapattığın alan iyileşir. Patojenin bulunduğu bölge temizlenmez — ondan uzak dur.';

/** Kampanya tamamlanınca gösterilen kapanış. */
export const CAMPAIGN_END_LINES = [
  'Çekirdek dağıldı. Koloni kendini kopyalayamıyor.',
  'Hasta 41 gözlerini açtı.',
  'Ama laboratuvar uyardı: tortu yok olmadı, öğrendi.',
  'Mutasyon dalgaları başlıyor. Filo dokuda kalıyor.',
];

type Chapter = {
  /** Dokunun adı — HUD'da görev adı olarak görünür. */
  name: string;
  /** Bölüm başlığı. */
  title: string;
  /** Taktik ipucu. */
  hint: string;
  /** Brifing satırları; görev başlamadan önce okunur. */
  story: string[];
};

/** Ana hikâyenin bölümleri; sırayla oynanır. */
const CHAPTERS: Chapter[] = [
  {
    name: 'KILCAL DAMAR',
    title: 'İlk Temas',
    hint: 'Kolonileri büyümeden dağıt. Kenardan küçük dilimler al, riske girme.',
    story: [
      'Enjektör seni parmak ucundaki bir kılcal damara bıraktı.',
      'Burada yalnızca öncü mikroplar var. Işını dene, dokuyu temizle.',
    ],
  },
  {
    name: 'SOLUK BORUSU',
    title: 'Daralan Hava',
    hint: 'Hava yolu daralıyor; geniş dilimler al ama izini uzun tutma.',
    story: [
      'Hasta öksürüyor; tünel her kasılmada sallanıyor.',
      'Koloni hava yolunu kapatmaya çalışıyor. Önce oraya.',
    ],
  },
  {
    name: 'AKCİĞER DOKUSU',
    title: 'Boğulma',
    hint: 'Kese kese ilerle. Köşeleri kapatmak seni tuzağa düşürebilir.',
    story: [
      'Hava keseleri siyah bir tortuyla kaplı.',
      'Laboratuvar tortunun canlı olduğunu söylüyor: kendini kopyalıyor.',
    ],
  },
  {
    name: 'MİDE ASTARI',
    title: 'Asit Sahil',
    hint: 'Asit ortamda mikroplar daha çevik. Kısa dalışlar güvenli.',
    story: [
      'Mide duvarı yanık. Koloni asitten beslenmeyi öğrenmiş.',
      'İlk virüs kabuklarını burada gördün — hedef arıyorlar.',
    ],
  },
  {
    name: 'KAN DOLAŞIMI',
    title: 'Akıntıya Karşı',
    hint: 'Akıntı hızlı; kenar boyunca ilerleyip uygun anı bekle.',
    story: [
      'Ana damarda akıntı seni sürüklüyor.',
      'Tortu buradan bütün organlara dağılıyor. Yolu kes.',
    ],
  },
  {
    name: 'LENF DÜĞÜMÜ',
    title: 'Çöken Hat',
    hint: 'Savunma çökmüş; düşmanı kendi izinle köşeye sıkıştır.',
    story: [
      'Bağışıklık hücreleri yenilmiş, düğüm şişmiş.',
      'Hastanın kendi savunması artık yardım etmiyor. Yalnızsın.',
    ],
  },
  {
    name: 'KEMİK İLİĞİ',
    title: 'Fabrika',
    hint: 'Yeni mikroplar sürekli doğuyor; tempoyu düşürme.',
    story: [
      'Koloni iliği bir fabrikaya çevirmiş.',
      'Üretimi durdurmanın tek yolu dokuyu baştan sona temizlemek.',
    ],
  },
  {
    name: 'KARACİĞER',
    title: 'Süzgeç',
    hint: 'Geniş alan, çok düşman. Güvenli bölgeni büyüterek çalış.',
    story: [
      'Karaciğer zehri süzmeye çalışırken tıkandı.',
      'Burayı kaybederseniz hastayı ilaçla bile tutamazlar.',
    ],
  },
  {
    name: 'BÖBREK',
    title: 'Tuz Ovası',
    hint: 'Kanallar dar; çapraz dalışlar seni kendi izine yakın tutar.',
    story: [
      'Kanallarda kristalleşmiş tortu birikmiş.',
      'Laboratuvar kolonimin merkezini aradığını bildirdi: yukarıda.',
    ],
  },
  {
    name: 'KALP KAPAĞI',
    title: 'Dört Oda',
    hint: 'Her vuruşta düşmanlar hızlanıyor. Kısa ve kesin dilimler.',
    story: [
      'Kapakçık her atışta çarpıyor; gemi zorlanıyor.',
      'Patojen burada büyüdü. Onu görürsen kaçma yönünü şimdiden seç.',
    ],
  },
  {
    name: 'OMURİLİK',
    title: 'İnce Hat',
    hint: 'En hassas doku. Tek hata pahalı; kalkan varsa şimdi işe yarar.',
    story: [
      'Sinir hattı boyunca ilerliyorsun. Hasta her hareketini duyuyor.',
      'Çekirdek bir üst katta: beyin sapı.',
    ],
  },
  {
    name: 'BEYİN SAPI',
    title: 'Çekirdek',
    hint: 'Koloninin merkezi. Dokunun neredeyse tamamını temizlemen gerek.',
    story: [
      'Siyah koloninin çekirdeği burada atıyor.',
      'Bu son görev, kaptan. Dokuyu temizle, tortu kendini kopyalayamasın.',
    ],
  },
];

export type Mission = MissionPlan & {
  name: string;
  title: string;
  hint: string;
  story: string[];
  /** Kampanya bittiyse kaçıncı mutasyon dalgası (kampanyada 0). */
  wave: number;
  /** Ana hikâyenin son bölümü mü? */
  finale: boolean;
};

/** Görev numarasından metin + plan. Kampanya bitince mutasyon dalgaları gelir. */
export function missionFor(index: number): Mission {
  const plan = missionPlan(index);

  if (plan.endless) {
    const wave = plan.index - CAMPAIGN_LENGTH;
    return {
      ...plan,
      name: 'MUTASYON DALGASI',
      title: `${wave}. Dalga`,
      hint: 'Tortu her dalgada yeni bir biçim deniyor. Dayandığın kadar temizle.',
      story: [
        'Koloni yeniden şekillendi; laboratuvar adını bile koyamıyor.',
        `${wave}. dalga dokuya giriyor.`,
      ],
      wave,
      finale: false,
    };
  }

  const chapter = CHAPTERS[plan.index - 1];
  return {
    ...plan,
    ...chapter,
    wave: 0,
    finale: plan.index === CAMPAIGN_LENGTH,
  };
}

/** HUD'da görünen kısa görev etiketi. */
export function missionLabel(index: number): string {
  const mission = missionFor(index);
  return mission.wave > 0 ? `${mission.name} · ${mission.wave}` : mission.name;
}

/** Kampanyadaki ilerleme metni: "3 / 12. bölüm". */
export function missionProgress(index: number): string {
  const mission = missionFor(index);
  if (mission.wave > 0) return `${mission.wave}. mutasyon dalgası`;
  return `${mission.index} / ${CAMPAIGN_LENGTH}. bölüm`;
}

/** Düşman türlerinin tema adları. */
export const ENEMY_NAMES = {
  drifter: 'mikrop',
  hunter: 'virüs',
  boss: 'patojen',
} as const;
