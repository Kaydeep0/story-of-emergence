Story of Emergence

Story of Emergence is a privacy-first, client-side encrypted personal knowledge system built with Next.js.
All reflections, insights, and shared content are encrypted locally using AES-GCM, and only ciphertext is stored in Supabase.

This repository contains the full web application, including the encrypted journaling engine, insights pipeline, and shared content capsule system.

Tech Stack

Next.js 15 (App Router + Turbopack)

Supabase (database + row-level security)

Client-side AES-GCM encryption

RainbowKit + Wagmi (wallet auth and signature-based key derivation)

TypeScript

React server components

Getting Started

Install dependencies:

pnpm install


Run the development server:

pnpm dev


Then open:

http://localhost:3000


The app will auto-reload as you edit files.

Project Structure
src/
  app/
    reflections/
    insights/
    shared/
    api/
  lib/
    crypto/
    insights/
    contacts/
    entries/
  supabase/
    migrations/
public/


Key directories:

src/app — UI routes for Reflections, Insights, Shared tab, capsules

src/lib — encryption logic, RPC wrappers, insights engine, contacts system

supabase/migrations — SQL migrations and RLS policies

public — static assets

Core Features
1. Client-side Encryption

All journaling data and shared content is encrypted before leaving the browser.

Encryption keys are derived from:

Wallet signature

Session-scoped consent flow

AES-GCM with versioned envelopes

2. Encrypted Contacts

Every contact label (names for shared senders) is encrypted uniquely per user.

3. Shared Capsules

Users can share encrypted slices of their data with others.

Capsules include:

Wrapped content keys

Sender wallet metadata

Expiration settings

Client-side verification

4. Insight Engine (Phase 1)

Local analytics that compute:

Timeline spikes

Always-on summaries

Cross-reflection link patterns

Topics (in future phases)

All insights are computed on device and never leave the browser.

Deployment

Deploy to Vercel:

vercel


Or connect the repo via the Vercel dashboard.

Development Server Guide (Important)

Story of Emergence must always run on port 3000.
If Next.js switches to 3001, 3002, or 3003, the dev server was already running in the background.

Start the dev server
pnpm dev


You should always see:

Local: http://localhost:3000

If you see:
Port 3000 is in use, using port 3003 instead


This means a previous Story of Emergence server is still running.

Fix the port conflict
1. Check what is using port 3000:
lsof -i:3000

2. If the output shows:

COMMAND is node or next-server

The PATH contains story-of-emergence

Then it is safe to kill:

kill -9 <PID>

3. Restart the server
pnpm dev

Important Rules

Always run Story of Emergence on port 3000

Never allow it to fall back to 3001, 3002, or 3003

Only kill processes if they clearly belong to this project

Avoid running more than one terminal with pnpm dev running

Cursor agents should never modify documentation files

Story of Emergence is a private, wallet bound reflection vault that encrypts all content client side and stores only ciphertext. The system is designed as a Mirror: it reveals structure, timelines, clusters, and distributions as observable facts without assigning meaning, preference, goals, or recommendations. Interpretation, significance, and action belong to the human observer. The product explicitly avoids feedback loops, reinforcement mechanics, coaching, streaks, highlights, or any feature that shapes future behavior. Insights are projections over past data only, and interactions are view-only so the system never crosses from reflection into agency.