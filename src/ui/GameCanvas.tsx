import {
  AlphaType,
  Canvas,
  Circle,
  ColorType,
  FillType,
  FilterMode,
  Group,
  Image as SkiaImage,
  MipmapMode,
  Path,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { memo, useMemo, useRef } from 'react';

import type { Game } from '../engine/game';
import type { Enemy } from '../engine/types';
import { territoryOutline } from './contour';
import { writeBackgroundPixels } from './gridImage';
import { palette } from './palette';

type Props = {
  game: Game;
  /** Bir hücrenin ekrandaki piksel boyu. */
  cell: number;
  /** Her karede artan sayaç; yeniden çizimi tetikler. */
  frame: number;
};

export const GameCanvas = memo(function GameCanvas({ game, cell, frame }: Props) {
  const { field } = game;
  const width = field.w * cell;
  const height = field.h * cell;

  const pixels = useMemo(() => new Uint8Array(field.w * field.h * 4), [field]);

  // Zemin (boş alan + nokta dokusu) değişmez: bir kez kodlanır.
  const background = useMemo(() => {
    writeBackgroundPixels(field, pixels);
    const data = Skia.Data.fromBytes(pixels);
    return Skia.Image.MakeImage(
      {
        width: field.w,
        height: field.h,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Opaque,
      },
      data,
      field.w * 4
    );
  }, [field, pixels]);

  // Sınır çokgeni ve iz, hücreler değiştiğinde (field.version) yeniden kurulur;
  // her karede değil. İz de aynı sayaçla ilerler, çünkü iz hücreleri alana yazılır.
  const cache = useRef<{ version: number; cell: number; territory: SkPath | null; trail: SkPath | null }>({
    version: -1,
    cell: 0,
    territory: null,
    trail: null,
  });

  if (cache.current.version !== field.version || cache.current.cell !== cell) {
    const territory = Skia.Path.Make();
    for (const loop of territoryOutline(field)) {
      loop.forEach((point, index) => {
        const x = point.x * cell;
        const y = point.y * cell;
        if (index === 0) territory.moveTo(x, y);
        else territory.lineTo(x, y);
      });
      territory.close();
    }
    // Çift-tek kuralı: patronun sıkıştığı boşluk delik olarak kalır.
    territory.setFillType(FillType.EvenOdd);

    let trail: SkPath | null = null;
    if (game.trail.length > 0) {
      trail = Skia.Path.Make();
      game.trail.forEach((point, index) => {
        const x = (point.x + 0.5) * cell;
        const y = (point.y + 0.5) * cell;
        if (index === 0) trail?.moveTo(x, y);
        else trail?.lineTo(x, y);
      });
    }

    cache.current = { version: field.version, cell, territory, trail };
  }

  const territory = cache.current.territory;
  const trail = cache.current.trail;

  const player = game.player;
  const px = (player.x + 0.5) * cell;
  const py = (player.y + 0.5) * cell;
  // Dokunulmazken gemi yanıp söner.
  const blink = game.invulnerable > 0 && Math.floor(frame / 5) % 2 === 0;

  return (
    <Canvas style={{ width, height }}>
      {background ? (
        <SkiaImage
          image={background}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="fill"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
        />
      ) : null}

      {territory ? (
        <>
          <Path path={territory} color={palette.filled} style="fill" />
          <Path
            path={territory}
            color={palette.filledEdge}
            style="stroke"
            strokeWidth={Math.max(1, cell * 0.5)}
            strokeJoin="round"
          />
        </>
      ) : null}

      {trail ? (
        <Path
          path={trail}
          color={palette.trail}
          style="stroke"
          strokeWidth={cell}
          strokeCap="round"
          strokeJoin="round"
        />
      ) : null}

      {game.enemies.map((enemy) => (
        <EnemyMark key={enemy.id} enemy={enemy} cell={cell} />
      ))}

      {game.phase === 'dying' ? (
        <Circle cx={px} cy={py} r={cell * 4} color={palette.danger} opacity={0.5} />
      ) : (
        <Group opacity={blink ? 0.35 : 1}>
          <Circle cx={px} cy={py} r={cell * 2.6} color={palette.playerGlow} opacity={0.22} />
          <Circle cx={px} cy={py} r={cell * 1.5} color={palette.playerGlow} opacity={0.5} />
          <Circle cx={px} cy={py} r={cell * 0.9} color={palette.player} />
        </Group>
      )}
    </Canvas>
  );
});

const EnemyMark = memo(function EnemyMark({ enemy, cell }: { enemy: Enemy; cell: number }) {
  const cx = enemy.x * cell;
  const cy = enemy.y * cell;
  const radius = enemy.radius * cell;

  if (enemy.kind === 'boss') {
    return (
      <Group>
        <Circle cx={cx} cy={cy} r={radius * 1.9} color={palette.boss} opacity={0.18} />
        <Group origin={{ x: cx, y: cy }} transform={[{ rotate: enemy.spin }]}>
          <Rect
            x={cx - radius}
            y={cy - radius}
            width={radius * 2}
            height={radius * 2}
            color={palette.boss}
          />
        </Group>
        <Circle cx={cx} cy={cy} r={radius * 0.45} color={palette.text} />
      </Group>
    );
  }

  const color = enemy.kind === 'hunter' ? palette.hunter : palette.drifter;

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={radius * 1.7} color={color} opacity={0.18} />
      {enemy.kind === 'hunter' ? (
        <Group origin={{ x: cx, y: cy }} transform={[{ rotate: enemy.spin }]}>
          <RoundedRect
            x={cx - radius}
            y={cy - radius}
            width={radius * 2}
            height={radius * 2}
            r={radius * 0.4}
            color={color}
          />
        </Group>
      ) : (
        <Circle cx={cx} cy={cy} r={radius} color={color} />
      )}
    </Group>
  );
});
