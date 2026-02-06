# CLAUDE.md - Stone By Stone

## Project Overview

**Stone by Stone** is an educational HTML5 Canvas game that teaches traditional dry stone wall building principles. Players reconstruct a deconstructed wall by placing falling stones (Tetris-style) using card-based selection from a persistent hand of 5 cards. Modes are toggled via a segmented control between Challenge (gameplay) and Design (custom wall creation).

## Architecture

Single-file monolithic application — everything lives in `dry-stone-walling-game.html` (~3,700 lines of embedded HTML/CSS/JS). No build system, no external dependencies, no frameworks. Pure vanilla JavaScript with Canvas 2D API.

```
Stone By Stone/
├── dry-stone-walling-game.html    # The entire game (HTML + CSS + JS)
├── wall-building-rules.md         # Detailed documentation of rules, scoring, and algorithms
├── CLAUDE.md                      # This file
└── stone_assets/                  # SVG stone artwork
    └── 2x3 Stone A.svg           # Hand-drawn SVG for 2×3 / 3×2 stones
```

## How to Run

Open `dry-stone-walling-game.html` in any modern web browser. No build step, no server required. The `stone_assets/` folder must be alongside the HTML file (SVGs loaded via relative paths).

## Tech Stack

- HTML5 Canvas 2D for rendering
- Vanilla JavaScript (procedural/functional style with global state)
- SVG stone assets loaded as `Image` objects at init
- Browser FileReader API for save/load in Design Mode
- requestAnimationFrame game loop

## Code Conventions

- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `BLOCK_SIZE`, `WALL_HEIGHT`)
- **Functions/variables:** `camelCase` with descriptive names
- **Utility prefixes:** `is/has/get/set` for accessors and checks
- **Global state:** `board` (2D array of thickness values), `stoneInfo` (2D array of stone IDs), plus game state variables (score, stability, deck, hand, etc.)
- No module system — all code is in a single `<script>` block
- Cheek (side wall) stones use **negative IDs** in `stoneInfo[][]` to distinguish from player-placed stones

## Key Constants

| Constant | Value | Description |
|---|---|---|
| `BLOCK_SIZE` | 20 | Pixels per grid cell |
| `COLS` | 48 | Grid width (960px) |
| `ROWS` | 30 | Grid height (600px) |
| `WALL_HEIGHT` | 18 | Rows available for wall |
| `COPING_HEIGHT` | 3 | Top rows reserved for coping |
| `CHEEK_BASE_WIDTH` | 8 | Wall width at base |
| `HAND_SIZE` | 5 | Cards shown to player |
| `MAX_REDRAWS` | 3 | Hand redraw limit |
| `CARD_SELECT_TIME` | 15 | Seconds before auto-select |
| `COPING_WAVE_DELAY` | 120 | ms between coping stones in wave animation |

## Core Game Principles (Scoring)

The game scores placement based on 6 dry stone walling rules (displayed as "How to Wall" cards in the sidebar):

1. **Lay Flat** (+15) — Stones wider than tall (except coping)
2. **1 Over 2** (+35) — Each stone sits on 2 stones below
3. **Middle Third** (+40) — Stone edges within middle third of stones below
4. **2 Into 1** (+20) — No zipper patterns at vertical edges
5. **No Running Joints** (+25) — Vertical joint lines create weakness
6. **Coursing** (+15) — Larger stones at base, smaller toward top
7. **Coping** (+50) — Top course stones stood on end

Max per stone: **210 points** (base: 4 × width × height, plus bonuses above).

Principle cards in the sidebar briefly highlight (`.active` / `.violation` CSS classes) when a placed stone triggers them.

## Key Systems

### Unified Card-Based Gameplay
The old popup card selection was replaced with a **persistent hand row** below the canvas. Players see 5 cards (HTML divs with canvas previews), click one (or press 1-5), and the stone drops Tetris-style. After placement, the hand refills to 5 from the deck.

Key functions: `renderHandRow()`, `onCardClicked()`, `redrawHandAndRefresh()`

### Weighted Stone Draw
`drawWeightedCard()` replaces simple `deck.pop()`. Uses a progress-based weight formula so larger/thicker stones tend to appear early (foundation) and smaller stones later (upper courses), with randomness so it's not strictly ordered.

Progress = `1 - (deck.length / totalDeckSize)`. Weight blends `sizeRatio * (1-progress)` with `(1-sizeRatio) * progress`, floored at 0.1.

