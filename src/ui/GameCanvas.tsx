import {
  AlphaType,
  Canvas,
  ColorType,
  FillType,
  FilterMode,
  Image as SkiaImage,
  MipmapMode,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { memo, useMemo, useRef } from 'react';

import type { Game } from '../engine/game';
import type { Loadout } from '../engine/upgrades';
import { territoryOutline } from './contour';
import { enemyShapes, shipAngle, shipShapes, shotShapes } from './creatures';
import type { Shape } from './creatures';
import { writeBackgroundPixels } from './gridImage';
import { palette } from './palette';
import { ShapeNodes } from './SkiaShapes';

type Props = {
  game: Game;
  /** Bir hücrenin ekrandaki piksel boyu. */
  cell: number;
  /** Her karede artan sayaç; yeniden çizimi tetikler. */
  frame: number;
  /** Satın alınmış parçalar; gemide görünür. */
  loadout: Loadout;
};

export const GameCanvas = memo(function GameCanvas({ game, cell, frame, loadout }: Props) {
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
  const facing = useRef(-Math.PI / 2);
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
  const look = { x: player.x + 0.5, y: player.y + 0.5 };
  const time = frame / 60;
  facing.current = shipAngle(player.dx, player.dy, facing.current);

  // Dokunulmazken gemi yanıp söner; vurulduğunda patlama parıltısı çizilir.
  const blink = game.invulnerable > 0 && Math.floor(frame / 5) % 2 === 0;
  const crew: Shape[] = game.enemies.flatMap((enemy) => enemyShapes(enemy, look));
  for (const shot of game.shots) crew.push(...shotShapes(shot));
  if (game.phase === 'dying') {
    crew.push({ kind: 'circle', x: look.x, y: look.y, r: 4, color: palette.danger, alpha: 0.55 });
  } else {
    crew.push(
      ...shipShapes({
        x: look.x,
        y: look.y,
        angle: facing.current,
        time,
        beaming: player.drawing,
        loadout,
        shield: game.shield,
      }).map((shape) => (blink ? { ...shape, alpha: (shape.alpha ?? 1) * 0.4 } : shape))
    );
  }

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

      <ShapeNodes shapes={crew} cell={cell} />
    </Canvas>
  );
});
