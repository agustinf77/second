'use client';

import React, { useState } from 'react';
import { playClick, playHover } from '../utils/audio';

export interface MemoryItem {
  id: string;
  content: string;
  category: 'SHORT' | 'MEDIUM' | 'LONG';
  created_at: string;
  target_date?: string; // ISO string
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
}

interface MemoryColumnProps {
  title: string;
  category: 'SHORT' | 'MEDIUM' | 'LONG';
  items: MemoryItem[];
  color: string;
  glowColor: string;
  panelClass: string;
  onAddItem: (content: string, targetDate?: string) => void;
  onToggleStatus: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem?: (id: string, newContent: string) => void;
}

export default function MemoryColumn({
  title,
  category,
  items,
  color,
  glowColor,
  panelClass,
  onAddItem,
  onToggleStatus,
  onDeleteItem,
  onEditItem,
}: MemoryColumnProps) {
  const [newText, setNewText] = useState('');
  const [targetDays, setTargetDays] = useState('1'); // Default for Cache
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    playClick(900, 0.02);

    if (category === 'MEDIUM') {
      // Calculate target date based on days from now
      const days = parseInt(targetDays) || 1;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      onAddItem(newText, targetDate.toISOString());
    } else {
      onAddItem(newText);
    }

    setNewText('');
  };

  const handleStartEdit = (item: MemoryItem) => {
    playClick(1000, 0.02);
    setEditingId(item.id);
    setEditText(item.content);
  };

  const handleSaveEdit = (id: string) => {
    if (onEditItem && editText.trim()) {
      playClick(1100, 0.02);
      onEditItem(id, editText);
      setEditingId(null);
    }
  };

  // Helper to calculate days countdown for Cache
  const getCountdown = (targetDateStr?: string) => {
    if (!targetDateStr) return '';
    const diffTime = new Date(targetDateStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `VENCIDO (T + ${Math.abs(diffDays)}d)`;
    if (diffDays === 0) return 'T - HOY';
    return `T - ${diffDays} días`;
  };

  return (
    <section 
      className={`terminal-panel ${panelClass}`}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', flexGrow: 1 }}
    >
      {/* Column Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <span 
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 8px ${glowColor}`,
            display: 'inline-block',
          }}
        />
        <h3 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>{title}</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          [{items.length}]
        </span>
      </div>

      {/* Column Body / Items list */}
      <div
        style={{
          padding: '1.25rem',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          maxHeight: '380px',
        }}
      >
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', fontFamily: 'var(--font-mono)' }}>
            Sector de memoria vacío.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onMouseEnter={playHover}
              style={{
                border: `1px solid ${editingId === item.id ? color : 'var(--border-color)'}`,
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative',
                boxShadow: editingId === item.id ? `0 0 10px ${glowColor}` : 'none',
              }}
            >
              {editingId === item.id ? (
                // Edit mode (for Long-term/HDD mostly)
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      background: '#050505',
                      border: `1px solid ${color}`,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      padding: '0.4rem',
                      resize: 'vertical',
                      width: '100%',
                      outline: 'none',
                    }}
                    rows={2}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingId(null)}
                      className="cyber-button"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="cyber-button"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: color, color: color }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    {category === 'SHORT' && (
                      <input
                        type="checkbox"
                        checked={item.status === 'COMPLETED'}
                        onChange={() => {
                          playClick(1000, 0.02);
                          onToggleStatus(item.id);
                        }}
                        style={{
                          marginTop: '3px',
                          cursor: 'pointer',
                          accentColor: 'var(--matrix-green)',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        textDecoration: item.status === 'COMPLETED' ? 'line-through' : 'none',
                        color: item.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--text-primary)',
                        wordBreak: 'break-word',
                        fontFamily: category === 'SHORT' ? 'var(--font-sans)' : 'var(--font-mono)',
                      }}
                    >
                      {item.content}
                    </span>
                  </div>

                  {/* Metadata and action links */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem',
                      borderTop: '1px dashed rgba(0, 255, 65, 0.05)',
                      paddingTop: '0.25rem',
                    }}
                  >
                    {category === 'MEDIUM' && (
                      <span style={{ color, fontWeight: 'bold' }}>
                        {getCountdown(item.target_date)}
                      </span>
                    )}
                    {category === 'LONG' && (
                      <span style={{ color: 'var(--text-muted)' }}>PERSISTENTE</span>
                    )}
                    {category === 'SHORT' && (
                      <span>RAM STATE</span>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {category === 'LONG' && onEditItem && (
                        <button
                          onClick={() => handleStartEdit(item)}
                          style={{ background: 'none', border: 'none', color: '#82a885', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                          EDITAR
                        </button>
                      )}
                      <button
                        onClick={() => {
                          playClick(600, 0.03);
                          onDeleteItem(item.id);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        BORRAR
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Column Footer form to add items directly */}
      <form
        onSubmit={handleAddSubmit}
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={
              category === 'SHORT'
                ? 'Nueva tarea RAM...'
                : category === 'MEDIUM'
                ? 'Nuevo hito de timeline...'
                : 'Nueva directriz en HDD...'
            }
            value={newText}
            onChange={(e) => {
              setNewText(e.target.value);
              playClick(1200 + Math.random() * 200, 0.01);
            }}
            style={{
              background: '#050505',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '0.4rem',
              flexGrow: 1,
              outline: 'none',
            }}
          />
          {category === 'MEDIUM' && (
            <input
              type="number"
              min="1"
              max="999"
              value={targetDays}
              onChange={(e) => setTargetDays(e.target.value)}
              style={{
                background: '#050505',
                border: '1px solid var(--border-color)',
                color,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                padding: '0.4rem',
                width: '60px',
                textAlign: 'center',
                outline: 'none',
              }}
              title="Días a partir de hoy"
            />
          )}
        </div>
        <button
          type="submit"
          className="cyber-button"
          style={{ width: '100%', borderColor: color, color }}
        >
          {category === 'MEDIUM' ? 'Programar evento' : category === 'LONG' ? 'Sellar en Bóveda' : 'Asignar a RAM'}
        </button>
      </form>
    </section>
  );
}
