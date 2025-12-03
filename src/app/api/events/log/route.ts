import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars for /api/events/log route');
}

export async function POST(request: Request) {
  try {
    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet address header' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const type = body?.type as string | undefined;

    if (!type) {
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 },
      );
    }

    const supabase = createClient(url, anonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    const { data, error } = await supabase.rpc('log_internal_event', {
      wallet: walletAddress.toLowerCase(),
      event_type: type,
      ts: new Date().toISOString(),
    });

    if (error) {
      console.error('[events/log] log_internal_event error', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, event: data ?? null });
  } catch (err: any) {
    console.error('[events/log] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected error logging event' },
      { status: 500 },
    );
  }
}
