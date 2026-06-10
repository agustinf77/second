'use client';

import React, { useEffect, useRef } from 'react';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Characters definition (Matrix glyphs)
    const katakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890XYZ:+-*<>|';
    const alphabet = katakana.split('');

    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);

    // Initial drops y-positions
    let rainDrops: number[] = Array(columns).fill(1);

    // Handle columns count on resize
    const handleResizeColumns = () => {
      const newColumns = Math.floor(canvas.width / fontSize);
      if (newColumns > columns) {
        const diff = newColumns - columns;
        for (let i = 0; i < diff; i++) {
          rainDrops.push(Math.floor(Math.random() * -100)); // Start offscreen
        }
      }
      columns = newColumns;
    };
    window.addEventListener('resize', handleResizeColumns);

    const draw = () => {
      // Semi-transparent black background to create trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        // Pick random character
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];

        // Head of drop is brighter/greener-white, tail is darker green
        const isHead = Math.random() > 0.98;
        ctx.fillStyle = isHead ? '#ffffff' : '#00ff41';
        
        // Random opacity for extra texture
        if (!isHead && Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(0, 143, 37, 0.8)'; // Dimmer green
        }

        const x = i * fontSize;
        const y = rainDrops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Reset drop to top if it goes off screen with a random delay
        if (y > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }

        // Increment drop y-position
        rainDrops[i]++;
      }
    };

    const interval = setInterval(draw, 33); // ~30 FPS is perfect for retro terminal speed

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', handleResizeColumns);
      clearInterval(interval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: 0.06, // High readability, low distraction
      }}
    />
  );
}
