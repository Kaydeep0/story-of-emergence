'use client';

import { useState, useMemo } from 'react';
import type { ReflectionEntry } from '../../lib/insights/types';
import { MomentEntryModal } from '../../insights/yearly/components/MomentEntryModal';

interface ThreeMomentsProps {
  entries: ReflectionEntry[];
  topSpikeDate?: string;
  formatDate: (date: string) => string;
}

function sanitizeText(text: string): string | null {
  if (!text || text.length < 140) return null;
  
  // Exclude JSON
  if (text.trim().startsWith('{') || text.includes('"metadata"') || text.includes('"note":')) {
    return null;
  }
  
  // Exclude error strings
  if (text.toLowerCase().includes('unable to decrypt') || 
      text.toLowerCase().includes('checking') ||
      text.toLowerCase().includes('debug')) {
    return null;
  }
  
  // Clean and return
  return text.replace(/\{[^}]*\}/g, '').trim();
}

export function ThreeMoments({ entries, topSpikeDate, formatDate }: ThreeMomentsProps) {
  const [selectedMoment, setSelectedMoment] = useState<{ entryId: string; date: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const moments: Array<{ date: string; preview: string; entryId: string }> = [];

  // 1. Highest entry count day
  if (topSpikeDate) {
    const spikeEntries = entries.filter(e => {
      const entryDate = new Date(e.createdAt).toISOString().split('T')[0];
      return entryDate === topSpikeDate;
    });
    if (spikeEntries.length > 0 && spikeEntries[0].plaintext) {
      const cleaned = sanitizeText(spikeEntries[0].plaintext);
      if (cleaned) {
        moments.push({
          date: topSpikeDate,
          preview: cleaned.slice(0, 160) + (cleaned.length > 160 ? '...' : ''),
          entryId: spikeEntries[0].id,
        });
      }
    }
  }

  // 2. Mid-year entry
  if (entries.length > 0 && moments.length < 3) {
    const sorted = [...entries].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const midIndex = Math.floor(sorted.length / 2);
    const midEntry = sorted[midIndex];
    if (midEntry.plaintext) {
      const cleaned = sanitizeText(midEntry.plaintext);
      if (cleaned && !moments.some(m => m.entryId === midEntry.id)) {
        const date = new Date(midEntry.createdAt).toISOString().split('T')[0];
        moments.push({
          date,
          preview: cleaned.slice(0, 160) + (cleaned.length > 160 ? '...' : ''),
          entryId: midEntry.id,
        });
      }
    }
  }

  // 3. Most recent entry
  if (entries.length > 0 && moments.length < 3) {
    const sorted = [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const entry of sorted) {
      if (entry.plaintext) {
        const cleaned = sanitizeText(entry.plaintext);
        if (cleaned && !moments.some(m => m.entryId === entry.id)) {
          const date = new Date(entry.createdAt).toISOString().split('T')[0];
          moments.push({
            date,
            preview: cleaned.slice(0, 160) + (cleaned.length > 160 ? '...' : ''),
            entryId: entry.id,
          });
          break;
        }
      }
    }
  }

  // Create entriesById map for quick lookup
  const entriesById = useMemo(() => {
    const map: Record<string, ReflectionEntry> = {};
    entries.forEach(entry => {
      map[entry.id] = entry;
    });
    return map;
  }, [entries]);

  const handleMomentClick = (moment: { entryId: string; date: string }) => {
    setSelectedMoment(moment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMoment(null);
  };

  if (moments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold mb-3">Three moments</h3>
        <p className="text-sm text-white/60 text-center">
          No quotes surfaced this year. Your wrap is still valid. Keep writing and next year will have moments to revisit.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold mb-4">Three moments</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {moments.map((moment) => (
            <button
              key={moment.entryId}
              type="button"
              onClick={() => handleMomentClick(moment)}
              className="text-left rounded-lg border border-white/10 bg-black/30 p-3 hover:border-white/20 hover:bg-black/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
            >
              <div className="text-xs text-white/60 mb-2">{formatDate(moment.date)}</div>
              <p className="text-xs text-white/80 leading-relaxed mb-2">{moment.preview}</p>
              <div className="text-xs text-white/60 hover:text-white/80 transition-colors">
                View →
              </div>
            </button>
          ))}
          {moments.length < 3 && (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 flex items-center justify-center">
              <p className="text-xs text-white/50 text-center">
                {moments.length === 1 ? 'Keep writing for more moments.' : 'One more moment coming soon.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Moment Entry Modal */}
      <MomentEntryModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        moment={selectedMoment}
        entriesById={entriesById}
        formatDate={formatDate}
      />
    </>
  );
}

