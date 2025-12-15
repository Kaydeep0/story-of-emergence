// Time window abstraction and utilities for temporal insight computation

export type TimeWindowKind = 'week' | 'month' | 'year' | 'lifetime';

export type TimeWindow = {
  label: string;
  start: Date;
  end: Date;
};

// ---------- Core helpers ----------

function normalizeToStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeToEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = normalizeToStartOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  return d;
}

function endOfWeek(start: Date): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return normalizeToEndOfDay(end);
}

// ---------- Window factories ----------

export function getWindowStartEnd(kind: TimeWindowKind, date = new Date(), tz?: string): TimeWindow {
  // Note: tz parameter is currently unused; keeping signature for future expansion.
  switch (kind) {
    case 'week': {
      const start = startOfWeek(date);
      const end = endOfWeek(start);
      return {
        label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        start,
        end,
      };
    }
    case 'month': {
      const start = normalizeToStartOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
      const end = normalizeToEndOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
      return {
        label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        start,
        end,
      };
    }
    case 'year': {
      const start = normalizeToStartOfDay(new Date(date.getFullYear(), 0, 1));
      const end = normalizeToEndOfDay(new Date(date.getFullYear(), 11, 31));
      return {
        label: `${date.getFullYear()}`,
        start,
        end,
      };
    }
    case 'lifetime':
    default: {
      const now = new Date();
      return {
        label: 'Lifetime',
        start: new Date(0),
        end: now,
      };
    }
  }
}

export function currentWeek(): TimeWindow {
  return getWindowStartEnd('week');
}

export function currentYear(): TimeWindow {
  return getWindowStartEnd('year');
}

export function previousYear(): TimeWindow {
  return getWindowStartEnd('year', new Date(new Date().getFullYear() - 1, 0, 1));
}

export function yearWindow(year: number): TimeWindow {
  return getWindowStartEnd('year', new Date(year, 0, 1));
}

export function lifetimeWindow(entries: Array<{ createdAt: string }>): TimeWindow {
  if (!entries.length) {
    return getWindowStartEnd('lifetime');
  }
  let earliest = new Date(entries[0].createdAt);
  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (d < earliest) earliest = d;
  }
  return { label: 'Lifetime', start: normalizeToStartOfDay(earliest), end: normalizeToEndOfDay(new Date()) };
}

// ---------- Event utilities ----------

type EventLike = {
  eventAt?: Date | string;
  createdAt?: Date | string;
  sourceId?: string;
  source_id?: string;
  [key: string]: any;
};

function getEventDate(ev: EventLike): Date | null {
  const val = ev.eventAt ?? ev.createdAt;
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function filterEventsByWindow<T extends EventLike>(events: T[], start: Date, end: Date): T[] {
  return events.filter((ev) => {
    const d = getEventDate(ev);
    return d ? d >= start && d <= end : false;
  });
}

export function groupByDay<T extends EventLike>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const ev of events) {
    const d = getEventDate(ev);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

export function groupBySource<T extends EventLike>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const ev of events) {
    const sourceId = (ev as any).sourceId ?? (ev as any).source_id;
    if (!sourceId) continue;
    if (!map.has(sourceId)) map.set(sourceId, []);
    map.get(sourceId)!.push(ev);
  }
  return map;
}

