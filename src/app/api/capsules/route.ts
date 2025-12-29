import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/capsules
 * Create a new capsule
 * Requires: x-wallet-address header, capsule data in body
 */
export async function POST(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      capsuleId,
      ciphertext,
      wrappedKey,
      recipientPubkey,
      checksum,
      expiresAt,
    } = body;

    // Validate required fields
    if (!capsuleId || !ciphertext || !wrappedKey || !recipientPubkey || !checksum) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    // Call RPC function to insert capsule
    const { data, error } = await supabase.rpc('insert_capsule', {
      p_capsule_id: capsuleId,
      p_ciphertext: ciphertext,
      p_wrapped_key: wrappedKey,
      p_recipient_pubkey: recipientPubkey,
      p_checksum: checksum,
      p_expires_at: expiresAt || null,
    });

    if (error) {
      console.error('[Capsules API] Insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create capsule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ capsuleId: data });
  } catch (err: any) {
    console.error('[Capsules API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

