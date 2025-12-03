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

export async function GET() {
  try {
    // Uses your existing RPC. If the RPC later changes, we only fix it here.
    const { data, error } = await supabase
  .from('internal_events')
  .select('*')
  .order('event_at', { ascending: false })
  .limit(50);

    

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

