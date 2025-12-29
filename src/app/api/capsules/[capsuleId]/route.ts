import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/capsules/[capsuleId]
 * Get a capsule by ID
 * Requires: x-wallet-address header (must be recipient or sender)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  const { capsuleId } = await params;

  if (!capsuleId) {
    return NextResponse.json({ error: 'Capsule ID required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    // Call RPC function to get capsule
    const { data, error } = await supabase.rpc('get_capsule', {
      p_capsule_id: capsuleId,
    });

    if (error) {
      console.error('[Capsules API] Get error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get capsule' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Capsule not found or access denied' },
        { status: 404 }
      );
    }

    const capsule = data[0];

    return NextResponse.json({
      capsuleId: capsule.capsule_id,
      createdAt: capsule.created_at,
      expiresAt: capsule.expires_at,
      sharePackChecksum: capsule.checksum,
      wrappedKey: capsule.wrapped_key,
      recipientPublicKey: capsule.recipient_pubkey,
      payload: capsule.ciphertext,
      senderWallet: capsule.sender_wallet,
    });
  } catch (err: any) {
    console.error('[Capsules API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/capsules/[capsuleId]
 * Revoke a capsule (delete it)
 * Requires: x-wallet-address header (must be sender)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  const { capsuleId } = await params;

  if (!capsuleId) {
    return NextResponse.json({ error: 'Capsule ID required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-wallet-address': walletAddress.toLowerCase(),
        },
      },
    });

    // Delete capsule (RLS will ensure only sender can delete)
    const { error } = await supabase
      .from('capsules')
      .delete()
      .eq('capsule_id', capsuleId)
      .eq('sender_wallet', walletAddress.toLowerCase());

    if (error) {
      console.error('[Capsules API] Delete error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to revoke capsule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Capsules API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

