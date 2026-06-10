'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import MatrixRain from '../components/MatrixRain';
import BootSequence from '../components/BootSequence';
import TerminalConsole from '../components/TerminalConsole';
import MemoryColumn, { MemoryItem } from '../components/MemoryColumn';

// Pre-populated mock data to seed database if empty
const INITIAL_MEMORIES = [
  // Short-Term RAM
  {
    content: 'Llamar al cliente X hoy a las 15h',
    category: 'SHORT',
    status: 'ACTIVE'
  },
  {
    content: 'Comprar café y snacks de recarga',
    category: 'SHORT',
    status: 'ACTIVE'
  },
  {
    content: 'Sincronizar webhook de Telegram bot con NeonCortex API',
    category: 'SHORT',
    status: 'COMPLETED'
  },
  // Medium-Term Cache
  {
    content: 'Turno médico con oculista',
    category: 'MEDIUM',
    target_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE'
  },
  {
    content: 'Vencimiento factura de servidor VPS Cloud',
    category: 'MEDIUM',
    target_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE'
  },
  {
    content: 'Recital de rock alternativo',
    category: 'MEDIUM',
    target_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE'
  },
  // Long-Term Hard Drive Vault
  {
    content: 'OKR Personal 2026: Aprender Rust, WebAssembly y construir microservicios descentralizados.',
    category: 'LONG',
    status: 'ACTIVE'
  },
  {
    content: 'Historial Clínico Vital: Alergia severa a la penicilina, Grupo sanguíneo O positivo.',
    category: 'LONG',
    status: 'ACTIVE'
  },
  {
    content: 'Directriz de vida: Mantener el foco en la simplicidad, la modularidad y el minimalismo mental.',
    category: 'LONG',
    status: 'ACTIVE'
  }
];

