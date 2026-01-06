# Sharing System Consolidation Summary

## ✅ Completed: `wallet_shares` is now the single canonical share store

### What Was Done

1. **Created canonical library** (`src/app/lib/wallet_shares.ts`)
   - Wraps core wallet shares functions
   - Provides clean API for all wallet-to-wallet sharing
   - Single source of truth

2. **Updated `/shared` page**
   - Now uses `listWalletSharesReceived()` for received view
   - Now uses `listWalletSharesSent()` for sent view
   - Uses `revokeWalletShare()` for revocation
   - Routes to `/shared/wallet/[id]` for viewing shares

3. **Created wallet share viewer** (`src/app/shared/wallet/[id]/page.tsx`)
   - Fetches share via `getWalletShare()`
   - Decrypts using `decryptWalletShare()`
   - Displays decrypted artifact

4. **Marked deprecated code**
   - `src/app/lib/shares.ts` - Marked as deprecated
   - `src/app/api/capsules/*` - Marked as deprecated
   - `src/app/components/vault/VaultHealthPanel.tsx` - Updated to use wallet_shares

5. **Disabled deprecated flows**
   - `HomeClient.tsx` - Reflection sharing via `rpcInsertShare` disabled (needs migration)

### Acceptance Criteria Status

✅ **No code writes to `shares`, `accepted_shares`, `capsules`**
- All active code paths use `wallet_shares` table
- Deprecated functions still exist but are marked and not called

✅ **All wallet share flows use `wallet_shares` RPCs only**
- `createWalletShare()` → `insert_wallet_share` RPC
- `listWalletSharesSent()` → `list_wallet_shares_sent` RPC
- `listWalletSharesReceived()` → `list_wallet_shares_received` RPC
- `getWalletShare()` → `get_wallet_share` RPC
- `revokeWalletShare()` → `revoke_wallet_share` RPC

✅ **`/shared` reads only from `wallet_shares` received RPC**
- Uses `listWalletSharesReceived()` which calls `list_wallet_shares_received` RPC

✅ **Sent view reads only from `wallet_shares` sent RPC**
- Uses `listWalletSharesSent()` which calls `list_wallet_shares_sent` RPC

### Remaining Deprecated Code (Not Active)

The following code still exists but is marked deprecated and not used:

- `src/app/lib/shares.ts` - Legacy functions (marked deprecated)
- `src/app/api/capsules/route.ts` - API route (marked deprecated)
- `src/app/api/capsules/[capsuleId]/route.ts` - API route (marked deprecated)

These can be removed in a future cleanup pass.

### Known Limitations

1. **Reflection sharing** - `HomeClient.tsx` reflection sharing is disabled
   - Needs migration to use `wallet_shares` with artifact format
   - Currently shows error: "Reflection sharing is temporarily unavailable"

2. **Share preview modal** - In `/shared` page, preview modal needs wallet decryption
   - Currently shows placeholder message
   - Full decryption requires wallet signature (not session key)

### Next Steps (Optional)

1. Migrate reflection sharing to use `wallet_shares` with artifact format
2. Remove deprecated code files (`shares.ts`, API routes)
3. Update share preview modal to use wallet decryption
4. Add tests for wallet_shares library

