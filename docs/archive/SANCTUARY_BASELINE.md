# Sanctuary Baseline Visual System

This document defines the visual foundation that makes the vault feel quieter. These rules apply before any customization or theming.

## A. Typography Rules

**Primary font role:** Interface-first, reading-second. The font serves navigation and structure more than long-form reading. It should feel neutral and unobtrusive.

**Max font weights allowed:** 
- Normal (400) for most text
- Medium (500) only for section headers
- Semibold (600) and above are forbidden

**Where emphasis is allowed:**
- Section headers (medium weight only)
- Active navigation states (subtle, not bold)
- Emphasis is NOT allowed in:
  - Body text
  - Labels
  - Metadata
  - Button text
  - Toast messages

**Guiding constraint:** Emphasis should feel rare. Most text should be normal weight. When something needs emphasis, use spacing or subtle color shifts, not weight.

## B. Spacing Rules

**Minimum vertical spacing between cards:** 24px (1.5rem). Cards should never feel cramped or stacked.

**Maximum content width:** 672px (max-w-2xl). Content should never stretch wider. This creates a reading-like column that feels contained, not sprawling.

**How dense information is allowed to become:**
- Cards can contain multiple pieces of information, but each piece must have breathing room
- No more than 3-4 related items per card without clear visual separation
- Lists should have minimum 12px gap between items
- Grid layouts should have minimum 16px gap between items

**Guiding constraint:** White space is not decoration. It is safety. Dense information creates cognitive load. Spacing reduces friction and allows the mind to settle.

## C. Color Discipline

**One base background tone:** Pure black (#000000) with subtle transparency overlays (bg-black/60, bg-black/40) for depth. No warm or cool tints.

**One text tone:** White with opacity variations:
- Primary text: text-white/90
- Secondary text: text-white/60
- Tertiary text: text-white/40
- No colored text except for temporary states

**One accent tone:** White/10 to white/20 for borders and subtle backgrounds. Used sparingly for structure, not emphasis.

**One temporary tone:** White/50 for hover states and active feedback. Appears only during interaction, disappears immediately after.

**Guiding constraint:** Color should never signal urgency or reward. No green for success, no red for warnings, no yellow for attention. Color exists for structure and hierarchy only, not for emotional signaling.

## D. Motion Rules

**Are animations allowed?** Yes, but only specific types.

**What kind only:**
- Subtle transitions on hover (opacity, background color)
- Smooth scrolling
- Fade-in for content appearance (very slow, 300ms+)
- No bounce, no slide, no scale, no rotation

**When should motion never appear:**
- On page load (no entrance animations)
- After actions (no success animations)
- In response to user input (no immediate feedback animations)
- For emphasis or attention (no pulsing, no flashing)
- During errors (no shake, no bounce)

**Guiding constraint:** Motion should feel like breathing, not signaling. If you notice the animation, it's too much. Motion should be imperceptible, creating a sense of calm flow rather than drawing attention.

## E. Interaction Tone

**Language rules for buttons and labels:**

**Prefer:**
- "Open" over "View"
- "Seal" over "Confirm" or "Save"
- "Remove" over "Delete"
- "Create artifact" over "Share"
- "Observe" over "Analyze"
- "Pattern" over "Trend"
- "Presence" over "Activity"

**Avoid:**
- Action verbs that imply urgency ("Complete", "Finish", "Submit")
- Success language ("Done!", "Success!", "Great job!")
- Performance language ("Improve", "Optimize", "Enhance")
- Social language ("Share with friends", "Post", "Publish")

**Guiding constraint:** Language should never pressure a next step. Buttons and labels should feel like invitations to explore, not demands to act. The vault waits. It never prompts.

---

## Application Notes

These rules apply to all UI elements:
- Cards and containers
- Navigation and tabs
- Buttons and interactive elements
- Typography and text hierarchy
- Spacing and layout
- Color and contrast
- Motion and transitions
- Language and copy

Any visual change must be evaluated against these rules. If it increases noise, urgency, or cognitive load, it violates the baseline.

