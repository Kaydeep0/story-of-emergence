# Sharing System

## Canonical System

**Canonical sharing uses `wallet_shares` table and `SharePack` format.**

- **Table:** `public.wallet_shares`
- **Library:** `src/app/lib/wallet_shares.ts`
- **Format:** `SharePack` (defined in `sharePack.ts`)

All new sharing functionality must use `wallet_shares` and `SharePack`.

## Legacy Systems (Do Not Extend)

- `public.capsules` table - Legacy, read-only
- `public.shares` table - Legacy, read-only  
- `public.accepted_shares` table - Legacy, read-only

See `docs/SCOPE.md` for canonical sharing system declaration.
