# Weekly Lens Freeze Policy

**Effective Date:** January 2025

## Status: FROZEN

The Weekly lens (`/insights/weekly`) is **frozen** and considered a **trust surface**, not a playground.

## What This Means

Weekly lens is **locked** and should **not be modified** except for:

- ✅ **New insight recipes** - Adding new insight computation logic that generates cards
- ✅ **Bug fixes** - Critical bugs that prevent rendering or cause crashes
- ✅ **Security fixes** - Security vulnerabilities

## What Is NOT Allowed

The following changes are **prohibited**:

- ❌ **Window tweaks** - Changing calendar week boundaries, rolling windows, or time calculations
- ❌ **Filtering changes** - Modifying how events are filtered to the weekly window
- ❌ **UX micro-adjustments** - Empty state text changes, styling tweaks, layout modifications
- ❌ **Debug code** - Adding temporary logging or debug UI
- ❌ **Refactoring** - Code structure changes that don't add new functionality

## Rationale

Weekly lens has been stabilized through multiple iterations:

1. ✅ Calendar week window calculation (Monday 00:00 to next Monday 00:00)
2. ✅ Event filtering before passing to engine
3. ✅ Fallback card for baseline insights
4. ✅ Proper empty states for all scenarios
5. ✅ Clean UI without debug code

Further modifications risk:
- Breaking existing functionality
- Introducing regressions
- Creating confusion for users who rely on consistent behavior

## Exception Process

If a change is truly necessary:

1. **Document the reason** - Why is this change critical?
2. **Get approval** - Weekly changes require explicit approval
3. **Test thoroughly** - Ensure no regressions
4. **Update this document** - If the freeze policy changes

## Related Files

- `src/app/insights/weekly/page.tsx` - Weekly lens page
- `src/app/lib/insights/computeWeeklyArtifact.ts` - Weekly artifact computation
- `src/app/lib/insights/computeInsightsForWindow.ts` - Engine entry point

---

**Remember:** Weekly is a trust surface. Users depend on its consistent behavior. Treat it with respect.

