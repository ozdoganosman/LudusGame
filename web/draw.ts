/** Şekil listesini Canvas2D'ye çizer; oyun alanı, hangar önizlemesi ve ara sahne kullanır. */
import { MIN_STROKE_PX } from '../src/ui/shapes';
import type { Gradient, Shape } from '../src/ui/shapes';

function radial(target: CanvasRenderingContext2D, g: Gradient, scale: number): CanvasGradient {
  const gradient = target.createRadialGradient(
    (g.fx ?? g.cx) * scale,
    (g.fy ?? g.cy) * scale,
    0,
    g.cx * scale,
    g.cy * scale,
    Math.max(0.01, g.r * scale)
  );
  gradient.addColorStop(0, g.from);
  gradient.addColorStop(1, g.to);
  return gradient;
}

/** Şekilleri (hücre biriminde) verilen ölçekle çizer. */
export function drawShapes(target: CanvasRenderingContext2D, shapes: Shape[], scale: number): void {
  target.lineJoin = 'round';
  target.lineCap = 'round';

  for (const shape of shapes) {
    target.globalAlpha = shape.alpha ?? 1;
    target.beginPath();
    const open = shape.kind === 'poly' && shape.open === true;

    if (shape.kind === 'circle') {
      target.arc(shape.x * scale, shape.y * scale, Math.max(0, shape.r * scale), 0, Math.PI * 2);
    } else {
      shape.points.forEach((point, index) => {
        if (index === 0) target.moveTo(point.x * scale, point.y * scale);
        else target.lineTo(point.x * scale, point.y * scale);
      });
      if (!open) target.closePath();
    }

    if (!open) {
      target.fillStyle = shape.gradient ? radial(target, shape.gradient, scale) : shape.color;
      target.fill();
    }
    if (shape.stroke || open) {
      target.lineWidth = Math.max(MIN_STROKE_PX, (shape.strokeWidth ?? 0.2) * scale);
      target.strokeStyle = shape.stroke ?? shape.color;
      target.stroke();
    }
  }
  target.globalAlpha = 1;
}
