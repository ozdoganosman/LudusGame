import AsyncStorage from '@react-native-async-storage/async-storage';

import { PROFILE_KEY, emptyProfile, parseProfile, serializeProfile } from './profile';
import type { Profile } from './profile';

/** Kayıtlı profili okur; depolama erişilemezse boş profille devam edilir. */
export async function loadProfile(): Promise<Profile> {
  try {
    return parseProfile(await AsyncStorage.getItem(PROFILE_KEY));
  } catch {
    return emptyProfile();
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, serializeProfile(profile));
  } catch {
    // Yazma hatası oynanışı etkilemez.
  }
}
