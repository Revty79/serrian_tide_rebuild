# Serrian Tide Rebuild

Parallel rebuild workspace for the main app at `d:\StFinal\serrian_tide`.

## Why this folder exists

- Rebuild from scratch safely
- Keep visual parity (same images/fonts/theme)
- Avoid destabilizing the current production code

## Commands

- `npm install`
- `npm run dev`
- `npm run sync:brand` to pull shared assets/styles/components from the current repo

## Current source bridge

This rebuild currently syncs:

- `public/*`
- `src/app/globals.css`
- `src/components/Button.tsx`
- `src/components/Card.tsx`
- `src/components/GradientText.tsx`

from:

- `d:\StFinal\serrian_tide`

## Suggested next rebuild order

1. Auth shell + session handling
2. Dashboard + navigation
3. Worldbuilder modules one by one
4. Campaign + player flows
