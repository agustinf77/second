'use client';

import React, { useEffect, useState } from 'react';
import { playClick, playSuccess, playBoot } from '../utils/audio';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  'SYSTEM BOOT: NEONCORTEX v0.1.0-alpha',
  '-----------------------------------------',
  'Initializing cognitive core processors...',
  '[ OK ] Kernel drivers loaded successfully.',
  '[ OK ] Mapping neural memory sectors...',
  '[ OK ] RAM: Short-Term cache link initialized.',
  '[ OK ] CACHE: Mid-Term timeline registry active.',
  '[ OK ] HARD DISK: Core encryption vault verified.',
  'Establishing secure webhook sync with Telegram bot...',
  '[ OK ] SSL Tunnel established. Endpoint active.',
  '-----------------------------------------',
  'NEONCORTEX ONLINE. Cognitive link secured.',
  'PRESS ANY KEY OR CLICK HERE TO INITIALIZE SYSTEM SYNC...'
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');

  // Start boot sound
  useEffect(() => {
    playBoot();
  }, []);

  // Typing effect
  useEffect(() => {
    if (currentLineIndex >= BOOT_LINES.length) {
      playSuccess();
      return;
    }

    const line = BOOT_LINES[currentLineIndex];
    if (charIndex < line.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prev) => prev + line[charIndex]);
        setCharIndex((prev) => prev + 1);
        // Play keyboard click sound
        playClick(1000 + Math.random() * 400, 0.01);
      }, 15 + Math.random() * 20); // Dynamic speed for realistic typing

      return () => clearTimeout(timeout);
    } else {
      // Line finished typing
      const timeout = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        setCurrentText('');
        setCharIndex(0);
        setCurrentLineIndex((prev) => prev + 1);
        playClick(800, 0.02); // Deeper click on newline
      }, 150); // Pause between lines

      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, charIndex]);

  const handleSkip = () => {
    playSuccess();
    onComplete();
  };

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#050505',
        color: '#00ff41',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        padding: '2rem',
        zIndex: 9999,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto',
      }}
    >
      {/* Scanline CRT simulation */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {visibleLines.map((line, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '0.4rem',
              color: line.includes('[ OK ]') ? '#00ff41' : line.includes('SYSTEM BOOT') ? '#ffffff' : '#82a885',
              textShadow: line.includes('SYSTEM BOOT') || line.includes('ONLINE') ? '0 0 8px var(--matrix-green)' : 'none',
              fontWeight: line.includes('SYSTEM BOOT') || line.includes('PRESS') ? 'bold' : 'normal',
            }}
          >
            {line}
          </div>
        ))}
        {currentLineIndex < BOOT_LINES.length && (
          <div style={{ color: '#00ff41' }}>
            {currentText}
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '15px',
                backgroundColor: '#00ff41',
                marginLeft: '4px',
                animation: 'blink 0.8s infinite',
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: '2rem',
        }}
      >
        [ CLICK ANYWHERE TO ACCESS COGNITIVE LINK / SKIP DIAGNOSTICS ]
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
