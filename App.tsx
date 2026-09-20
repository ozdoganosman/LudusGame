import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FIELD_H, FIELD_W, START_LIVES } from './src/engine/config';
import { Game } from './src/engine/game';
import { NEUTRAL } from './src/engine/input';
import type { Input } from './src/engine/types';
import { DiveButton } from './src/ui/DiveButton';
import { GameCanvas } from './src/ui/GameCanvas';
import { Hud } from './src/ui/Hud';
import { Joystick } from './src/ui/Joystick';
import { Overlay } from './src/ui/Overlay';
import { palette } from './src/ui/palette';
import { GAME_TITLE, MISSION_BRIEF, STORY_LINES, missionFor } from './src/ui/story';
import { loadHighScore, saveHighScore } from './src/ui/storage';
import { useGameLoop } from './src/ui/useGameLoop';

type Mode = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

const STICK_HEIGHT = 160;
const HUD_HEIGHT = 96;

/** Dokunsal geri bildirim isteğe bağlıdır; desteklenmeyen cihazda sessizce geçilir. */
function buzz(run: () => Promise<void>) {
  run().catch(() => undefined);
}

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

  const [mode, setMode] = useState<Mode>('menu');
  const [frame, setFrame] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hud, setHud] = useState({ level: 1, score: 0, lives: START_LIVES, percent: 0 });
  const [summary, setSummary] = useState({ level: 1, percent: 0, score: 0, bonus: 0 });

  useEffect(() => {
    let cancelled = false;
    loadHighScore().then((value) => {
      if (!cancelled) setHighScore(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
          case 'death':
            buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
            break;
          case 'level-clear':
            buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
            setSummary({
              level: event.level,
              percent: event.percent,
              score: game.score,
              bonus: event.bonus,
            });
            setMode('levelClear');
            break;
          case 'game-over': {
            const finalScore = event.score;
            setSummary({
              level: event.level,
              percent: game.percent,
              score: finalScore,
              bonus: 0,
            });
            setMode('gameOver');
            setHighScore((previous) => {
              if (finalScore <= previous) return previous;
              saveHighScore(finalScore);
              return finalScore;
            });
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
        setHud({
          level: game.level,
          score: game.score,
          lives: game.lives,
          percent: game.percent,
        });
      }
    },
    [game]
  );

  useGameLoop(step, mode === 'playing');

  const handleInput = useCallback((input: Input) => {
    inputRef.current = input;
  }, []);

  const handleDive = useCallback((held: boolean) => {
    divingRef.current = held;
  }, []);

  const syncHud = useCallback(() => {
    setHud({ level: game.level, score: game.score, lives: game.lives, percent: game.percent });
  }, [game]);

  const startGame = useCallback(() => {
    inputRef.current = NEUTRAL;
    divingRef.current = false;
    game.start();
    syncHud();
    setMode('playing');
  }, [game, syncHud]);

  const continueToNextLevel = useCallback(() => {
    inputRef.current = NEUTRAL;
    divingRef.current = false;
    game.nextLevel();
    syncHud();
    setMode('playing');
  }, [game, syncHud]);

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

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Hud
        mission={missionFor(hud.level).name}
        score={hud.score}
        highScore={highScore}
        lives={hud.lives}
        percent={hud.percent}
        target={game.targetPercent}
        onPause={pause}
      />

      <View style={styles.field}>
        <GameCanvas game={game} cell={cell} frame={frame} />
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
          subtitle="Küçültülmüş bir geminin kaptanısın."
          story={STORY_LINES}
          hint={`${MISSION_BRIEF} Alanın %${game.targetPercent} kadarını temizleyince görev tamamlanır. Yön için ekrana dokunup sürükle, ışın için sağdaki tuşu basılı tut.`}
          primary={{ label: 'GÖREVE BAŞLA', onPress: startGame }}
        />
      ) : null}

      {mode === 'paused' ? (
        <Overlay
          title="BEKLEMEDE"
          subtitle={missionFor(hud.level).name}
          rows={[
            { label: 'Temizlenen', value: `%${hud.percent.toFixed(1)}` },
            { label: 'Puan', value: hud.score.toLocaleString('tr-TR') },
            { label: 'Kalan gemi', value: String(hud.lives) },
          ]}
          primary={{ label: 'DEVAM ET', onPress: resume }}
          secondary={{ label: 'YENİDEN BAŞLA', onPress: startGame }}
        />
      ) : null}

      {mode === 'levelClear' ? (
        <Overlay
          title="DOKU TEMİZ"
          subtitle={`Sıradaki görev: ${missionFor(summary.level + 1).name}. ${missionFor(summary.level + 1).hint}`}
          rows={[
            { label: 'Temizlenen', value: `%${summary.percent.toFixed(1)}` },
            { label: 'Görev primi', value: `+${summary.bonus.toLocaleString('tr-TR')}` },
            { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
          ]}
          primary={{ label: 'SONRAKİ GÖREV', onPress: continueToNextLevel }}
        />
      ) : null}

      {mode === 'gameOver' ? (
        <Overlay
          title="FİLO TÜKENDİ"
          subtitle={
            summary.score >= highScore && summary.score > 0
              ? 'Yeni rekor! Hasta bir süre daha dayanacak.'
              : 'Patojen dokuyu ele geçirdi.'
          }
          rows={[
            { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
            { label: 'Ulaşılan görev', value: missionFor(summary.level).name },
            { label: 'Rekor', value: highScore.toLocaleString('tr-TR') },
          ]}
          primary={{ label: 'YENİDEN GÖREVE', onPress: startGame }}
          secondary={{ label: 'ANA EKRAN', onPress: goToMenu }}
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
