import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMPAIGN_LENGTH } from './src/engine/campaign';
import { FIELD_H, FIELD_W } from './src/engine/config';
import { Game } from './src/engine/game';
import { NEUTRAL } from './src/engine/input';
import type { PartId } from './src/engine/upgrades';
import type { Input } from './src/engine/types';
import { DiveButton } from './src/ui/DiveButton';
import { GameCanvas } from './src/ui/GameCanvas';
import { Hangar } from './src/ui/Hangar';
import { Hud } from './src/ui/Hud';
import { Joystick } from './src/ui/Joystick';
import { Overlay } from './src/ui/Overlay';
import { palette } from './src/ui/palette';
import { addGold, buyPart, emptyProfile, recordScore, unlockMission } from './src/ui/profile';
import type { Profile } from './src/ui/profile';
import {
  CAMPAIGN_END_LINES,
  GAME_TITLE,
  MISSION_BRIEF,
  SHIP_NAME,
  STORY_LINES,
  missionFor,
  missionLabel,
  missionProgress,
} from './src/ui/story';
import { loadProfile, saveProfile } from './src/ui/storage';
import { bestiaryLine } from './src/ui/tissues';
import { useGameLoop } from './src/ui/useGameLoop';

type Mode = 'menu' | 'brief' | 'playing' | 'paused' | 'levelClear' | 'gameOver' | 'shop';

const STICK_HEIGHT = 160;
const HUD_HEIGHT = 108;

/** Dokunsal geri bildirim isteğe bağlıdır; desteklenmeyen cihazda sessizce geçilir. */
function buzz(run: () => Promise<void>) {
  run().catch(() => undefined);
}

const tr = (value: number) => value.toLocaleString('tr-TR');

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GameRoot />
    </SafeAreaProvider>
  );
}

