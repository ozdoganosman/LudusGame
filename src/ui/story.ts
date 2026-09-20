/** Oyunun açılış hikâyesi ve görev adları. Yalnızca metin; oynanışı etkilemez. */

export const GAME_TITLE = 'Nanogemi';

export const STORY_LINES = [
  'Antibiyotikler yıllar önce işe yaramaz oldu.',
  'Hastalıklara karşı son savunma, hastanın kan dolaşımına gönderilen küçültülmüş gemiler.',
  'Sen o filonun kaptanısın.',
];

export const MISSION_BRIEF =
  'Dokuyu kenardan tarayarak temizle. Işın izini güvenli bölgeye bağladığında kapattığın alan iyileşir. Patojenin bulunduğu bölge temizlenmez — ondan uzak dur.';

/** Her seviye bir doku; sırayla dolaşılır, sonra baştan (daha zoru) başlar. */
const TISSUES = [
  { name: 'KILCAL DAMAR', hint: 'İlk temas. Kolonileri büyümeden dağıt.' },
  { name: 'SOLUK BORUSU', hint: 'Hava yolu daralıyor; hızlı çalış.' },
  { name: 'AKCİĞER DOKUSU', hint: 'Virüs kolonisi yayılmaya başladı.' },
  { name: 'MİDE ASTARI', hint: 'Asit ortamda mikroplar daha çevik.' },
  { name: 'KAN DOLAŞIMI', hint: 'Akıntı hızlı, patojen daha saldırgan.' },
  { name: 'LENF DÜĞÜMÜ', hint: 'Savunma hattı çöküyor. Geri al.' },
  { name: 'SİNİR AĞI', hint: 'En hassas doku. Tek hata pahalı.' },
];

export type Mission = { name: string; hint: string; wave: number };

/** Seviye numarasından görev bilgisi; liste bitince dalga sayısı artar. */
export function missionFor(level: number): Mission {
  const index = (Math.max(1, level) - 1) % TISSUES.length;
  const wave = Math.floor((Math.max(1, level) - 1) / TISSUES.length) + 1;
  return { ...TISSUES[index], wave };
}

/** Düşman türlerinin tema adları. */
export const ENEMY_NAMES = {
  drifter: 'mikrop',
  hunter: 'virüs',
  boss: 'patojen',
} as const;
