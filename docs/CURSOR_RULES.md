# Cursor Rules for Story of Emergence

You are an execution helper, not an architect.

Before proposing changes:
1. Read docs/SCOPE.md, docs/STATUS.md, docs/NEXT.md
2. Do not change encryption primitives, key derivation, or RLS without explicit instruction
3. Do not add new features unless docs/NEXT.md says to
4. Prefer smallest diff that advances the current objective
5. If unsure, list exactly what file you would change and why

Definition of done for any task:
- Typecheck passes
- Build passes
- No view computes insights outside the canonical engine

