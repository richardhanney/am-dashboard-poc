import { useEffect, useRef, useState } from 'react';
import canvasConfetti from 'canvas-confetti';
import { IconButton, Snackbar, Tooltip } from '@mui/material';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';

const colors = ['#ff1493', '#9333ff', '#00b7ff', '#ff6b00', '#ffd600', '#00d084'];

// Render locally without blob workers; the prototype keeps its existing CSP.
const confetti = canvasConfetti.create(undefined, { resize: true, useWorker: false });

export default function CelebrateButton() {
  const animationFrame = useRef<number | null>(null);
  const end = useRef(0);
  const [quietCelebration, setQuietCelebration] = useState(false);

  useEffect(
    () => () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      confetti.reset();
    },
    [],
  );

  const celebrate = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setQuietCelebration(true);
      return;
    }

    // Clicking again restarts the three-second window without duplicating loops.
    end.current = Date.now() + 3 * 1000;
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
  };

  return (
    <>
      <div className="rail-celebration">
        <Tooltip title="Celebrate!" placement="right">
          <IconButton aria-label="Celebrate with confetti" onClick={celebrate}>
            <CelebrationOutlinedIcon />
          </IconButton>
        </Tooltip>
      </div>
      <Snackbar
        open={quietCelebration}
        message="Hooray! 🎉"
        autoHideDuration={1800}
        onClose={() => setQuietCelebration(false)}
      />
    </>
  );
}
