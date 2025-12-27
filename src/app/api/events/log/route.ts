import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars for /api/events/log route');
}

export async function POST(request: Request) {
  const routeName = '/api/events/log';
  let requestBodySize = 0;
  let parsedBodyKeys: string[] = [];
  const supabaseCallName = 'log_internal_event';

  try {
    // Get request body size
    const bodyText = await request.text().catch(() => '');
    requestBodySize = bodyText.length;
    
    // Parse body
    let body: unknown = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
      parsedBodyKeys = body && typeof body === 'object' ? Object.keys(body) : [];
    } catch (parseError) {
      console.error(`[${routeName}] Failed to parse body:`, parseError);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const walletAddress = request.headers.get('x-wallet-address') ?? '';

    if (!walletAddress) {
      console.warn(`[${routeName}] Missing wallet address header. Body size: ${requestBodySize}, Body keys: ${parsedBodyKeys.join(', ')}`);
      return NextResponse.json(
        { error: 'Missing wallet address header' },
        { status: 400 },
      );
    }

    const type = body && typeof body === 'object' && 'type' in body && typeof body.type === 'string' ? body.type : undefined;

    if (!type) {
      console.warn(`[${routeName}] Missing event type. Body size: ${requestBodySize}, Body keys: ${parsedBodyKeys.join(', ')}`);
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 },
      );
    }

    // Verify env vars
    if (!url || !anonKey) {
      console.error(`[${routeName}] Missing Supabase env vars. URL: ${!!url}, AnonKey: ${!!anonKey}`);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      );
    }

    const supabase = createClient(url, anonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    console.log(`[${routeName}] Calling ${supabaseCallName} with wallet: ${walletAddress.slice(0, 8)}..., type: ${type}, body size: ${requestBodySize}`);

    const ts = body && typeof body === 'object' && 'ts' in body && typeof body.ts === 'string' 
      ? body.ts 
      : new Date().toISOString();
    
    const { data, error } = await supabase.rpc(supabaseCallName, {
      wallet: walletAddress.toLowerCase(),
      event_type: type,
      ts,
    });

    if (error) {
      console.error(`[${routeName}] ${supabaseCallName} RPC error:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        bodySize: requestBodySize,
        bodyKeys: parsedBodyKeys.join(', '),
      });
      return NextResponse.json(
        { error: error.message || 'RPC call failed' },
        { status: 500 },
      );
    }

    console.log(`[${routeName}] Successfully logged event: ${type}`);
    return NextResponse.json({ ok: true, event: data ?? null });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[${routeName}] Unexpected error:`, {
      message: error.message,
      stack: error.stack,
      bodySize: requestBodySize,
      bodyKeys: parsedBodyKeys.join(', '),
      supabaseCall: supabaseCallName,
    });
    return NextResponse.json(
      { error: 'Unexpected error logging event' },
      { status: 500 },
    );
  }
}
