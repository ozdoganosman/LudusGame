/**
 * Şekil listesini (src/ui/shapes) Skia düğümlerine çeviren ortak katman.
 * Oyun alanı, hangar önizlemesi ve ara sahne aynı kodu kullanır.
 */
import { Group, Path, Skia, TwoPointConicalGradient, vec } from '@shopify/react-native-skia';

import { MIN_STROKE_PX } from './shapes';
import type { Shape } from './shapes';

/** Şekli Skia yoluna çevirir (daire ya da çokgen/çizgi). */
export function shapePath(shape: Shape, cell: number) {
  const path = Skia.Path.Make();
  if (shape.kind === 'circle') {
    path.addCircle(shape.x * cell, shape.y * cell, Math.max(0, shape.r * cell));
    return path;
  }
  shape.points.forEach((point, index) => {
    if (index === 0) path.moveTo(point.x * cell, point.y * cell);
    else path.lineTo(point.x * cell, point.y * cell);
  });
  if (!shape.open) path.close();
  return path;
}

type Props = {
  shapes: Shape[];
  /** Bir hücrenin ekrandaki piksel boyu. */
  cell: number;
};

/** Şekilleri sırayla çizer: dolgu (degradeli olabilir), sonra kontur. */
export function ShapeNodes({ shapes, cell }: Props) {
  return (
    <>
      {shapes.map((shape, index) => {
        const path = shapePath(shape, cell);
        const open = shape.kind === 'poly' && shape.open === true;
        const gradient = shape.gradient;
        return (
          <Group key={index} opacity={shape.alpha ?? 1}>
            {!open ? (
              <Path path={path} color={shape.color} style="fill">
                {gradient ? (
                  <TwoPointConicalGradient
                    start={vec((gradient.fx ?? gradient.cx) * cell, (gradient.fy ?? gradient.cy) * cell)}
                    startR={0}
                    end={vec(gradient.cx * cell, gradient.cy * cell)}
                    endR={Math.max(0.01, gradient.r * cell)}
                    colors={[gradient.from, gradient.to]}
                  />
                ) : null}
              </Path>
            ) : null}
            {shape.stroke || open ? (
              <Path
                path={path}
                style="stroke"
                color={shape.stroke ?? shape.color}
                strokeWidth={Math.max(MIN_STROKE_PX, (shape.strokeWidth ?? 0.2) * cell)}
                strokeJoin="round"
                strokeCap="round"
              />
            ) : null}
          </Group>
        );
      })}
    </>
  );
}