function GameRoot() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = new Game({ seed: Date.now() >>> 0 });
  }
  const game = gameRef.current;

  const inputRef = useRef<Input>(NEUTRAL);
  /** Dalış tuşu: kenardan boş alana ancak basılıyken çıkılır. */
  const divingRef = useRef(false);
  const hudTimer = useRef(0);
  /** Görev tamamlandıktan sonra puan ve can taşınsın mı? */
  const continuingRun = useRef(false);
  /** Hangardan çıkınca dönülecek ekran. */
  const shopReturn = useRef<Mode>('menu');

  const [mode, setMode] = useState<Mode>('menu');
  const [frame, setFrame] = useState(0);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  /** Brifingi açık olan görev. */
  const [mission, setMission] = useState(1);
  const [hud, setHud] = useState({
    level: 1,
    score: 0,
    lives: game.lives,
    percent: 0,
    gold: 0,
    shield: 0,
    shieldCharges: 0,
  });
  const [summary, setSummary] = useState({ level: 1, percent: 0, score: 0, bonus: 0, gold: 0 });

  // Kayıtlı profil: altın, parçalar ve kampanyada kalınan yer.
  useEffect(() => {
    let cancelled = false;
    loadProfile().then((saved) => {
      if (cancelled) return;
      setProfile(saved);
      setMission(saved.unlocked);
      game.setLoadout(saved.loadout);
    });
    return () => {
      cancelled = true;
    };
  }, [game]);

  /** Profili hem ekranda hem depoda güncelle. */
  const commitProfile = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next);
    return next;
  }, []);

  const syncHud = useCallback(
    (gold: number) => {
      setHud({
        level: game.level,
        score: game.score,
        lives: game.lives,
        percent: game.percent,
        gold: gold + game.gold,
        shield: game.shield,
        shieldCharges: game.shipStats.shieldCharges,
      });
    },
    [game]
  );

  const step = useCallback(
    (dt: number) => {
      const events = game.update(dt, {
        dx: inputRef.current.dx,
        dy: inputRef.current.dy,
        dive: divingRef.current,
      });

      for (const event of events) {
        switch (event.type) {
          case 'capture':
            buzz(() =>
              Haptics.impactAsync(
                event.trapped > 0
                  ? Haptics.ImpactFeedbackStyle.Medium
                  : Haptics.ImpactFeedbackStyle.Light
              )
            );
            break;
          case 'shield-hit':
            buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
            break;
          case 'death':
            buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
            break;
          case 'level-clear': {
            buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
            const earned = game.takeGold();
            setProfile((current) => {
              let next = addGold(current, earned);
              next = recordScore(next, game.score);
              // Kampanya sonrası ilerleme 13'te (1. mutasyon dalgası) durur:
              // dönen oyuncu dalgalara baştan girer, imkânsız bir dalgaya düşmez.
              next = unlockMission(next, Math.min(event.level + 1, CAMPAIGN_LENGTH + 1));
              saveProfile(next);
              return next;
            });
            setSummary({
              level: event.level,
              percent: event.percent,
              score: game.score,
              bonus: event.bonus,
              gold: earned,
            });
            setMode('levelClear');
            break;
          }
          case 'game-over': {
            const earned = game.takeGold();
            const finalScore = event.score;
            setProfile((current) => {
              const next = recordScore(addGold(current, earned), finalScore);
              saveProfile(next);
              return next;
            });
            setSummary({
              level: event.level,
              percent: game.percent,
              score: finalScore,
              bonus: 0,
              gold: earned,
            });
            setMode('gameOver');
            break;
          }
          default:
            break;
        }
      }

      setFrame((value) => value + 1);

      // HUD metinleri saniyede ~10 kez yenilenir; her karede yazı yerleşimi gereksiz.
      hudTimer.current += dt;
      if (hudTimer.current >= 0.1) {
        hudTimer.current = 0;
        syncHud(profile.gold);
      }
    },
    [game, profile.gold, syncHud]
  );

  useGameLoop(step, mode === 'playing');

  const handleInput = useCallback((input: Input) => {
    inputRef.current = input;
  }, []);

  const handleDive = useCallback((held: boolean) => {
    divingRef.current = held;
  }, []);

  /** Görev brifingi; continueRun true ise puan ve can taşınır. */
  const openBrief = useCallback(
    (index: number, continueRun: boolean) => {
      inputRef.current = NEUTRAL;
      divingRef.current = false;
      continuingRun.current = continueRun;
      setMission(index);
      if (!profile.seenIntro) commitProfile({ ...profile, seenIntro: true });
      setMode('brief');
    },
    [commitProfile, profile]
  );

  const launch = useCallback(() => {
    inputRef.current = NEUTRAL;
    divingRef.current = false;
    game.setLoadout(profile.loadout);
    if (continuingRun.current && mission === game.level + 1) game.nextLevel();
    else game.start(mission);
    continuingRun.current = false;
    syncHud(profile.gold);
    setMode('playing');
  }, [game, mission, profile.gold, profile.loadout, syncHud]);

  const openShop = useCallback(() => {
    setMode((current) => {
      if (current !== 'shop') shopReturn.current = current;
      return 'shop';
    });
  }, []);

  const closeShop = useCallback(() => {
    setMode(shopReturn.current === 'shop' ? 'menu' : shopReturn.current);
  }, []);

  const purchase = useCallback(
    (id: PartId) => {
      // Seferde kazanılan altın önce kasaya girer; alım tek bir cüzdandan yapılır.
      const earned = game.takeGold();
      const result = buyPart(earned > 0 ? addGold(profile, earned) : profile, id);
      const next = commitProfile(result.profile);
      game.setLoadout(next.loadout);
      syncHud(next.gold);
    },
    [commitProfile, game, profile, syncHud]
  );

  const pause = useCallback(() => {
    inputRef.current = NEUTRAL;
    divingRef.current = false;
    setMode((current) => (current === 'playing' ? 'paused' : current));
  }, []);

  const resume = useCallback(() => setMode('playing'), []);
  const goToMenu = useCallback(() => setMode('menu'), []);

  // Hücre boyu ekrana göre hesaplanır; alan tam sayı hücrelerle ölçeklenir.
  const maxFieldWidth = width - 20;
  const maxFieldHeight = height - insets.top - insets.bottom - HUD_HEIGHT - STICK_HEIGHT;
  const cell = Math.max(2, Math.floor(Math.min(maxFieldWidth / FIELD_W, maxFieldHeight / FIELD_H)));

  const purse = profile.gold + game.gold;
  const briefing = missionFor(mission);
  const cleared = missionFor(summary.level);
  const fresh = profile.unlocked === 1 && !profile.seenIntro;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Hud
        mission={missionLabel(hud.level)}
        score={hud.score}
        highScore={profile.highScore}
        lives={hud.lives}
        percent={hud.percent}
        target={game.targetPercent}
        gold={hud.gold}
        shield={hud.shield}
        shieldCharges={hud.shieldCharges}
        onPause={pause}
      />

      <View style={styles.field}>
        <GameCanvas game={game} cell={cell} frame={frame} loadout={profile.loadout} />
      </View>

      <View style={styles.controls}>
        <Joystick onChange={handleInput} height={STICK_HEIGHT} />
        <View style={styles.diveSlot} pointerEvents="box-none">
          <DiveButton onChange={handleDive} />
        </View>
      </View>

      {mode === 'menu' ? (
        <Overlay
          title={GAME_TITLE.toLocaleUpperCase('tr-TR')}
          subtitle={`${SHIP_NAME} · küçültülmüş bir geminin kaptanısın.`}
          story={STORY_LINES}
          rows={[
            { label: 'Altın', value: tr(profile.gold) },
            { label: 'İlerleme', value: missionProgress(profile.unlocked) },
            { label: 'Rekor', value: tr(profile.highScore) },
          ]}
          hint={MISSION_BRIEF}
          primary={{
            label: fresh ? 'GÖREVE BAŞLA' : 'GÖREVE DEVAM',
            onPress: () => openBrief(profile.unlocked, false),
          }}
          secondary={{ label: 'HANGAR', onPress: openShop }}
          tertiary={
            fresh ? undefined : { label: '1. BÖLÜMDEN OYNA', onPress: () => openBrief(1, false) }
          }
        />
      ) : null}

      {mode === 'brief' ? (
        <Overlay
          title={briefing.name}
          subtitle={`${missionProgress(mission)} · ${briefing.title}`}
          story={briefing.story}
          rows={[
            { label: 'Temizlenecek alan', value: `%${briefing.target}` },
            { label: 'Görev primi', value: `${tr(briefing.reward)} altın` },
            { label: 'Altın', value: tr(purse) },
          ]}
          hint={`${briefing.hint} Bu dokuda: ${bestiaryLine(mission)}.`}
          primary={{ label: 'DALIŞA GEÇ', onPress: launch }}
          secondary={{ label: 'HANGAR', onPress: openShop }}
          tertiary={{ label: 'ANA EKRAN', onPress: goToMenu }}
        />
      ) : null}

      {mode === 'paused' ? (
        <Overlay
          title="BEKLEMEDE"
          subtitle={missionLabel(hud.level)}
          rows={[
            { label: 'Temizlenen', value: `%${hud.percent.toFixed(1)}` },
            { label: 'Puan', value: tr(hud.score) },
            { label: 'Kalan gemi', value: String(hud.lives) },
            { label: 'Altın', value: tr(purse) },
          ]}
          primary={{ label: 'DEVAM ET', onPress: resume }}
          secondary={{ label: 'HANGAR', onPress: openShop }}
          tertiary={{ label: 'ANA EKRAN', onPress: goToMenu }}
        />
      ) : null}

      {mode === 'levelClear' ? (
        <Overlay
          title={cleared.finale ? 'ÇEKİRDEK DAĞILDI' : 'DOKU TEMİZ'}
          subtitle={
            cleared.finale
              ? 'Ana hikâye tamamlandı.'
              : `Sıradaki görev: ${missionFor(summary.level + 1).name}`
          }
          story={cleared.finale ? CAMPAIGN_END_LINES : undefined}
          rows={[
            { label: 'Temizlenen', value: `%${summary.percent.toFixed(1)}` },
            { label: 'Görev primi', value: `+${tr(summary.bonus)} puan` },
            { label: 'Kazanılan altın', value: `+${tr(summary.gold)}` },
            { label: 'Kasa', value: tr(profile.gold) },
          ]}
          hint="Altınla hangarda kanat, motor, kuyruk, kompozit gövde, ışın topu ve kalkan alabilirsin."
          primary={{
            label: 'SONRAKİ GÖREV',
            onPress: () => openBrief(summary.level + 1, true),
          }}
          secondary={{ label: 'HANGAR', onPress: openShop }}
          tertiary={{ label: 'ANA EKRAN', onPress: goToMenu }}
        />
      ) : null}

      {mode === 'gameOver' ? (
        <Overlay
          title="FİLO TÜKENDİ"
          subtitle={
            summary.score >= profile.highScore && summary.score > 0
              ? 'Yeni rekor! Hasta bir süre daha dayanacak.'
              : 'Patojen dokuyu ele geçirdi.'
          }
          rows={[
            { label: 'Puan', value: tr(summary.score) },
            { label: 'Kalınan görev', value: missionFor(summary.level).name },
            { label: 'Kazanılan altın', value: `+${tr(summary.gold)}` },
            { label: 'Kasa', value: tr(profile.gold) },
          ]}
          hint="Kazandığın altın kasada kalır; gemiyi güçlendirip aynı göreve dönebilirsin."
          primary={{ label: 'GÖREVE DÖN', onPress: () => openBrief(summary.level, false) }}
          secondary={{ label: 'HANGAR', onPress: openShop }}
          tertiary={{ label: 'ANA EKRAN', onPress: goToMenu }}
        />
      ) : null}

      {mode === 'shop' ? (
        <Hangar
          gold={purse}
          loadout={profile.loadout}
          onBuy={purchase}
          onClose={closeShop}
          note={
            shopReturn.current === 'paused'
              ? 'Görev sürüyor: hız ve silah hemen, ek gemi ve kalkan sıradaki görevde geçerli.'
              : 'Altın; kapatılan alan, düşürülen düşman ve görev primlerinden gelir.'
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  field: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'relative',
  },
  diveSlot: {
    position: 'absolute',
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