export default function Home() {
  const [booting, setBooting] = useState<boolean>(true);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [time, setTime] = useState<string>('00:00:00');
  const [status, setStatus] = useState<string>('SYSTEM_READY');

  // Load state from SQLite database on mount
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const res = await fetch('/api/memories');
        const data = await res.json();
        
        if (data && data.length > 0) {
          setMemories(data);
        } else {
          // Database is empty, seed it with initial mockup data
          setStatus('SEEDING_DATABASE...');
          const seeded: MemoryItem[] = [];
          for (const item of INITIAL_MEMORIES) {
            const postRes = await fetch('/api/memories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            const created = await postRes.json();
            seeded.push(created);
          }
          setMemories(seeded);
          setStatus('SEEDING_COMPLETE');
        }
      } catch (error) {
        console.error('Failed to load memories from SQLite API:', error);
        setStatus('DB_OFFLINE');
      }
    };

    fetchMemories();

    // Prevent re-boot loader loops on browser hot-reloads during dev
    const sessionBooted = sessionStorage.getItem('neoncortex_booted');
    if (sessionBooted === 'true') {
      setBooting(false);
    }
  }, []);

  // Digital clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // API HTTP Handlers
  const handleAddItem = async (category: 'SHORT' | 'MEDIUM' | 'LONG', content: string, targetDate?: string) => {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category, target_date: targetDate }),
      });
      const created = await res.json();
      setMemories((prev) => [created, ...prev]);
      setStatus(`SECTOR_ALLOCATED_${category}`);
    } catch (error) {
      console.error('Error adding memory node:', error);
      setStatus('ALLOCATION_ERROR');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const item = memories.find((m) => m.id === id);
    if (!item) return;

    const nextStatus = item.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';

    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const updated = await res.json();
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setStatus('SECTOR_MUTATED_STATE');
    } catch (error) {
      console.error('Error toggling memory status:', error);
      setStatus('MUTATE_ERROR');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setStatus('SECTOR_DEALLOCATED');
    } catch (error) {
      console.error('Error deleting memory node:', error);
      setStatus('DEALLOCATE_ERROR');
    }
  };

  const handleEditItem = async (id: string, newContent: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const updated = await res.json();
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setStatus('SECTOR_VAULT_MODIFIED');
    } catch (error) {
      console.error('Error editing memory node:', error);
      setStatus('VAULT_MODIFY_ERROR');
    }
  };

  // Promotion / Consolidation handler
  const handlePromoteItem = async (id: string, category: 'SHORT' | 'MEDIUM' | 'LONG', targetDate?: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, target_date: targetDate || null }),
      });
      const updated = await res.json();
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setStatus(`SECTOR_CONSOLIDATED_${category}`);
    } catch (error) {
      console.error('Error consolidating memory node:', error);
      setStatus('CONSOLIDATION_ERROR');
    }
  };

  // CLI Command Parser with neural consolidation support (/promote)
  const handleTerminalCommand = (cmdString: string): { success: boolean; message: string } => {
    // Parser for "/ram [text]"
    if (cmdString.startsWith('/ram ')) {
      const content = cmdString.substring(5).trim();
      if (!content) return { success: false, message: 'RAM content cannot be empty.' };
      handleAddItem('SHORT', content);
      return { success: true, message: `Node assigned to RAM: "${content}"` };
    }

    // Parser for "/cache [days] [text]"
    if (cmdString.startsWith('/cache ')) {
      const rawArgs = cmdString.substring(7).trim();
      const match = rawArgs.match(/^(\d+)\s+(.+)$/);
      if (!match) return { success: false, message: 'Invalid format. Use: /cache [days] [content]' };
      
      const days = parseInt(match[1]);
      const content = match[2].trim();
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      handleAddItem('MEDIUM', content, targetDate.toISOString());
      return { success: true, message: `Scheduled in Cache (T-${days}d): "${content}"` };
    }

    // Parser for "/hdd [text]"
    if (cmdString.startsWith('/hdd ')) {
      const content = cmdString.substring(5).trim();
      if (!content) return { success: false, message: 'Hard Drive content cannot be empty.' };
      handleAddItem('LONG', content);
      return { success: true, message: `Saved in Hard Disk Vault: "${content}"` };
    }

    // Neural Consolidation / Promotion:
    // Format: /promote "text search" hdd
    // Format: /promote "text search" cache [days]
    if (cmdString.startsWith('/promote ')) {
      const rawArgs = cmdString.substring(9).trim();
      const hddMatch = rawArgs.match(/^"([^"]+)"\s+hdd$/);
      const cacheMatch = rawArgs.match(/^"([^"]+)"\s+cache\s+(\d+)$/);

      if (hddMatch) {
        const query = hddMatch[1].toLowerCase();
        const found = memories.find((m) => m.content.toLowerCase().includes(query));
        if (!found) return { success: false, message: `No memory found matching "${query}".` };

        handlePromoteItem(found.id, 'LONG');
        return { success: true, message: `Consolidating memory: "${found.content}" -> HARD DISK` };
      } else if (cacheMatch) {
        const query = cacheMatch[1].toLowerCase();
        const days = parseInt(cacheMatch[2]);
        const found = memories.find((m) => m.content.toLowerCase().includes(query));
        if (!found) return { success: false, message: `No memory found matching "${query}".` };

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        handlePromoteItem(found.id, 'MEDIUM', targetDate.toISOString());
        return { success: true, message: `Consolidating memory: "${found.content}" -> CACHE (T-${days}d)` };
      } else {
        return {
          success: false,
          message: 'Invalid promote format. Use: /promote "text" hdd  OR  /promote "text" cache [days]'
        };
      }
    }

    // Command parser for /help and /clear is handled locally inside TerminalConsole,
    // so if a command reaches here, it is unrecognized.
    return {
      success: false,
      message: `Command unrecognized: "${cmdString}". Type /help to see cognitive directives.`
    };
  };

  const handleBootComplete = () => {
    setBooting(false);
    sessionStorage.setItem('neoncortex_booted', 'true');
    setStatus('COGNITIVE_SYNC_ACTIVE');
  };

  // Filter items per category
  const ramItems = memories.filter((m) => m.category === 'SHORT');
  const cacheItems = memories.filter((m) => m.category === 'MEDIUM').sort((a, b) => {
    return new Date(a.target_date || '').getTime() - new Date(b.target_date || '').getTime();
  });
  const hddItems = memories.filter((m) => m.category === 'LONG');

  // Compute live diagnostics stats
  const activeRAMCount = ramItems.filter(r => r.status === 'ACTIVE').length;
  const ramLoadPercent = Math.min(100, activeRAMCount * 20);
  const activeCacheCount = cacheItems.filter(c => c.status === 'ACTIVE').length;
  const hddBytes = 148 + hddItems.length * 1.4;

  if (booting) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return (
    <main className={`${styles.container} fade-in`}>
      {/* Scanline CRT overlay effect */}
      <div className="scanline" />

      {/* Falling Matrix Code Canvas background */}
      <MatrixRain />

      {/* Header bar */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={`${styles.logoGlitch} glitch-text`} data-text="NEONCORTEX">NEONCORTEX</div>
          <span className={styles.version}>v0.1.0-alpha</span>
        </div>
        <div className={styles.statusDisplay}>
          <span className={styles.statusIndicator}></span>
          <span className={`${styles.statusText} terminal-glow`}>{status}</span>
        </div>
        <div className={styles.clock}>{time}</div>
      </header>

      {/* Hero Banner / Diagnostics */}
      <section className={`${styles.diagnostics} terminal-panel`}>
        <div className={styles.gridOverlay}></div>
        <div className={styles.diagContent}>
          <h2 className="terminal-glow">Neural Interface Diagnostics</h2>
          <p className={styles.diagDescription}>
            Sync link active (SQLite base). Monitoring active RAM registers, timeline Cache offsets, and Hard Drive vault nodes. Directives can be allocated via terminal or inline controls, and consolidated using /promote &quot;search text&quot; [cache/hdd].
          </p>
          <div className={styles.diagStats}>
            <div className={styles.statBox} style={{ borderColor: 'var(--matrix-green)' }}>
              <span className={styles.statLabel}>RAM LOAD</span>
              <span className={styles.statValue} style={{ color: 'var(--matrix-green)' }}>{ramLoadPercent}%</span>
            </div>
            <div className={styles.statBox} style={{ borderColor: 'var(--neon-purple)' }}>
              <span className={styles.statLabel}>CACHE EVENTS</span>
              <span className={styles.statValue} style={{ color: 'var(--neon-purple)' }}>{activeCacheCount} ACTIVE</span>
            </div>
            <div className={styles.statBox} style={{ borderColor: 'var(--neon-red)' }}>
              <span className={styles.statLabel}>HDD STORAGE</span>
              <span className={styles.statValue} style={{ color: 'var(--neon-red)' }}>{hddBytes.toFixed(1)} GB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Memory Dashboard Layout (3 columns) */}
      <div className={styles.dashboardGrid}>
        
        {/* Column A: RAM (SHORT) */}
        <MemoryColumn
          title="01 // RAM (SHORT_TERM)"
          category="SHORT"
          items={ramItems}
          color="var(--matrix-green)"
          glowColor="var(--matrix-green-glow)"
          panelClass=""
          onAddItem={(text) => handleAddItem('SHORT', text)}
          onToggleStatus={handleToggleStatus}
          onDeleteItem={handleDeleteItem}
        />

        {/* Column B: CACHE (MEDIUM) */}
        <MemoryColumn
          title="02 // CACHE (MEDIUM_TERM)"
          category="MEDIUM"
          items={cacheItems}
          color="var(--neon-purple)"
          glowColor="var(--neon-purple-glow)"
          panelClass="terminal-panel-purple"
          onAddItem={(text, date) => handleAddItem('MEDIUM', text, date)}
          onToggleStatus={handleToggleStatus}
          onDeleteItem={handleDeleteItem}
        />

        {/* Column C: DISCO DURO (LONG) */}
        <MemoryColumn
          title="03 // VAULT (LONG_TERM)"
          category="LONG"
          items={hddItems}
          color="var(--neon-red)"
          glowColor="var(--neon-red-glow)"
          panelClass="terminal-panel-red"
          onAddItem={(text) => handleAddItem('LONG', text)}
          onToggleStatus={handleToggleStatus}
          onDeleteItem={handleDeleteItem}
          onEditItem={handleEditItem}
        />

      </div>

      {/* CLI Command Console */}
      <footer style={{ marginTop: '0.5rem' }}>
        <TerminalConsole onCommand={handleTerminalCommand} />
      </footer>

      {/* Simple global animations stylesheet injected */}
      <style jsx global>{`
        .fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
