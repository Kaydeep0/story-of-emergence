// src/app/api/timeline/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Small safety guard so we fail loudly in dev if env is missing
if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars for timeline route');
}

// This is a server-side Supabase client just for this route
const supabase = createClient(url, anonKey);

export async function GET(request: Request) {
  try {
    // Extract wallet address from header for RLS-compliant query
    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    // Uses RPC to respect Row Level Security policies
    const { data, error } = await supabase.rpc('list_internal_events', {
      w: walletAddress,
      p_limit: 50,
      p_offset: 0,
    });
    
    
    

    

    if (error) {
      console.error('[timeline] list_internal_events error', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      events: data ?? [],
    });
  } catch (err: any) {
    console.error('[timeline] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected error loading timeline' },
      { status: 500 },
    );
  }
}

