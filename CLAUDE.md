# CLAUDE.md - Stone By Stone

## Project Overview

**Stone by Stone** is an educational HTML5 Canvas game that teaches traditional dry stone wall building principles. Players reconstruct a deconstructed wall by placing falling stones (Tetris-style) using card-based selection from a persistent hand of 5 cards. The game supports 6' and 12' wall sizes (toggled via a size selector), with modes toggled via a segmented control between Challenge (gameplay) and Design (custom wall creation).

## Architecture

Single-file monolithic application — everything lives in `dry-stone-walling-game.html` (~6,630 lines of embedded HTML/CSS/JS). No build system, no external dependencies, no frameworks. Pure vanilla JavaScript with Canvas 2D API.

```
Stone By Stone/
├── dry-stone-walling-game.html    # The entire game (HTML + CSS + JS)
├── wall-building-rules.md         # Detailed documentation of rules, scoring, and algorithms
├── CLAUDE.md                      # This file
├── stone_assets/                  # SVG stone artwork (23 hand-drawn assets)
│   ├── 1_1 A–D.svg               # 1:1 ratio variants (square stones)
│   ├── 1_2 A–D.svg               # 1:2 ratio variants
│   ├── 1_3 A–D.svg               # 1:3 ratio variants
│   ├── 1_4 A–C.svg               # 1:4 ratio variants
│   ├── 1_5 A–C.svg               # 1:5 ratio variants
│   ├── 1_6 A.svg                 # 1:6 ratio variant
│   ├── 2_3 A–D.svg               # 2:3 ratio variants
│   ├── sketchy-test.html          # Test page for hand-drawn effect approaches
│   └── 9slice-test.html           # Test page for 9-slice scaling
└── wall designs/                  # Saved wall design JSON files
```

## How to Run

Open `dry-stone-walling-game.html` in any modern web browser. No build step, no server required. The `stone_assets/` folder must be alongside the HTML file (SVGs loaded via relative paths).

## Tech Stack

- HTML5 Canvas 2D for rendering
- Vanilla JavaScript (procedural/functional style with global state)
- SVG stone assets loaded as `Image` objects at init, rendered via 9-slice scaling
- Offscreen canvas caching for all rendered stones (performance optimization)
- `source-atop` compositing for masked hatching/overlay effects
- Browser FileReader API for save/load in Design Mode
- localStorage for tutorial completion + cheek design persistence
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
| `COLS` | 196 | Grid width (1960px) — 144" face + cheeks at full width |
| `ROWS` | 76 | Grid height (760px) — 57" wall + 1" ground + 18" sky |
| `WALL_HEIGHT` | 57 | Wall height in inches (~4'9") — body + 10" coping |
| `COPING_HEIGHT` | 10 | Top 10" reserved for coping stones stood on end |
| `CHEEK_BASE_WIDTH` | 36 | Cheek width at ground level (inches) — 3 feet |
| `CHEEK_TOP_WIDTH` | 16 | Cheek width at wall top (inches) |
| `THROUGH_STONE_ROW` | 27 | Through stone line: 27" from ground (midpoint) |
| `HAND_SIZE` | 5 | Cards shown to player |
| `MAX_REDRAWS` | 3 | Hand redraw limit |
| `CARD_SELECT_TIME` | 15 | Seconds before auto-select |
| `COPING_WAVE_DELAY` | 250 | ms between each coping stone in wave animation |
| `NINE_SLICE_CORNER` | 0.15 | 15% corner region for 9-slice rendering |

### Wall Size Configurations

The game supports two wall sizes via `WALL_SIZES` config object:

| Size | Cheek Offset | Face Width at Midpoint | Description |
|---|---|---|---|
| 12' | 0 | 144" (12') | Full-width wall, cheeks at canvas edges |
| 6' | 36 | 72" (6') | Standard DSWA Level I, 36" background each side |

Active size stored in `activeWallSize` ('6ft' default). Each size has its own reference wall data and localStorage key for saved cheek designs.

