# Story of Emergence – Project Brief

Story of Emergence is a private encrypted journal and personal knowledge hub.  
It is fully client side encrypted. Only ciphertext is stored in Supabase.

Stack:
- Next.js App Router on React
- RainbowKit + Wagmi for wallet connect on Base Sepolia
- Supabase (RLS enabled)
- AES GCM encryption in the browser using a key derived from a wallet consent signature

Current status:
- Wallet connect works
- Consent signature flows and derives AES key in browser
- AES key cached in sessionStorage
- All encryption and decryption run client side
- Only ciphertext stored in Supabase
- entries table has soft delete (deleted_at)
- RPC functions implemented:
  list_entries, insert_entry, soft_delete_entry, restore_entry, hard_delete_entry
- internal_events table and RPCs:
  insert_internal_event, list_internal_events, list_internal_events_by_range
- RLS configured so wallet-scoped access is enforced (entries + internal_events)
- UI implemented:
  textarea, save, load/decrypt list, delete, restore, auto-load on connect, toasts, loading/empty states

Phase One: Complete
✓ Internal events table + RPCs
✓ Wallet-scoped RLS fully enforced
✓ Weekly insights engine (computeWeeklyInsights)
✓ Insights UI with connected, loading, empty, and main card states
✓ Previous weeks view
✓ Cursor refactor of insights/page.tsx
✓ Final design option chosen (A)

Next steps (Phase Two):
1. Local multi-draft system (save unfinished drafts in localStorage)
2. JSON export of decrypted reflections (client-side only)
3. Evolution views (Summary, Timeline, Topics)
4. Prepare for Insight Engine step zero (topic drift, spikes)

