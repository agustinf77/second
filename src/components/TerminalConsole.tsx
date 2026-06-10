'use client';

import React, { useState, useRef, useEffect } from 'react';
import { playClick, playError, playSuccess } from '../utils/audio';

interface TerminalConsoleProps {
  onCommand: (command: string) => { success: boolean; message: string };
}

interface LogEntry {
  text: string;
  type: 'input' | 'output' | 'error' | 'system';
}

export default function TerminalConsole({ onCommand }: TerminalConsoleProps) {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: 'NEONCORTEX SYSTEM SHELL v0.1.0', type: 'system' },
    { text: 'Type /help to list available cognitive directives.', type: 'system' },
  ]);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to bottom when logs change
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Add input command to logs
    setLogs((prev) => [...prev, { text: `> ${trimmedInput}`, type: 'input' }]);

    if (trimmedInput.toLowerCase() === '/clear') {
      playSuccess();
      setLogs([]);
      setInput('');
      return;
    }

    if (trimmedInput.toLowerCase() === '/help') {
      playSuccess();
      setLogs((prev) => [
        ...prev,
        { text: 'Available commands:', type: 'system' },
        { text: '  /ram [content]            - Add temporary memory node to RAM (expires 24-72h)', type: 'system' },
        { text: '  /cache [days] [content]   - Schedule mid-term event in Cache timeline', type: 'system' },
        { text: '  /hdd [content]            - Save permanent life directive/OKR to Hard Drive', type: 'system' },
        { text: '  /clear                    - Clear terminal output buffer', type: 'system' },
      ]);
      setInput('');
      return;
    }

    // Process other commands via parent
    const result = onCommand(trimmedInput);
    if (result.success) {
      playSuccess();
      setLogs((prev) => [...prev, { text: result.message, type: 'output' }]);
    } else {
      playError();
      setLogs((prev) => [...prev, { text: `ERROR: ${result.message}`, type: 'error' }]);
    }

    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    playClick(1100 + Math.random() * 300, 0.015);
  };

  return (
    <div
      style={{
        background: '#070a07',
        border: '1px solid var(--border-color)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        height: '240px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Console Top Window Bar */}
      <div
        style={{
          background: 'rgba(0, 255, 65, 0.08)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0.35rem 0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--matrix-green)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          NEONCORTEX_CONSOLE // CMD_PROMPT
        </span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--matrix-green)' }}></span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }}></span>
        </div>
      </div>

      {/* Logs Window */}
      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {logs.map((log, index) => {
          let color = 'var(--text-secondary)';
          if (log.type === 'input') color = '#ffffff';
          if (log.type === 'output') color = 'var(--matrix-green)';
          if (log.type === 'error') color = 'var(--neon-red)';
          if (log.type === 'system') color = '#82a885';

          return (
            <div key={index} style={{ color, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {log.text}
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>

      {/* Command Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0.4rem 0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ color: 'var(--matrix-green)', marginRight: '0.5rem', fontWeight: 'bold' }}>&gt;</span>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="ENTER COMMAND: /ram, /cache, /hdd, /help..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--matrix-green)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            width: '100%',
          }}
        />
      </form>
    </div>
  );
}
