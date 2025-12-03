// src/app/api/summary/route.ts
// API route for summary insights - returns aggregated stats

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars for summary route');
}

export async function GET(request: Request) {
  try {
    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    if (!walletAddress) {
      return NextResponse.json({
        streak: 0,
        entries: 0,
        totalEvents: 0,
        lastActiveAt: null,
      });
    }

    // Create Supabase client with wallet header for RLS
    const supabase = createClient(url, anonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    // Fetch entry count
    const { data: entryCountData, error: entryError } = await supabase.rpc(
      'entry_count_for_wallet',
      { w: walletAddress.toLowerCase() }
    );

    // Fetch internal events count
    const { data: events, error: eventsError } = await supabase.rpc(
      'list_internal_events',
      {
        w: walletAddress.toLowerCase(),
        p_limit: 100,
        p_offset: 0,
      }
    );

    if (entryError) {
      console.error('[summary] entry_count_for_wallet error', entryError);
    }
    if (eventsError) {
      console.error('[summary] list_internal_events error', eventsError);
    }

    const entries = typeof entryCountData === 'number' ? entryCountData : 0;
    const totalEvents = Array.isArray(events) ? events.length : 0;

    // Calculate streak (placeholder - will be enhanced in future phases)
    // For now, streak = 0 (requires more sophisticated date analysis)
    const streak = 0;

    // Get last active timestamp
    let lastActiveAt: string | null = null;
    if (Array.isArray(events) && events.length > 0) {
      // Events are ordered by event_at DESC, so first one is most recent
      lastActiveAt = events[0]?.event_at ?? null;
    }

    return NextResponse.json({
      streak,
      entries,
      totalEvents,
      lastActiveAt,
    });
  } catch (err: any) {
    console.error('[summary] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected error loading summary' },
      { status: 500 }
    );
  }
}

