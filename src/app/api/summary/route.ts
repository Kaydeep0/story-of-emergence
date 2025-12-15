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
  const routeName = '/api/summary';
  const supabaseCalls = ['entry_count_for_wallet', 'list_internal_events'];

  try {
    // Verify env vars
    if (!url || !anonKey) {
      console.error(`[${routeName}] Missing Supabase env vars. URL: ${!!url}, AnonKey: ${!!anonKey}`);
      return NextResponse.json(
        { error: 'Server configuration error', streak: 0, entries: 0, totalEvents: 0, lastActiveAt: null },
        { status: 500 }
      );
    }

    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    if (!walletAddress) {
      console.log(`[${routeName}] No wallet address, returning empty summary`);
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

    console.log(`[${routeName}] Fetching summary for wallet: ${walletAddress.slice(0, 8)}...`);

    // Fetch entry count
    const entryRpcName = supabaseCalls[0];
    const { data: entryCountData, error: entryError } = await supabase.rpc(
      entryRpcName,
      { w: walletAddress.toLowerCase() }
    );

    if (entryError) {
      console.error(`[${routeName}] ${entryRpcName} RPC error:`, {
        message: entryError.message,
        code: entryError.code,
        details: entryError.details,
        hint: entryError.hint,
      });
    }

    // Fetch internal events count
    const eventsRpcName = supabaseCalls[1];
    const { data: events, error: eventsError } = await supabase.rpc(
      eventsRpcName,
      {
        w: walletAddress.toLowerCase(),
        p_limit: 100,
        p_offset: 0,
      }
    );

    if (eventsError) {
      console.error(`[${routeName}] ${eventsRpcName} RPC error:`, {
        message: eventsError.message,
        code: eventsError.code,
        details: eventsError.details,
        hint: eventsError.hint,
      });
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

    console.log(`[${routeName}] Successfully fetched summary: ${entries} entries, ${totalEvents} events`);
    return NextResponse.json({
      streak,
      entries,
      totalEvents,
      lastActiveAt,
    });
  } catch (err: any) {
    console.error(`[${routeName}] Unexpected error:`, {
      message: err?.message,
      stack: err?.stack,
      supabaseCalls: supabaseCalls.join(', '),
    });
    return NextResponse.json(
      { error: 'Unexpected error loading summary', streak: 0, entries: 0, totalEvents: 0, lastActiveAt: null },
      { status: 500 }
    );
  }
}