### Card Select Timer & Winnowing
A 15-second countdown timer bar appears below the hand when awaiting card selection. Visual states: green → yellow at 2/3 elapsed → red at 1/3 remaining.

At each threshold, one card is **winnowed** (removed with a fade-out + collapse CSS animation, returned to deck). After 2 winnows, if time expires, a random card is auto-selected.

Key functions: `startCardSelectTimer()`, `updateCardTimerBar()`, `winnowCard()`, `autoSelectCard()`

State variables: `cardSelectDeadline`, `cardSelectAnimFrame`, `cardsWinnowed`, `winnowTimeout`, `cardTimerRemaining` (for pause support)

### Coping Wave Animation
When the wall body is ~90% filled, coping stones auto-animate in a left-to-right cascade. Coping stones are separated from the main deck during deconstruction and stored in `copingDeck[]`.

Key functions: `startCopingAnimation()`, `generateCopingPlacements()`, `animateCopingWave()`

### Cheek Walls (Side Walls)
`buildRackedBackCheeks()` generates properly coursed side walls — thick (3) stones at base, medium (2) in middle, thin (1) at top. Each multi-row stone gets a single negative ID. Uses a `stepPattern` array defining rows, widths, stone heights, and thickness for each tier.

### Stone Asset Rendering
SVG artwork in `stone_assets/` is loaded at init via `loadStoneImages()` into the `stoneImages{}` map (keyed as `'WxH'`, e.g. `'2x3'`). `drawStoneBlock()` checks for an asset match (trying both orientations — e.g., a 3×2 stone will find and rotate the `2x3` image). Falls back to the procedural hatching renderer if no asset exists.

To add a new stone asset: place the SVG in `stone_assets/`, add an entry to the `assets` array in `loadStoneImages()`.

### Pause System
`togglePause()` handles pausing during both stone drops (game loop) and card selection (timer). On pause, the card timer's remaining time is stored in `cardTimerRemaining` and restored on resume. The reset confirmation overlay also pauses and resumes correctly.

## UI Layout

### Header (`game-wrapper` > `game-header`)
Left-aligned title "STONE BY STONE", centered stats row (Score, Integrity bar, Stones placed, Course number). Wrapped in `.game-wrapper` so the header width matches the game area below it.

### Main Area (`main-game-area`)
- **Left:** Canvas (960×600) in `.game-board-container` with decorative double-border
- **Right:** `.side-panel` (200px wide) containing:
  1. **Mode switcher** — segmented control `[ Challenge | Design ]` (`.mode-switcher`)
  2. **Controls** — Start/Pause buttons (Start becomes "Reset" during gameplay, with confirmation popup)
  3. **Controls panel** — keyboard shortcut reference
  4. **"How to Wall" section label** — above 6 principle cards
  5. **Principle cards** — highlight on stone placement
  6. **Design panel** (hidden unless Design mode active) — stone palette, labels, save/load

### Hand Row (`#handRow`)
Below the canvas. Shows up to 5 card divs with stone previews, dimensions, type labels. Includes deck count, redraw count/button, and a full-width timer bar. Cards animate out (fade + collapse) when winnowed.

### Overlays
- **Reset confirmation** (`.confirm-overlay`) — "Reset the current game?" with Reset/Cancel buttons
- **Game over** (`.game-over-overlay`) — final score, stats grid, restart button

## Key Functions Reference

| Function | Purpose |
|---|---|
| `init()` | Initialization, event binding, asset loading |
| `loadStoneImages()` | Load SVG assets into `stoneImages{}` map |
| `startGame()` | Reset state, generate wall, begin showing phase |
| `handleStartReset()` | Start or show reset confirmation based on game state |
| `confirmReset()` / `cancelReset()` | Handle reset confirmation overlay |
| `switchMode(mode)` | Toggle between 'challenge' and 'design' modes |
| `toggleDesignMode()` | Wrapper around `switchMode()` |
| `generateCompletedWall()` | Load the starter example wall (~151 stones) |
| `generateAndShowAlgorithmicWall()` | Generate a reference "good wall" (button removed, code kept) |
| `startDeconstruction()` | Animate wall break-apart into deck |
| `deconstructNextStone()` | Remove one stone per tick, separate coping to `copingDeck` |
| `drawWeightedCard()` | Weighted random draw from deck based on progress |
| `renderHandRow()` | Build persistent hand UI with cards, info, timer |
| `onCardClicked(index)` | Handle card selection, spawn stone |
| `gameLoop()` | Main loop (falling, collision, rendering) |
| `lockStone()` | Place stone, analyze, refill hand to HAND_SIZE |
| `analyzeStone()` | Check all principles, award points |
| `drawBoard()` / `drawStoneBlock()` / `drawBoardStones()` | Rendering |
| `drawStoneBlock()` | Renders a stone — uses SVG asset if available, else procedural hatching |
| `buildRackedBackCheeks()` | Generate coursed side walls with proper stone sizes |
| `togglePause()` | Pause/resume game loop and card timer |
| `saveDesign()` / `loadDesign()` | JSON export/import of custom wall designs |

