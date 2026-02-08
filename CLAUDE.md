# CLAUDE.md - Stone By Stone

## Project Overview

**Stone by Stone** is an educational HTML5 Canvas game that teaches traditional dry stone wall building principles. Players reconstruct a deconstructed wall by placing falling stones (Tetris-style) using card-based selection from a persistent hand of 5 cards. Modes are toggled via a segmented control between Challenge (gameplay) and Design (custom wall creation).

## Architecture

Single-file monolithic application — everything lives in `dry-stone-walling-game.html` (~4,180 lines of embedded HTML/CSS/JS). No build system, no external dependencies, no frameworks. Pure vanilla JavaScript with Canvas 2D API.

```
Stone By Stone/
├── dry-stone-walling-game.html    # The entire game (HTML + CSS + JS)
├── wall-building-rules.md         # Detailed documentation of rules, scoring, and algorithms
├── CLAUDE.md                      # This file
└── stone_assets/                  # SVG stone artwork
    └── 2x3 Stone A.svg           # Hand-drawn SVG for 2×3 / 3×2 stones
```

## Git Structure

```
main                          ← current branch
├── 7fe426c  Initial commit (game + integrity fixes + pre-built wall)
└── a40e281  Hand card UI: 1:1 stone previews

feature/onboarding-tutorial   ← branches from main
└── 3735642  Onboarding tutorial system (3-stone guided intro)
```

## How to Run

Open `dry-stone-walling-game.html` in any modern web browser. No build step, no server required. The `stone_assets/` folder must be alongside the HTML file (SVGs loaded via relative paths).

## Tech Stack

- HTML5 Canvas 2D for rendering
- Vanilla JavaScript (procedural/functional style with global state)
- SVG stone assets loaded as `Image` objects at init
- Browser FileReader API for save/load in Design Mode
- localStorage for tutorial completion persistence
- requestAnimationFrame game loop

## Code Conventions

- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `BLOCK_SIZE`, `WALL_HEIGHT`)
- **Functions/variables:** `camelCase` with descriptive names
- **Utility prefixes:** `is/has/get/set` for accessors and checks
- **Global state:** `board` (2D array of thickness values), `stoneInfo` (2D array of stone IDs), plus game state variables (score, stability, deck, hand, etc.)
- No module system — all code is in a single `<script>` block
- Cheek (side wall) stones use **negative IDs** in `stoneInfo[][]` to distinguish from player-placed stones

## Key Constants

All dimensions are **inch-based** — 1 grid cell = 1 inch. Conforms to **DSWA Level I test wall** specifications.

