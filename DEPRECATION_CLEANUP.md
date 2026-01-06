# Deprecation Cleanup Summary

## ✅ Completed Cleanup

### Removed Files
1. **`src/app/api/capsules/route.ts`** - Deprecated API route for capsules table
2. **`src/app/api/capsules/[capsuleId]/route.ts`** - Deprecated API route for capsules table

### Removed/Deprecated Code
1. **`src/lib/sharing.ts`**:
   - Removed `AcceptedShare` type definition
   - Removed `AcceptedShareRow` type definition
   - Added deprecation comment

2. **`src/app/shared/page.tsx`**:
   - Updated `handleCopyLink` to use `/shared/wallet/[id]` instead of `/shared/open/[id]`
   - Fixed `handleRevokeShare` to use `WalletShareRow` instead of `ShareRow`

## ⚠️ Remaining Legacy Code (Backward Compatibility)

The following files remain for backward compatibility with old share links:

1. **`src/app/lib/shares.ts`** - Legacy share helpers
   - Used by `/shared/open/[id]` route for old share links
   - Marked as DEPRECATED in comments
   - Should not be used for new code

2. **`src/app/shared/open/page.tsx`** - Legacy capsule opening route
   - Handles old capsule URL format (`?capsule=...`)
   - Shows deprecation message to users

3. **`src/app/shared/open/[id]/page.tsx`** - Legacy share opening route
   - Handles old share links using `shares` table
   - Uses `rpcGetShare` from deprecated `shares.ts`

4. **`src/lib/sharing.ts`** - `buildCapsuleUrl` function
   - Not currently called anywhere
   - Generates deprecated capsule URLs
   - Can be removed if confirmed unused

## ✅ Active Code (Canonical)

All new sharing functionality uses:
- **`src/app/lib/wallet_shares.ts`** - Canonical wallet sharing library
- **`src/lib/walletShares.ts`** - Core wallet shares implementation
- **`/shared/wallet/[id]`** - Active share viewing route
- **`wallet_shares` table** - Active database table

## Verification

Run this command to verify no active usage of deprecated tables:
```bash
rg "accepted_shares|capsules|public\.shares" src --type ts --type tsx | grep -v "DEPRECATED\|deprecated\|wallet_shares\|//"
```

Expected: Only comments and legacy route handlers should remain.

## Next Steps (Optional)

1. **Monitor legacy routes**: Check if `/shared/open` routes are still accessed
2. **Remove legacy routes**: After confirming no old links exist, remove:
   - `src/app/shared/open/page.tsx`
   - `src/app/shared/open/[id]/page.tsx`
   - `src/app/lib/shares.ts`
3. **Remove unused functions**: Remove `buildCapsuleUrl` if confirmed unused

