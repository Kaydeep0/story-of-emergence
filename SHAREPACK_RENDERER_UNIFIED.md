# Unified SharePack Renderer - Implementation Summary

## ✅ Completed: Single Renderer for All Contexts

### Created Universal Component

**File:** `src/app/lib/share/SharePackRenderer.tsx`

**Features:**
- Single component for all rendering contexts
- Three modes: `preview`, `png`, `viewer`
- Supports all lens types (weekly, summary, timeline, yearly, distributions, yoy, lifetime)
- No lens-specific logic - pure rendering
- Consistent layout across all contexts

### Mode Behaviors

1. **`mode="preview"`** (default)
   - Responsive Tailwind classes
   - Used in insight page preview blocks
   - Adapts to container size

2. **`mode="png"`**
   - Fixed dimensions with inline styles
   - Used for PNG export capture
   - Frame options: `square`, `story`, `landscape`
   - Includes `data-share-root="true"` for html-to-image

3. **`mode="viewer"`**
   - Responsive Tailwind classes (same as preview)
   - Used in received share open page
   - Consistent with preview but optimized for viewing

### Updated Files

1. **`src/app/lib/share/SharePackRenderer.tsx`** (NEW)
   - Universal renderer component
   - Handles all three modes
   - Supports all lens types

2. **`src/app/lib/share/renderSharePackPNG.tsx`**
   - Now wraps `SharePackRenderer` with `mode="png"`
   - Marked as deprecated wrapper

3. **`src/app/lib/share/renderSharePack.tsx`**
   - Now wraps `SharePackRenderer` with `mode="png"`
   - Returns JSX element for backward compatibility
   - Marked as deprecated wrapper

4. **`src/app/shared/wallet/[id]/page.tsx`**
   - Updated to detect SharePack vs artifact
   - Uses `SharePackRenderer` with `mode="viewer"` for SharePack
   - Falls back to JSON display for legacy artifacts

5. **`src/app/insights/components/ShareActionsBar.tsx`**
   - Hidden PNG renderer uses `SharePackRenderer` with `mode="png"`
   - Used for PNG export capture

6. **`src/app/insights/yearly/components/SharePackBuilder.tsx`**
   - Preview block uses `SharePackRenderer` with `mode="preview"`
   - Export card uses `SharePackRenderer` with `mode="png"`
   - Ensures preview matches export exactly

### Acceptance Criteria Status

✅ **Received share UI matches exported PNG layout closely**
- Both use same SharePackRenderer component
- PNG mode uses fixed dimensions, viewer mode uses responsive but same structure
- Visual consistency maintained

✅ **No lens specific rendering logic inside shared open routes**
- SharePackRenderer has no lens-specific conditionals
- All lens types render through same component
- Lens type only affects label text, not layout

✅ **One renderer for all contexts**
- Preview blocks: `mode="preview"`
- PNG capture: `mode="png"`
- Received share viewer: `mode="viewer"`

### Component API

```typescript
<SharePackRenderer 
  sharePack={sharePack}
  mode="preview" | "png" | "viewer"
  frame="square" | "story" | "landscape"  // Only for PNG mode
  className=""  // Optional additional classes
/>
```

### Rendering Structure

All modes render the same structure:
1. Header (Story of Emergence + Lens Label + Period)
2. One Sentence Summary
3. Archetype (if present)
4. Distribution Pattern (if not 'none')
5. Key Numbers (Frequency, Active Days, Spike Days, Concentration)
6. Top Moments (up to 3)
7. Mirror Insight (if present)
8. Footer (Privacy Label + Generated Date)

### Backward Compatibility

- Legacy `renderSharePack()` function still works (wraps SharePackRenderer)
- Legacy `SharePackPNGRenderer` still works (wraps SharePackRenderer)
- All existing code continues to function

### Next Steps (Optional)

1. Remove legacy wrapper functions after all code migrates
2. Add more frame options if needed
3. Add theme/styling variants if needed

