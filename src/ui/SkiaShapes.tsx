/**
 * Şekil listesini (src/ui/creatures) Skia düğümlerine çeviren ortak katman.
 * Oyun alanı ve hangardaki gemi önizlemesi aynı kodu kullanır.
 */
import { Circle, Path, Skia } from '@shopify/react-native-skia';

import type { Point, Shape } from './creatures';

/** Şekil listesindeki çokgeni Skia yoluna çevirir. */
export function polygonPath(points: Point[], cell: number) {
  const path = Skia.Path.Make();
  points.forEach((point, index) => {
    const x = point.x * cell;
    const y = point.y * cell;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.close();
  return path;
}

type Props = {
  shapes: Shape[];
  /** Bir hücrenin ekrandaki piksel boyu. */
  cell: number;
};

/** Daire ve çokgenleri sırayla çizer. */
export function ShapeNodes({ shapes, cell }: Props) {
  return (
    <>
      {shapes.map((shape, index) =>
        shape.kind === 'circle' ? (
          <Circle
            key={index}
            cx={shape.x * cell}
            cy={shape.y * cell}
            r={shape.r * cell}
            color={shape.color}
            opacity={shape.alpha ?? 1}
          />
        ) : (
          <Path
            key={index}
            path={polygonPath(shape.points, cell)}
            color={shape.color}
            opacity={shape.alpha ?? 1}
            style="fill"
          />
        )
      )}
    </>
  );
}
