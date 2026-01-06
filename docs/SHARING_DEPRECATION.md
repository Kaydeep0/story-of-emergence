# Sharing System Deprecation

## Canonical System: `wallet_shares`

**Status:** ✅ **ACTIVE** - Use this for all wallet-to-wallet sharing.

**Library:** `src/app/lib/wallet_shares.ts`

**Table:** `public.wallet_shares`

**RPCs:**
- `insert_wallet_share` - Create a new share
- `list_wallet_shares_sent` - List shares sent by wallet
- `list_wallet_shares_received` - List shares received by wallet
- `get_wallet_share` - Get a specific share by ID
- `revoke_wallet_share` - Revoke a share

## Deprecated Systems

### ❌ `shares` table

**Status:** DEPRECATED - Do not use.

**Library:** `src/app/lib/shares.ts` (marked deprecated)

**RPCs:** `insert_share`, `list_shares_by_owner`, `list_shares_by_recipient`, `get_share`

**Migration:** All code should use `wallet_shares` instead.

### ❌ `accepted_shares` table

**Status:** DEPRECATED - Do not use.

**RPCs:** `insert_accepted_share`, `list_accepted_shares`, `delete_accepted_share`

**Migration:** Not needed - `wallet_shares` handles recipient access directly.

### ❌ `capsules` table

**Status:** DEPRECATED - Do not use.

**API Routes:** `/api/capsules` (marked deprecated)

**RPCs:** `insert_capsule`, `get_capsule`

**Migration:** Use `wallet_shares` instead.

## Migration Checklist

- [x] Created canonical `wallet_shares.ts` library
- [x] Updated `/shared` page to use `wallet_shares` RPCs
- [x] Marked deprecated tables in code comments
- [x] Updated `HomeClient.tsx` - disabled deprecated `rpcInsertShare` (reflection sharing needs migration)
- [x] `ShareActionsBar.tsx` already uses `ShareToWalletDialog` which uses `wallet_shares`
- [x] Marked API routes (`/api/capsules`) as deprecated
- [x] Updated `VaultHealthPanel.tsx` to use `wallet_shares`
- [x] Created `/shared/wallet/[id]` page for viewing wallet shares

## Acceptance Criteria

- ✅ No code writes to `shares`, `accepted_shares`, `capsules`
- ✅ All wallet share flows use `wallet_shares` RPCs only
- ✅ `/shared` reads only from `wallet_shares` received RPC
- ✅ Sent view reads only from `wallet_shares` sent RPC

