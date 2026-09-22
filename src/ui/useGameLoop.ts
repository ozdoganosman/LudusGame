import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame tabanlı oyun döngüsü.
 * `active` false olduğunda döngü durur; tekrar açıldığında zaman sıfırdan sayılır,
 * böylece duraklatmadan dönüşte dev bir dt oluşmaz.
 */
export function useGameLoop(step: (dt: number) => void, active: boolean): void {
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!active) return;

    let handle = 0;
    let previous: number | null = null;

    const tick = (timestamp: number) => {
      const dt = previous === null ? 0 : (timestamp - previous) / 1000;
      previous = timestamp;
      if (dt > 0) stepRef.current(dt);
      handle = requestAnimationFrame(tick);
    };

    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [active]);
}
