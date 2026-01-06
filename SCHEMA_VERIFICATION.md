# Schema Verification Report

## ✅ Active Code - CORRECT Table Names

### Files Using Correct Tables:

1. **`src/app/lib/entrySources.ts`**
   - ✅ Uses `entry_sources` table
   - ✅ Uses `entry_id` column (not `reflection_id`)
   - ✅ Uses `sources` table for source lookups

2. **`src/app/lib/sources.ts`**
   - ✅ Uses `sources` table
   - ✅ No references to `external_sources`

3. **`src/app/lib/reflectionLinks.ts`**
   - ✅ Uses `entry_sources` table
   - ✅ Uses `entry_id` column (not `reflection_id`)
   - ⚠️ Note: Still uses RPC `list_reflection_links` (may need migration)

4. **`src/app/lib/checkSourcesTable.ts`**
   - ✅ Checks for `sources` table

### Components Using Correct Functions:

- `src/app/components/LinkedSourcesBacklinks.tsx` - Uses `listSourcesForEntry` ✅
- `src/app/insights/components/InsightDrawer.tsx` - Uses `listSourcesForEntry`, `linkSourceToEntry` ✅
- `src/app/HomeClient.tsx` - Uses `listSources`, `linkSourceToEntry`, `unlinkSourceFromEntry` ✅
- `src/app/sources/page.tsx` - Uses `listSources`, `insertSource`, `deleteSource` ✅

## ⚠️ Legacy Files (Not Used in Active Code)

These files still reference old table names but are **NOT imported** by any active code:

1. **`src/app/lib/externalSources.ts`**
   - ❌ Uses `external_sources` table (old)
   - ⚠️ Only imported by `reflectionSources.ts` (also legacy)

2. **`src/app/lib/reflectionSources.ts`**
   - ❌ Uses `reflection_sources` table (old)
   - ❌ Uses `reflection_id` column (old)
   - ❌ Uses `external_sources` table (old)
   - ⚠️ Only imports from `externalSources.ts` (circular legacy dependency)

## Summary

✅ **All active code uses correct table names:**
- `sources` (not `external_sources`)
- `entry_sources` (not `reflection_sources`)
- `entry_id` (not `reflection_id`)

⚠️ **Legacy files exist but are unused:**
- `externalSources.ts` and `reflectionSources.ts` can be safely deleted or marked as deprecated

