// components/StarsBackground.jsx
import { useEffect, useRef } from 'react';

const StarsBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5,
      alpha: Math.random()
    }));

    const shootingStars = Array.from({ length: 3 }, () => ({
      x: -100,
      y: Math.random() * canvas.height,
      speed: Math.random() * 10 + 5,
      length: Math.random() * 50 + 50,
      active: false
    }));

    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw static stars
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
      });

      // Draw shooting stars
      shootingStars.forEach(star => {
        if (!star.active && Math.random() < 0.002) {
          star.active = true;
          star.x = -100;
          star.y = Math.random() * canvas.height;
        }

        if (star.active) {
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x + star.length, star.y + star.length/2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${star.active ? 1 : 0})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          star.x += star.speed;
          star.y += star.speed/2;

          if (star.x > canvas.width + 100) {
            star.active = false;
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 z-0" />;
};

export default StarsBackground;
