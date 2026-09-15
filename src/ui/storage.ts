import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = 'kusat.highScore.v1';

export async function loadHighScore(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // Depolama okunamazsa oyun yine oynanabilir olmalı.
    return 0;
  }
}

export async function saveHighScore(score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(HIGH_SCORE_KEY, String(Math.round(score)));
  } catch {
    // Yazma hatası oynanışı etkilemez.
  }
}
