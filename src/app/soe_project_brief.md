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

Phase 1.5: Local UX Enhancements
Status: complete

Includes
• Multi draft system with titles stored in localStorage  
• Inline rename for drafts with Enter and Escape behavior  
• Delete button support and safe active-draft switching  
• Updated JSON export with metadata, wallet prefix, and versioned filename  
• No Supabase changes or encryption-path changes  


Next steps (Phase Two):
1. Local multi-draft system (save unfinished drafts in localStorage)
2. JSON export of decrypted reflections (client-side only)
3. Evolution views (Summary, Timeline, Topics)
4. Prepare for Insight Engine step zero (topic drift, spikes)

## Cursor Agent Golden Rule

Agents must obey these rules at all times.

• They may only modify the files explicitly listed in the task description.
• They must never touch encryption logic, Supabase code, or RPC definitions.
• They must never change hook order inside React components except where the task explicitly says to.
• They must not edit README.md or soe_project_brief.md.
• They must keep each task scoped to one subsystem only:
  • Encryption and wallet
  • UI overlays and animation
  • Insights engine
  • External sources and sharing
• If a change produces new runtime errors or hook warnings, the task must stop and revert that file.
• Any animation work must respect a simple state sequence:
  • APPROACH → TRAVEL → UNLOCK → RESOLVE → ERROR
• Before finishing, agents must run `pnpm lint` and confirm there are no new errors.