## Game Phases

`'title'` → `'showing'` (1.5s preview) → `'deconstructing'` (animated removal) → `'playing'` (main gameplay)

Separate mode: `'design'` for custom wall creation (toggled via segmented control).

## Testing

No automated test suite. Test by opening the HTML file in a browser. Design Mode serves as a manual validation tool.

## Session History / Recent Changes

This section tracks major changes for continuity across sessions.

### Unified Gameplay Mode (from original)
- Merged old Play Mode popup card selection into persistent hand row below canvas
- Hand size changed from 3 to 5
- Coping stones separated from deck; auto-animate via wave cascade on wall completion
- Old popup code (`showCardPopup`, `hideCardPopup`, `selectPopupCard`, etc.) removed

### Weighted Stone Draw
- `drawWeightedCard()` replaces all `deck.pop()` calls (4 sites: `drawInitialHand`, `lockStone` ×2, `redrawHand`)
- `totalDeckSize` tracked for progress calculation

### Cheek Wall Rebuild
- `buildRackedBackCheeks()` rewritten with `stepPattern` array for proper coursing
- Each stone spans its full height with one negative ID (was per-row IDs causing scoring issues)

### Card Timer & Winnowing
- 15-second countdown with visual bar (green/yellow/red)
- Cards winnowed at 2/3 elapsed and 1/3 remaining thresholds
- Winnowed cards fade out with CSS animation (`.hand-card.winnowing`), remaining cards slide to fill gap via in-place DOM removal (no full re-render)
- `cardsWinnowed` resets and hand refills to `HAND_SIZE` after each stone placement

### UI Cleanup Pass
- Removed redundant "Game Info" sidebar panel (deck/redraws shown in hand row)
- Removed "Generate Good Wall" button (function `generateAndShowAlgorithmicWall()` kept)
- Added segmented mode switcher `[ Challenge | Design ]` at top of sidebar
- Start button becomes "Reset" during gameplay with confirmation popup overlay
- `confirmReset()` returns to fresh title state (doesn't auto-start new game)
- Title left-aligned, stats centered (`.game-wrapper` container)
- Controls panel text bumped from 9px to 11px
- "How to Wall" section label added above principle cards
- Start/Pause buttons centered

### Pause System
- `togglePause()` now works during card selection phase (not just stone drops)
- Card timer paused/resumed via `cardTimerRemaining`
- Reset confirmation also pauses/resumes correctly

### Stone Asset System
- `stone_assets/` folder with SVG artwork
- `loadStoneImages()` loads at init into `stoneImages{}` map
- `drawStoneBlock()` accepts `stoneW`/`stoneH` grid dimensions, looks up asset by `'WxH'` key
- Tries both orientations (e.g., 3×2 finds and rotates the 2×3 asset)
- Currently one asset: `2x3 Stone A.svg` (used for both 2×3 and 3×2 stones)

### Bug Fixes
- Down arrow no longer adds to score (Tetris leftover removed from ArrowDown handler and `hardDrop()`)
- `renderHandRow()` no longer restarts timer on winnow re-render (guard: `if (!cardSelectDeadline)`)
- `redrawHand()` no longer adds 10 extra random cards
- Cheek stones no longer scored as tiny 1-cell stones

## Important Notes

- All game logic, rendering, and UI are in one file — edits must be careful about scope and side effects
- The `wall-building-rules.md` file is the authoritative reference for scoring algorithms and stone distributions
- Stone types: Regular (1H thin, 2H medium, 3H thick laid flat) and Coping (1×3, 2×3 stood on end)
- Browser APIs used: Canvas 2D, requestAnimationFrame, FileReader, URL.createObjectURL, JSON serialization, Image (for SVG loading)
- The `generateAndShowAlgorithmicWall()` function still exists but its button was removed — may be useful for future features