| Constant | Value | Description |
|---|---|---|
| `BLOCK_SIZE` | 10 | Pixels per inch (1 grid cell = 1") |
| `COLS` | 88 | Grid width (880px) — 72" face + cheeks |
| `ROWS` | 72 | Grid height (720px) — 54" wall + ground + sky |
| `WALL_HEIGHT` | 54 | Wall height in inches (4'6") including coping |
| `COPING_HEIGHT` | 6 | Top 6" reserved for coping stones stood on end |
| `CHEEK_BASE_WIDTH` | 13 | Cheek width at ground level (inches) |
| `CHEEK_TOP_WIDTH` | 3 | Cheek width at wall top (inches) |
| `THROUGH_STONE_ROW` | 27 | Through stone line: 27" from ground (midpoint) |
| `HAND_SIZE` | 5 | Cards shown to player |
| `MAX_REDRAWS` | 3 | Hand redraw limit |
| `CARD_SELECT_TIME` | 15 | Seconds before auto-select |
| `COPING_WAVE_DELAY` | 80 | ms between coping stones in wave animation |

### DSWA Level I Dimensions
- **Wall face width:** 72" (6') measured at the **halfway height** (27" from ground)
- **Cheek taper formula:** `cheekWidth(row) = round(13 - (rowFromGround / 54) * 10)`
  - At ground: 13" each side → face = 62"
  - At midpoint (27"): 8" each side → face = **72"** ✓
  - At top: 3" each side → face = 82"
- **Canvas:** 880×720 pixels

### Stone Size Ranges (inches)
| Category | Heights | Widths | Thickness |
|---|---|---|---|
| Thin | 2", 3", 4" | 4"–12" | 1 |
| Medium | 5", 6", 7", 8" | 8"–16" | 2 |
| Thick | 9", 10", 11", 12" | 14"–20" | 3 |
| Through | 4", 5", 6" | 18"–20" | 2–3 |
| Coping | 6", 8" | 3"–4" | 1 (stood on end) |

## Core Game Principles (Scoring & Integrity)

The game scores placement based on **7 dry stone walling rules** (displayed as "How to Wall" cards in the sidebar). Each principle can award **score bonuses** and also affects **integrity (stability)** — the wall's structural health.

### Score Bonuses

1. **Lay Flat** (+15) — Stones wider than tall (except coping)
2. **1 Over 2** (+35) — Each stone sits on exactly 2 stones below
3. **Middle Third** (+40) — Stone edges within middle third of stones below
4. **2 Into 1** (+20) — No zipper patterns at vertical edges
5. **Coursing** (+15) — Larger stones at base, smaller toward top
6. **Coping** (+50) — Top course stones stood on end
7. **Through Stone** (+60) — Dark through stone spans the 27" through line; +30 if within 3"

**Base score formula:** `Math.round(stone.width * stone.height * 0.3) + bonuses` (max base: 72 for 20×12").

### Integrity (Stability) System

Integrity starts at 100% and changes dynamically based on placement quality. If it hits 0%, the wall collapses (game over).

| Principle | Good Placement | Bad Placement |
|---|---|---|
| Lay Flat | +2 | -18 (stone on end) |
| 1 Over 2 | +3 (sits on 2) | -10 (sits on 3+), -5 (sits on only 1 — stacking) |
| Middle Third | +3 (centered) | -5 (off-center) |
| 2 Into 1 | +2 (no zipper) | -8 (zipper: 2+ aligned joints at edge) |
| Coursing | +1 (right thickness) | -6 (thickness mismatch of 2+) |
| Coping | +3 | — |
| Through Stone | +4 (spans line) / +2 (near line) | -10 (misplaced far from line) |

Key design: penalties are larger than recoveries, so bad building is punishing but good play can recover.

Principle cards in the sidebar briefly highlight (`.active` / `.violation` CSS classes) when a placed stone triggers them.

## Key Systems

### Unified Card-Based Gameplay
The old popup card selection was replaced with a **persistent hand row** below the canvas. Players see 5 cards (HTML divs with canvas previews at 1:1 play-area size), click one (or press 1-5), and the stone drops Tetris-style. After placement, the hand refills to 5 from the deck.

Key functions: `renderHandRow()`, `onCardClicked()`, `redrawHandAndRefresh()`

### Pre-Built Wall on Title Screen
On page load, `init()` calls `createBoard()` + `generateCompletedWall()` + `drawBoard()` to display the reference wall immediately. The player can study it before clicking Start. Clicking Start goes directly to deconstruction (no 1.5s "showing" delay). Reset and mode-switch back to Challenge also restore the pre-built wall.

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
`buildRackedBackCheeks()` generates properly coursed side walls with a **linear taper** — thick (3) stones at base, medium (2) in middle, thin (1) at top. Each multi-row stone gets a single negative ID. Cheek width at each row is computed by `getCheekWidthAtRow()` using the taper formula, then consecutive rows with identical widths are grouped into tiers for multi-row stone placement.

### Through Stones
Dark charcoal-colored stones (`#3a3a3a`) that span the **through stone line** at 27" from ground (wall midpoint). Visually distinct from regular stones. Scored as a 7th principle: +60 bonus if spanning the line, +30 if within 3", -10 stability penalty if misplaced. Through stones appear in the deck with boosted weight when wall progress is 40–60%, and `getRandomStone()` has a 12% peak chance at midpoint.

### Stone Registry (Performance Optimization)
The inch-based grid (88×72 = 6,336 cells) made the old O(ROWS²×COLS²) rendering approach too slow. A `stoneRegistry{}` maps each stone ID to its bounding box (`minR, maxR, minC, maxC`) plus metadata (`thickness, isCoping, isThroughStone`). `drawBoardStones()` and `drawStoneLabels()` iterate the registry in O(numStones) time. All stone placement/removal paths register/deregister stones.

### Stone Asset Rendering
SVG artwork in `stone_assets/` is loaded at init via `loadStoneImages()` into the `stoneImages{}` map (keyed as `'WxH'`, e.g. `'2x3'`). `drawStoneBlock()` checks for an asset match (trying both orientations — e.g., a 3×2 stone will find and rotate the `2x3` image). Falls back to the procedural hatching renderer if no asset exists.

To add a new stone asset: place the SVG in `stone_assets/`, add an entry to the `assets` array in `loadStoneImages()`.

### Pause System
`togglePause()` handles pausing during both stone drops (game loop) and card selection (timer). On pause, the card timer's remaining time is stored in `cardTimerRemaining` and restored on resume. The reset confirmation overlay also pauses and resumes correctly.

## UI Layout

### Header (`game-wrapper` > `game-header`)
Left-aligned title "STONE BY STONE", centered stats row (Score, Integrity bar, Stones placed, Course number). Wrapped in `.game-wrapper` so the header width matches the game area below it.

### Main Area (`main-game-area`)
- **Left:** Canvas (880×720) in `.game-board-container` with decorative double-border
- **Right:** `.side-panel` (200px wide) containing:
  1. **Mode switcher** — segmented control `[ Challenge | Design ]` (`.mode-switcher`)
  2. **Controls** — Start/Pause buttons (Start becomes "Reset" during gameplay, with confirmation popup)
  3. **Controls panel** — keyboard shortcut reference
  4. **"How to Wall" section label** — above 7 principle cards
  5. **Principle cards** — highlight on stone placement (includes Through Stone)
  6. **Design panel** (hidden unless Design mode active) — stone palette, labels (incl. 1st/2nd Lift), cheek design sub-mode, save/load

### Hand Row (`#handRow`)
Below the canvas. Shows up to 5 card divs with stone previews at 1:1 play-area size, dimensions, type labels. Cards auto-size to fit their stone (min-width: 80px). Includes deck count, redraw count/button, and a full-width timer bar. Cards animate out (fade + collapse) when winnowed.

### Overlays
- **Reset confirmation** (`.confirm-overlay`) — "Reset the current game?" with Reset/Cancel buttons
- **Game over** (`.game-over-overlay`) — final score, stats grid, restart button

## Key Functions Reference

| Function | Purpose |
|---|---|
| `init()` | Initialization, event binding, asset loading, show pre-built wall |
| `loadStoneImages()` | Load SVG assets into `stoneImages{}` map |
| `startGame()` | Reset state, generate wall, begin deconstruction immediately |
| `handleStartReset()` | Start or show reset confirmation based on game state |
| `confirmReset()` / `cancelReset()` | Handle reset confirmation overlay; reset restores pre-built wall |
| `switchMode(mode)` | Toggle between 'challenge' and 'design' modes; challenge restores wall |
| `toggleDesignMode()` | Wrapper around `switchMode()` |
| `generateCompletedWall()` | Delegates to `generateAlgorithmicWall()` (legacy starter stones preserved but unused) |
| `generateAlgorithmicWall()` | Build a complete reference wall algorithmically with inch-based stones + through stones |
| `startDeconstruction()` | Animate wall break-apart into deck |
| `deconstructNextStone()` | Remove one stone per tick, separate coping to `copingDeck` |
| `drawWeightedCard()` | Weighted random draw from deck based on progress |
| `renderHandRow()` | Build persistent hand UI with 1:1 stone preview cards, info, timer |
| `onCardClicked(index)` | Handle card selection, spawn stone |
| `gameLoop()` | Main loop (falling, collision, rendering) |
| `lockStone()` | Place stone, analyze, refill hand to HAND_SIZE |
| `analyzeStone()` | Check all principles, award points, adjust integrity |
| `drawBoard()` / `drawStoneBlock()` / `drawBoardStones()` | Rendering (registry-based for performance) |
| `drawStoneBlock()` | Renders a stone — through stones dark charcoal, else SVG asset or procedural hatching |
| `registerStone()` | Add stone to stoneRegistry for O(1) rendering lookup |
| `buildRackedBackCheeks()` | Generate coursed side walls with linear taper |
| `getCheekWidthAtRow()` | Linear taper formula: 13" base → 3" top |
| `getRandomStone()` | Generate random stone with through stone chance at midpoint |
| `togglePause()` | Pause/resume game loop and card timer |
| `saveDesign()` / `loadDesign()` | JSON export/import with version 2 format + old format migration |
| `enterCheekDesignMode()` / `exitCheekDesignMode()` | Cheek end design sub-mode |

## Game Phases

`'title'` (pre-built wall visible) → `'deconstructing'` (animated removal) → `'playing'` (main gameplay)

The old `'showing'` phase (1.5s preview) is no longer used — the wall is visible on the title screen so players can study it before clicking Start.

Separate mode: `'design'` for custom wall creation (toggled via segmented control).

## Testing

No automated test suite. Test by opening the HTML file in a browser. Design Mode serves as a manual validation tool.

## Session History / Recent Changes

This section tracks major changes for continuity across sessions.

### Inch-Based DSWA Level I Overhaul (this session)
**Major overhaul** converting the entire game from abstract grid units to inch-based stone sizing conforming to DSWA Level I test wall dimensions (54" × 72" at midpoint).

**Key changes:**
- Grid: 88×72 cells at 10px/inch (was 48×30 at 20px/cell)
- Canvas: 880×720 pixels (was 960×600)
- Stones: 27 types ranging 2–12" tall × 4–20" wide (was ~20 abstract types)
- Through stones: New stone type + 7th scoring principle at 27" midpoint
- Cheek taper: Linear formula `getCheekWidthAtRow()` (13" base → 3" top)
- Stone registry: Performance optimization — `stoneRegistry{}` for O(numStones) rendering
- Wall generation: `generateAlgorithmicWall()` fully rewritten with inch-based coursing and through stone insertion
- Scoring: Base formula `0.3 * w * h`, coursing thresholds at 18"/36"
- Labels: Added "1st Lift" and "2nd Lift" to Design Mode
- Cheek design sub-mode: New feature for designing cheek end patterns
- Save format: Version 2 with gridSpec; old format auto-migrates
- Drop speed: 1200ms (was 1800ms), coping wave: 80ms (was 120ms)

### Integrity Scoring Overhaul (earlier session)
**Problem:** Integrity (stability) was a one-way street — started at 100%, only decreased from violations, never responded to good play. Most violation conditions were also too narrow to ever trigger.

**Fixes:**
- Added stability recovery for each positive principle (+1 to +3 per good placement)
- **1-over-1 stacking** now penalizes -5 (was giving +8 bonus — completely wrong)
- **Zipper joint** threshold lowered from 3+ to 2+ adjacent IDs (was impossible for thin/medium stones)
- **Middle third** now penalizes -5 when stone is off-center (was bonus-only, no penalty path)
- **Coursing** now penalizes any 2+ thickness mismatch (was only penalizing very specific heavy-stone-high case)

### Pre-Built Wall on Title Screen (this session)
- `init()` now shows the completed reference wall at page load instead of an empty canvas
- `startGame()` skips the 1.5s "showing" delay — goes straight to deconstruction
- `confirmReset()` restores the pre-built wall (not empty board)
- `switchMode('challenge')` restores the pre-built wall when returning from Design mode

### Hand Card UI Update (this session)
- Card previews now render at 1:1 play-area size (was scaled down to 100×50px)
- Removed card number overlays (1-5 in top-left corner)
- Removed dashed border on preview canvas
- Cards auto-size to fit their stone content (`min-width: 80px` instead of fixed `140×90`)
- Hand row aligns cards to bottom (`flex-end`) instead of top

### Onboarding Tutorial (feature branch: `feature/onboarding-tutorial`)
**Not yet merged to main.** A lightweight coach panel guides first-time players through their first 3 stone placements:
- Step 1: Controls (← → Space) + Lay Flat principle
- Step 2: Adjacent placement + 2 Into 1 / no zipper joints
- Step 3: Bridging — 1 Over 2 with green canvas highlight zone

Implementation details:
- Floating `.tutorial-coach` div inside `.game-board-container`, positioned at canvas top center
- State: `tutorialActive` (bool), `tutorialStep` (0–6 linear counter with 2 sub-states per stone)
- Card timer suppressed during tutorial (`startCardSelectTimer()` has guard)
- Redraw button hidden, Design mode switch blocked during tutorial
- Persists completion in `localStorage('sbs_tutorial_done')` — only shows once
- Skip link available at all times
- Functions: `startTutorial()`, `createCoachPanel()`, `updateCoachPanel()`, `advanceTutorial()`, `endTutorial()`, `skipTutorial()`, `drawTutorialOverlay()`, `cleanupTutorial()`
- Hooks into: `startCardSelectTimer`, `onCardClicked`, `lockStone`, `renderHandRow`, `drawBoard`, `deconstructNextStone`, `confirmReset`, `startGame`, `switchMode`, `handleKeyPress`

### Earlier Changes (pre-session)

#### Unified Gameplay Mode
- Merged old Play Mode popup card selection into persistent hand row below canvas
- Hand size changed from 3 to 5
- Coping stones separated from deck; auto-animate via wave cascade on wall completion
- Old popup code (`showCardPopup`, `hideCardPopup`, `selectPopupCard`, etc.) removed

#### Weighted Stone Draw
- `drawWeightedCard()` replaces all `deck.pop()` calls (4 sites: `drawInitialHand`, `lockStone` ×2, `redrawHand`)
- `totalDeckSize` tracked for progress calculation

#### Cheek Wall Rebuild
- `buildRackedBackCheeks()` rewritten with `stepPattern` array for proper coursing
- Each stone spans its full height with one negative ID (was per-row IDs causing scoring issues)

#### Card Timer & Winnowing
- 15-second countdown with visual bar (green/yellow/red)
- Cards winnowed at 2/3 elapsed and 1/3 remaining thresholds
- Winnowed cards fade out with CSS animation (`.hand-card.winnowing`), remaining cards slide to fill gap via in-place DOM removal (no full re-render)
- `cardsWinnowed` resets and hand refills to `HAND_SIZE` after each stone placement

#### UI Cleanup Pass
- Removed redundant "Game Info" sidebar panel (deck/redraws shown in hand row)
- Removed "Generate Good Wall" button (function `generateAndShowAlgorithmicWall()` kept)
- Added segmented mode switcher `[ Challenge | Design ]` at top of sidebar
- Start button becomes "Reset" during gameplay with confirmation popup overlay
- `confirmReset()` returns to fresh title state (doesn't auto-start new game)
- Title left-aligned, stats centered (`.game-wrapper` container)
- Controls panel text bumped from 9px to 11px
- "How to Wall" section label added above principle cards
- Start/Pause buttons centered

#### Pause System
- `togglePause()` now works during card selection phase (not just stone drops)
- Card timer paused/resumed via `cardTimerRemaining`
- Reset confirmation also pauses/resumes correctly

#### Stone Asset System
- `stone_assets/` folder with SVG artwork
- `loadStoneImages()` loads at init into `stoneImages{}` map
- `drawStoneBlock()` accepts `stoneW`/`stoneH` grid dimensions, looks up asset by `'WxH'` key
- Tries both orientations (e.g., 3×2 finds and rotates the 2×3 asset)
- Currently one asset: `2x3 Stone A.svg` (used for both 2×3 and 3×2 stones)

#### Bug Fixes
- Down arrow no longer adds to score (Tetris leftover removed from ArrowDown handler and `hardDrop()`)
- `renderHandRow()` no longer restarts timer on winnow re-render (guard: `if (!cardSelectDeadline)`)
- `redrawHand()` no longer adds 10 extra random cards
- Cheek stones no longer scored as tiny 1-cell stones

## Important Notes

- All game logic, rendering, and UI are in one file — edits must be careful about scope and side effects
- The `wall-building-rules.md` file is the authoritative reference for scoring algorithms and stone distributions
- Stone types: Regular (thin 2–4", medium 5–8", thick 9–12"), Through (18–20" wide, dark charcoal), and Coping (3–4" wide × 6–8" tall, stood on end)
- Browser APIs used: Canvas 2D, requestAnimationFrame, FileReader, URL.createObjectURL, JSON serialization, Image (for SVG loading), localStorage
- `stoneRegistry` is the performance-critical data structure — all stone add/remove paths must update it
- Save format is version 2 with `gridSpec` field; old saves auto-migrate with coordinate/size scaling
- The tutorial on `feature/onboarding-tutorial` is ready to merge when approved (uses pre-overhaul grid dimensions)
