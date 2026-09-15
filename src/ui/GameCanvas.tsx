import {
  AlphaType,
  Canvas,
  Circle,
  ColorType,
  FilterMode,
  Group,
  Image as SkiaImage,
  MipmapMode,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { memo, useMemo, useRef } from 'react';

import type { Game } from '../engine/game';
import type { Enemy } from '../engine/types';
import { writeFieldPixels } from './gridImage';
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

  // Grid görüntüsü pahalı: yalnızca hücreler değiştiğinde (field.version artınca)
  // yeniden kodlanır, her karede değil.
  const cache = useRef<{ version: number; image: SkImage | null }>({ version: -1, image: null });
  if (cache.current.version !== field.version) {
    writeFieldPixels(field, pixels);
    const data = Skia.Data.fromBytes(pixels);
    cache.current = {
      version: field.version,
      image: Skia.Image.MakeImage(
        {
          width: field.w,
          height: field.h,
          colorType: ColorType.RGBA_8888,
          alphaType: AlphaType.Opaque,
        },
        data,
        field.w * 4
      ),
    };
  }
  const image = cache.current.image;

  const player = game.player;
  const px = (player.x + 0.5) * cell;
  const py = (player.y + 0.5) * cell;
  // Dokunulmazken gemi yanıp söner.
  const blink = game.invulnerable > 0 && Math.floor(frame / 5) % 2 === 0;

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <SkiaImage
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="fill"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
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
