import { useCallback, useEffect, useRef } from 'react';
import canvasConfetti from 'canvas-confetti';

const colors = ['#ff1493', '#9333ff', '#00b7ff', '#ff6b00', '#ffd600', '#00d084'];
// Keep the existing local renderer and content-security policy; no blob workers.
const confetti = canvasConfetti.create(undefined, { resize: true, useWorker: false });

export default function useConfetti() {
  const animationFrame = useRef<number | null>(null);
  const end = useRef(0);
  useEffect(
    () => () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      confetti.reset();
    },
    [],
  );
  return useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    end.current = Date.now() + 3000;
    if (animationFrame.current !== null) return;
    let colorIndex = 0;
    const frame = () => {
      if (Date.now() > end.current) {
        animationFrame.current = null;
        return;
      }
      const options = {
        particleCount: 2,
        spread: 55,
        startVelocity: 60,
        colors: [colors[colorIndex], colors[(colorIndex + 1) % colors.length]],
        zIndex: 2000,
        disableForReducedMotion: true,
      };
      colorIndex = (colorIndex + 2) % colors.length;
      confetti({ ...options, angle: 60, origin: { x: 0, y: 0.5 } });
      confetti({ ...options, angle: 120, origin: { x: 1, y: 0.5 } });
      animationFrame.current = requestAnimationFrame(frame);
    };
    frame();
  }, []);
}
