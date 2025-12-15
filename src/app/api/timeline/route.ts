// src/app/api/timeline/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Small safety guard so we fail loudly in dev if env is missing
if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars for timeline route');
}

type SimpleEvent = {
  id: string;
  eventAt: string;
  eventType: string;
};

export async function GET(request: Request) {
  const routeName = '/api/timeline';
  const supabaseCallName = 'list_internal_events';

  try {
    // Verify env vars
    if (!url || !anonKey) {
      console.error(`[${routeName}] Missing Supabase env vars. URL: ${!!url}, AnonKey: ${!!anonKey}`);
      return NextResponse.json(
        { error: 'Server configuration error', events: [] },
        { status: 500 },
      );
    }

    // Extract wallet address from header for RLS-compliant query
    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    if (!walletAddress) {
      console.log(`[${routeName}] No wallet address, returning empty events`);
      return NextResponse.json({ events: [] });
    }

    // Create Supabase client with wallet header for RLS
    const supabase = createClient(url, anonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    console.log(`[${routeName}] Calling ${supabaseCallName} for wallet: ${walletAddress.slice(0, 8)}...`);

    // Uses RPC to respect Row Level Security policies
    const { data, error } = await supabase.rpc(supabaseCallName, {
      w: walletAddress.toLowerCase(),
      p_limit: 50,
      p_offset: 0,
    });

    if (error) {
      console.error(`[${routeName}] ${supabaseCallName} RPC error:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: error.message || 'RPC call failed', events: [] },
        { status: 500 },
      );
    }

    // Map each row to a SimpleEvent
    const events: SimpleEvent[] = (data ?? []).map((row: any) => {
      let eventType = 'unknown';

      // Parse ciphertext as JSON to extract event_type
      try {
        const parsed = JSON.parse(row.ciphertext);
        eventType = parsed.event_type ?? parsed.event_kind ?? 'unknown';
      } catch {
        // If parsing fails, keep eventType as 'unknown'
      }

      return {
        id: row.id,
        eventAt: row.event_at,
        eventType,
      };
    });

    // Sort by eventAt descending (most recent first)
    events.sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

    console.log(`[${routeName}] Successfully fetched ${events.length} events`);
    return NextResponse.json({ events });
  } catch (err: any) {
    console.error(`[${routeName}] Unexpected error:`, {
      message: err?.message,
      stack: err?.stack,
      supabaseCall: supabaseCallName,
    });
    return NextResponse.json(
      { error: 'Unexpected error loading timeline', events: [] },
      { status: 500 },
    );
  }
}