### DSWA Level I Dimensions (6' mode)
- **Wall face width:** 72" (6') measured at the **halfway height** (27" from ground)
- **Cheek taper formula:** `cheekWidth(row) = round(36 - (rowFromGround / 57) * 20)`
  - At ground: 36" each side
  - At midpoint (27"): ~26" each side → face = **72"** (approx)
  - At top: 16" each side
- **Canvas:** 1960×760 pixels

### Stone Size Ranges (inches)
| Category | Heights | Widths | Thickness |
|---|---|---|---|
| Thin | 2", 3", 4" | 4"–12" | 1 |
| Medium | 5", 6", 7", 8" | 8"–16" | 2 |
| Thick | 9", 10", 11", 12" | 14"–20" | 3 |
| Through | 4", 5", 6" | 18"–20" | 2–3 |
| Coping | 10" | 3"–4" | 1 (stood on end) |

## Core Game Principles (Scoring & Integrity)

The game scores placement based on **7 dry stone walling rules** (displayed as "How to Wall" cards in the sidebar). Each principle can award **score bonuses** and also affects **integrity (stability)** — the wall's structural health.

### Score Bonuses

1. **Lay Flat** (+15) — Stones wider than tall (except coping)
2. **1 Over 2** (+35) — Each stone sits on exactly 2 stones below; +20 if on 1
3. **Middle Third** (+40/+50) — Stone edges within middle third (+40) or dead center (+50) of stones below
4. **2 Into 1** (+20) — No cold/zipper joints at vertical edges
5. **Coursing** (+15) — Larger stones at base, smaller toward top
6. **Coping** (+15 zone bonus; +60 per stone during coping wave)
7. **Through Stone** (+60) — Dark through stone spans the 27" through line

**Base score formula:** `Math.round(stone.width * stone.height * 0.3) + bonuses`

### Integrity (Stability) System

Integrity starts at 100% and changes dynamically based on placement quality. If it hits 0%, the wall collapses (game over).

| Principle | Good Placement | Bad Placement |
|---|---|---|
| Lay Flat | +2 | -3 to -18 (exponential curve based on aspect ratio) |
| 1 Over 2 | +3 (sits on 2), +1 (sits on 1) | -5 (sits on 3), -8 (sits on 4+) |
| Middle Third | +4 (dead center), +3 (middle third) | neutral (middle half), -5 (outside middle half) |
| 2 Into 1 | +2 (no joints) | -10 (zipper: 3+ stacked joints), -5 (cold joint) |
| Coursing | +1 (right thickness ±1) | -6 (thickness mismatch of 2+) |
| Coping | wave bonus only | — |
| Through Stone | +4 (spans line) | -20 (misplaced far from line) |

**Key design principles:**
- Penalties are larger than recoveries, so bad building is punishing but good play can recover
- Lay Flat penalty scales exponentially: near-square (8×6→-3) ramps fast to extreme (12×2→-18)
- Middle Third has a gracious middle zone: middle half is neutral (no penalty), only outside half penalizes
- Through stone misses are harsh (-20) since wasting a through stone is a significant mistake

Principle cards in the sidebar briefly highlight (`.active` / `.violation` CSS classes) when a placed stone triggers them.

## Key Systems

### Unified Card-Based Gameplay
Players see 5 cards (HTML divs with canvas previews at 1:1 play-area size), click one (or press 1-5), and the stone drops Tetris-style. After placement, the hand refills to 5 from the deck.

Key functions: `renderHandRow()`, `onCardClicked()`, `redrawHandAndRefresh()`

### Stone Asset Rendering with 9-Slice Scaling
SVG artwork in `stone_assets/` is loaded at init via `loadStoneImages()`. Assets are keyed by aspect ratio (e.g., `'1_2'` for 1:2 ratio stones) with multiple variants per ratio (A, B, C, D). A variant is selected deterministically per stone ID via `pickVariant()`.

**9-slice scaling** (`drawStone9Slice()`) divides each SVG into 9 regions (4 corners, 4 edges, 1 center) so stones scale to any game size while preserving hand-drawn corner details. Corner size = 15% of the smaller dimension.

**Bleed rendering:** Stones render with a scaled bleed (`Math.max(1, Math.min(2.5, minDim * 0.025))`) — thin stones get tight gaps, large stones get slightly wider gaps.

### Offscreen Canvas Caching (Performance)
Every rendered stone is cached in `_overlayCache{}` keyed by `stoneId + type + dimensions`. On first render, the stone goes through: 9-slice SVG → darkening overlay (cheek/through) → masked hatching → rough edges, all composited onto an offscreen canvas. Subsequent frames use a single `drawImage()` call per stone. Cache is cleared on `createBoard()`.

### Hand-Drawn Sketchy Effects
All stones get hand-drawn visual effects, masked to the stone shape using `source-atop` compositing:

- **Pencil hatching:** Diagonal lines with seeded PRNG for deterministic per-stone patterns
  - Regular stones: `rgba(60, 55, 40, 0.14)`, lineWidth 0.7, spacing 4
  - Cheek stones: `rgba(30, 25, 15, 0.40)`, lineWidth 1.2, spacing 3 + second cross-hatch pass
- **Rough wobbly edges:** Jittery perimeter stroke with seeded random jitter
- **Cheek darkening:** `rgba(80, 65, 40, 0.55)` overlay via `source-atop`
- **Through stone darkening:** `rgba(20, 20, 20, 0.55)` overlay via `source-atop`

### Cut Mechanic
During card selection, players can press C to enter cut mode on the current stone. A visual overlay shows the stone with a movable cut line (arrow keys to reposition, R to rotate between horizontal/vertical). Confirms with Space to split the stone into two pieces — player keeps one, other goes to deck. Useful for fitting stones into tight gaps.

### Face Pin System
Players get 5 face pins per game. Pressing F during card selection enters face pin mode — click a valid void position on the wall face to place a pinning stone. Pins help lock courses together and fill critical gaps. Tracked via `facePinsRemaining`.

### Through Stone Bank
Through stones drawn from the deck during play can be banked (stored) for later use instead of immediately placing them. The through bank strip (`#throughBankStrip`) displays banked through stones below the canvas. Players press T to retrieve a banked through stone when they reach the through line area. Tracked via `throughBank[]` array.

### Manual Coping Trigger ("Set Copes" Button)
Coping stones are separated during deconstruction into `copingBank[]`. A "Set Copes" button appears when banked coping stones exist. Players click it when ready to finish the wall. There's also a failsafe: if 6+ stones are placed above the cope line, coping auto-triggers.

Key functions: `triggerSetCopes()`, `checkCopingFailsafe()`, `renderCopingBank()`

### Coping Wave Animation (Gravity-Based)
When coping is triggered, stones animate left-to-right at 250ms intervals. Each coping stone drops to the **lowest possible position** (gravity-based placement via `generateCopingPlacements()`), not a fixed row. After all stones are placed, a 6-second delay lets the player admire the wall before the score screen.

Key functions: `startCopingAnimation()`, `generateCopingPlacements()`, `animateCopingWave()`

### Pre-Built Wall on Title Screen
On page load, `init()` calls `createBoard()` + `generateCompletedWall()` to display the reference wall immediately (canvas hidden until SVG assets finish loading to prevent flash of generic blocks). The player can study it before clicking Start.

### Wall Size Selector
A segmented control (`#wallSizeSelector`) lets players choose between 6' and 12' wall sizes. Each size has its own hand-designed reference wall data and cheek design saved to localStorage. The cheek offset shifts the cheek walls inward for the 6' wall, leaving background visible on each side.

Key functions: `setWallSize()`, `getCheekOffset()`, `getWallConfig()`

### Weighted Stone Draw
`drawWeightedCard()` uses a progress-based weight formula so larger/thicker stones tend to appear early (foundation) and smaller stones later (upper courses), with randomness so it's not strictly ordered.

### Card Select Timer & Winnowing
A 15-second countdown timer bar appears below the hand when awaiting card selection. Visual states: green → yellow → red. At thresholds, cards are winnowed (removed with fade-out + collapse CSS animation, returned to deck). After 2 winnows, time expires → random auto-select.

### Tutorial System
A multi-step tutorial overlay (`#tutorialOverlay`) guides new players through core walling principles. Each step has a title, body text with diagrams, and navigation. Completion persisted in localStorage (`sbs_tutorial_done`). Help button (`?`) in header re-launches it.

### Cheek Walls (Side Walls)
`buildRackedBackCheeks()` generates properly coursed side walls with a **linear taper** — thick (3) stones at base, medium (2) in middle, thin (1) at top. Each multi-row stone gets a single negative ID. Cheek designs can be saved/loaded per wall size via localStorage.

### Stone Registry (Performance Optimization)
`stoneRegistry{}` maps each stone ID to its bounding box plus metadata. Rendering iterates the registry in O(numStones) time. All stone placement/removal paths register/deregister stones.

### Pause System
`togglePause()` handles pausing during both stone drops (game loop) and card selection (timer). Card timer remaining time is stored/restored. Reset confirmation also pauses/resumes correctly.

## UI Layout

### Header (`game-wrapper` > `game-header`)
Left-aligned title "STONE BY STONE", centered stats row (Score, Integrity bar, Stones placed, Course number), help button (`?`). Wrapped in `.game-wrapper` so the header width matches the game area below it.

### Main Area (`main-game-area`)
- **Left column** (`.game-board-column`):
  - Canvas (1960×760) in `.game-board-container` with decorative double-border
  - Through stone bank strip (`#throughBankStrip`) — below canvas
  - Coping stone bank strip (`#copingBankStrip`) — below through bank
  - Hand row (`#handRow`) — card selection area
- **Right:** `.side-panel` (200px wide) containing:
  1. **Wall size selector** — `[ 12' | 6' ]` segmented control
  2. **Mode switcher** — segmented control `[ Challenge | Design ]`
  3. **Controls** — Start/Pause buttons (Start becomes "Reset" during gameplay)
  4. **Controls panel** — keyboard shortcut reference
  5. **"How to Wall" section label** — above 7 principle cards
  6. **Principle cards** — highlight on stone placement
  7. **Design panel** (hidden unless Design mode active)

### Hand Row (`#handRow`)
Below the stone banks. Shows up to 5 card divs with stone previews at 1:1 play-area size, dimensions, type labels. Includes deck count, redraw/pin/through action buttons, and a full-width timer bar.

### Overlays
- **Tutorial overlay** (`.tutorial-overlay`) — multi-step guided introduction
- **Reset confirmation** (`.confirm-overlay`) — "Reset the current game?" with Reset/Cancel buttons
- **Game over** (`.game-over-overlay`) — final score, stats grid, restart button
- **Cut mode overlay** — stone splitting interface with movable cut line

## Key Functions Reference

| Function | Purpose |
|---|---|
| `init()` | Initialization, event binding, asset loading, show pre-built wall |
| `loadStoneImages()` | Load SVG assets into `stoneImages{}` map; show canvas when done |
| `startGame()` | Reset state, generate wall, begin deconstruction |
| `handleStartReset()` | Start or show reset confirmation based on game state |
| `confirmReset()` / `cancelReset()` | Handle reset confirmation; reset restores pre-built wall |
| `setWallSize(size)` | Switch between '6ft' and '12ft' wall configurations |
| `switchMode(mode)` | Toggle between 'challenge' and 'design' modes |
| `generateCompletedWall()` | Load hand-designed reference wall or generate algorithmically |
| `generateAlgorithmicWall()` | Build complete reference wall with inch-based coursing |
| `startDeconstruction()` | Animate wall break-apart into deck |
| `drawWeightedCard()` | Weighted random draw from deck based on progress |
| `renderHandRow()` | Build persistent hand UI with cards, actions, timer |
| `onCardClicked(index)` | Handle card selection, spawn stone |
| `gameLoop()` | Main loop (falling, collision, rendering) |
| `lockStone()` | Place stone, analyze, refill hand |
| `analyzeStone()` | Check all 7 principles, award points, adjust integrity |
| `drawBoard()` / `drawStoneBlock()` / `drawBoardStones()` | Rendering (cached, registry-based) |
| `drawStone9Slice()` | 9-slice scale an SVG asset to any stone dimensions |
| `registerStone()` | Add stone to stoneRegistry for O(1) rendering lookup |
| `buildRackedBackCheeks()` | Generate coursed side walls with linear taper |
| `getCheekWidthAtRow()` | Taper formula: 36" base → 16" top |
| `triggerSetCopes()` | Manual coping trigger; starts wave animation |
| `checkCopingFailsafe()` | Auto-trigger coping if 6+ stones above cope line |
| `generateCopingPlacements()` | Gravity-based coping stone positions |
| `startCopingAnimation()` / `animateCopingWave()` | Left-to-right coping cascade |
| `startFacePinMode()` | Enter face pin placement mode |
| `retrieveThroughStone()` | Pull a through stone from the bank |
| `togglePause()` | Pause/resume game loop and card timer |
| `saveDesign()` / `loadDesign()` | JSON export/import for wall designs |

## Game Phases

`'title'` (pre-built wall visible) → `'deconstructing'` (animated removal) → `'playing'` (main gameplay)

Canvas is hidden (`visibility: hidden`) until all SVG assets finish loading to prevent flash of generic blocks.

Separate mode: `'design'` for custom wall creation (toggled via segmented control).

## Testing

No automated test suite. Test by opening the HTML file in a browser. Design Mode serves as a manual validation tool. Test pages exist in `stone_assets/` for 9-slice scaling and sketchy effect development.

## Development History

### Scoring Fine-Tuning (latest)
- **Middle Third** → 4-tier system: dead center (middle sixth) +50/+4, middle third +40/+3, middle half neutral (gracious zone), outside middle half -5
- **Lay Flat** violation now scales exponentially by aspect ratio: near-square (8×6 as 8×6) ~-3, moderate (8×4 as 8×4) ~-8, extreme (12×2 as 12×2) -18. Uses power curve (exponent 2.2)
- **Through Stone** miss penalty doubled: -10 → -20 (wasting a through stone is costly)

### Hand-Drawn Sketchy Stone Effects
- Tested 5 visual approaches (rough edges, pencil hatching, paper grain, combined, cross-hatch)
- Implemented "Edges + Hatching" with masked rendering via `source-atop` compositing
- Cheek stones get bold dark cross-hatching to visually distinguish them
- All effects are cached per stone via `_overlayCache` for 60fps performance

### Coping Height 6" → 10"
- `COPING_HEIGHT` changed from 6 to 10
- `WALL_HEIGHT` adjusted from 53 to 57 (body stays 47", coping grows to 10")
- `ROWS` adjusted from 72 to 76; canvas height from 720 to 760
- Reference wall data shifted with `yShift` to account for grid dimension changes

### Manual Coping Trigger + Gravity Placement
- Removed automatic wall-completion trigger (`checkWallComplete`)
- Added "Set Copes" button — player chooses when to finish
- Failsafe: 6+ stones above cope line auto-triggers coping
- Coping stones now drop to lowest possible position (gravity-based)
- Coping wave slowed from 80ms to 250ms per stone
- 6-second delay after coping before score screen

### Performance Optimization
- All stones (regular, cheek, through) cached as offscreen canvases
- Single `drawImage()` per stone per frame (was 9 drawImage calls via 9-slice)
- Cache key: `stoneId + typeFlag + dimensions`
- Cache cleared on `createBoard()`

### 9-Slice SVG Stone Assets
- 23 hand-drawn SVG stone assets across 7 aspect ratios with multiple variants
- 9-slice scaling preserves hand-drawn corner details at any game size
- Scaled bleed rendering: tight gaps for thin stones, wider for large stones
- Assets loaded async; canvas hidden until all loaded

### Wall Size Selector (6'/12')
- `WALL_SIZES` config with cheek offset per size
- Hand-designed reference walls per size
- Cheek designs saved to localStorage per wall size
- UI: segmented control in sidebar

### Cut Mechanic, Face Pin, Through Stone Bank
- **Cut:** Press C to split a stone along a movable line (H/V orientation)
- **Face Pin:** Press F to place a pinning stone in a void (5 per game)
- **Through Bank:** Through stones can be banked and retrieved later (press T)

### Inch-Based DSWA Level I Overhaul
- Grid: 196×76 cells at 10px/inch
- Canvas: 1960×760 pixels
- Stones: 27 types ranging 2–12" tall × 4–20" wide
- Through stones: 7th scoring principle at 27" midpoint
- Stone registry for O(numStones) rendering performance

### Earlier Foundation Work
- Unified card-based gameplay (persistent hand row, 5 cards)
- Weighted stone draw (progress-based)
- Card timer & winnowing (15s countdown, fade-out animations)
- Cheek wall generation with linear taper and proper coursing
- Pause system (works during both drops and card selection)
- Pre-built reference wall on title screen
- Tutorial system with multi-step overlay

## Important Notes

- All game logic, rendering, and UI are in one file — edits must be careful about scope and side effects
- The `wall-building-rules.md` file is the authoritative reference for scoring algorithms and stone distributions
- Stone types: Regular (thin 2–4", medium 5–8", thick 9–12"), Through (18–20" wide, dark), and Coping (3–4" wide × 10" tall, stood on end)
- Browser APIs used: Canvas 2D, requestAnimationFrame, FileReader, URL.createObjectURL, JSON serialization, Image (for SVG loading), localStorage
- `stoneRegistry` is the performance-critical data structure — all stone add/remove paths must update it
- `_overlayCache` is the rendering cache — cleared on `createBoard()`, stores composited offscreen canvases
- Save format is version 2 with `gridSpec` field; old saves auto-migrate with coordinate/size scaling
- SVG assets taint the canvas for `getImageData` — use `fillRect`-based effects, not pixel manipulation
