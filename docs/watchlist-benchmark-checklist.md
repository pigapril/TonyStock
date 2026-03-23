# Watchlist Benchmark Checklist

## Goal
- Validate Wave 2 watchlist interaction responsiveness for authenticated mobile users
- Compare before/after with the same account, same viewport, and the same seed categories

## Environment
- Mobile viewport
- Logged-in `pro` account
- At least 2 categories
- At least 5 stocks in the active category

## Checklist
1. Load `/watchlist` and note when category tabs become clickable
2. Switch categories 5 times in a row and note visible lag
3. Open search, search one ticker, and add it
4. Remove one stock from the active category
5. Enter edit mode for the first time
6. Drag one stock to a new position and drop it
7. Open category manager
8. Reorder one category
9. Open one news item from edit mode
10. Navigate from browse mode into `/priceanalysis`
11. Return to `/watchlist`
12. Open the watchlist quick-select inside `/priceanalysis`

## What to record
- First usable interaction after page load
- Category switch responsiveness
- First edit-mode entry responsiveness
- Drag start and drop completion responsiveness
- Search results responsiveness
- News dialog open responsiveness
- Any silent failure, stuck spinner, or focus trap

## Failure threshold
- Any deferred interaction that fails silently
- Any drag/drop path that only works after a second try
- Any dialog that opens without keyboard focus or cannot close cleanly
