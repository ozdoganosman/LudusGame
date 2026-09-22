import { Canvas } from '@shopify/react-native-skia';

import { shipStats } from '../engine/upgrades';
import type { Loadout } from '../engine/upgrades';
import { shipShapes } from './creatures';
import { ShapeNodes } from './SkiaShapes';

type Props = {
  loadout: Loadout;
  width: number;
  height: number;
};

/** Hangardaki gemi önizlemesi: satın alınan parçalarla, burnu sağa dönük. */
export function ShipPreview({ loadout, width, height }: Props) {
  const cell = Math.min(width / 8, height / 5.4);
  const shapes = shipShapes({
    x: 4,
    y: 2.7,
    angle: 0,
    time: 0,
    beaming: false,
    loadout,
    shield: shipStats(loadout).shieldCharges,
  });

  return (
    <Canvas style={{ width, height }}>
      <ShapeNodes shapes={shapes} cell={cell} />
    </Canvas>
  );
}
