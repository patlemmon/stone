# Dry Stone Wall Building Rules & Algorithm

## Your "Starter Example" Wall Analysis

### Stone Count Summary
| Section | Count | % of Wall |
|---------|-------|-----------|
| Foundation | 7 | 5% |
| Body | 114 | 75% |
| Coping | 30 | 20% |
| **Total** | **151** | 100% |

### Key Findings

**100% Laid Flat Compliance:**
- All 121 regular stones (foundation + body) are laid flat (width ≥ height)
- All 30 coping stones are stood on end (height > width)

**No Tiny Stones:**
- Minimum regular stone width: 2 blocks
- Zero 1-width regular stones in entire wall

**Stone Size Distribution (Body):**
| Size | Count | Use Case |
|------|-------|----------|
| 3×1 | 31 (27%) | Thin fillers, leveling |
| 2×1 | 25 (22%) | Gap fillers |
| 4×1 | 18 (16%) | Wide thin bridging |
| 4×2 | 16 (14%) | Medium structural |
| 3×2 | 10 (9%) | Medium filler |
| 2×2 | 7 (6%) | Small medium |
| 3×3 | 4 (4%) | **Jumpers** |
| 4×3 | 2 (2%) | **Large jumpers** |

**Foundation Pattern:**
- All 4-5 blocks wide
- All 2-3 blocks thick
- Sizes: 5×3 (×3), 4×3 (×2), 5×2, 4×2

**Coping Pattern:**
- Mix of 1×3 (16) and 2×3 (14)
- All exactly 3 blocks tall
- Alternating widths creates visual interest

---

## Scoring System Analysis

### Principle Bonuses
| Principle | Bonus | Violation Penalty |
|-----------|-------|-------------------|
| LAY FLAT | +15 | -18 stability |
| 1 OVER 2 | +35 | -10 stability (1 over 3+) |
| MIDDLE THIRD | +40 | none |
| 2 INTO 1 | +20 | -15 to -25 stability (3+ into 1) |
| **NO RUNNING JOINTS** | +25 | -15 to -25 stability |
| **NO SMALL STACKING** | +10 | -10 to -20 stability |
| COURSING | +15 | -6 stability |
| COPING | +50 | none |

**Base Score:** 4 × width × height per stone

**Maximum bonus per stone: +210 points** (15+35+40+20+25+10+15+50)

---

## The Six Principles of Dry Stone Walling

### 1. LAY FLAT (width ≥ height)
**Rule:** All regular stones must be wider than they are tall.
- Regular stones: width ≥ height (e.g., 4×2, 5×3, 3×1)
- Exception: Coping stones at top are stood on end (height > width)

**From your example:**
- Foundation: 4×3, 5×3, 4×2 (all laid flat)
- Body: 3×2, 4×2, 3×1, 4×1 (all laid flat)
- Coping: 1×3, 2×3 (stood on end - correct!)

### 2. ONE OVER TWO (1/2)
**Rule:** Each stone should sit on exactly 2 stones below, bridging the joint.
- Optimal: Stone spans across 2 stones below
- Acceptable: Stone on 1 stone (less stable but sometimes needed)
- Bad: Stone on 3+ stones (indicates stone is too wide or poor alignment)

**Detection Algorithm:**
```
stonesBelow = unique stone IDs in row below that stone touches
if stonesBelow.count == 2: BONUS +35
if stonesBelow.count == 1: BONUS +8
if stonesBelow.count >= 3: PENALTY -10 stability
```

### 3. MIDDLE THIRD
**Rule:** A stone's edges should fall within the middle third of the stones below.
- The joint below should be covered by the middle portion of the stone above
- Prevents "running joints" (vertical lines of weakness)

**Detection Algorithm:**
```
belowSpan = (leftmost edge of stones below, rightmost edge)
belowWidth = belowSpan.right - belowSpan.left
thirdWidth = belowWidth / 3
middleZone = (belowSpan.left + thirdWidth, belowSpan.right - thirdWidth)

if stone.leftEdge >= middleZone.left AND stone.rightEdge <= middleZone.right:
    BONUS +40
```

### 4. TWO INTO ONE (2/1) - Horizontal Termination Rule
**Rule:** Keep stone terminations balanced at any vertical edge. Count ALL stones meeting at a vertical line.

This is about the HORIZONTAL relationship within and across courses:
- **1 into 1**: One meets one (2 total) → ✓ Good
- **2 into 1**: Two meet one (3 total) → ✓ Good
- **1 into 2**: One meets two (3 total) → ✓ Good
- **3 into 1**: Three meet one (4 total) → ✗ Bad
- **2 into 3**: Two meet three (5 total) → ✗ Bad (zipper pattern!)

**The Rule:** Total stones meeting at any vertical edge should be ≤3.

**Example:**
```
GOOD (2 into 1 = 3 total):     BAD (2 into 3 = 5 total):
┌───┬─────┐                    ┌───┬───┐
│ A │     │                    │ A │ D │
├───┤  C  │                    ├───┼───┤
│ B │     │                    │ B │ E │
└───┴─────┘                    ├───┼───┤
                               │ C │ F │
3 stones meet at edge          └───┴───┘
= OK                           5 stones meet at edge
                               = ZIPPER PATTERN = BAD
```

**Detection Algorithm:**
```
for each vertical edge (X position) in the wall:
    leftStones = stones whose RIGHT edge is at X
    rightStones = stones whose LEFT edge is at X
    totalTerminations = leftStones.count + rightStones.count

    if totalTerminations <= 3: BONUS +20
    if totalTerminations == 4: PENALTY -15 stability
    if totalTerminations >= 5: SEVERE PENALTY -25 stability (zipper!)
```

**Why it matters:**
- Many stones meeting at one vertical line = plane of weakness
- Creates "zipper" patterns that can unzip under stress
- Directly causes running joints

### 4b. NO RUNNING JOINTS (Critical!)
**Rule:** Joint positions should NOT align vertically across multiple courses.
- A "running joint" is when seams on 2+ courses occur at the same X position
- Creates vertical lines of weakness through the wall
- Even worse than zipper joints - can cause catastrophic failure

**Detection Algorithm:**
```
for each joint (gap between stones) at position X:
    count how many courses have a joint at this same X position
    if jointCount >= 2 within 3 courses:
        runningJointDetected = true
        PENALTY -15 stability
    if jointCount >= 3:
        SEVERE PENALTY -25 stability
```

**Prevention Strategy:**
- Track all joint X-positions for the last 3-4 courses
- When placing a new stone, check if its edges would align with existing joints
- Offset stone placement to break up vertical joint lines
- Prefer wider stones that span across potential running joints

### 4c. NO SMALL STONE STACKING
**Rule:** Avoid stacking narrow stones (width ≤ 2) directly on top of each other.
- Creates weak vertical columns within the wall
- Contributes to running joints
- Small stones should be offset or separated by wider stones

**Detection Algorithm:**
```
if stone.width <= 2:
    check stone directly below at same X position
    if belowStone.width <= 2 AND overlaps significantly:
        smallStackDetected = true
        PENALTY -10 stability

    // Check 2 courses down for triple stacking
    if 3 small stones stacked vertically:
        SEVERE PENALTY -20 stability
```

**Prevention Strategy:**
- After placing a narrow stone, prefer wider stones above it
- Track narrow stone positions and avoid placing another narrow stone directly above
- Use narrow stones to fill gaps, not as primary structural elements

### 5. COURSING (Stone Size by Height)
**Rule:** Heavier/thicker stones at base, thinner stones toward top.

**Expected Thickness by Course:**
| Course Level (from ground) | Expected Thickness |
|---------------------------|-------------------|
| 0-5 (foundation) | 3 (thick) |
| 6-13 (body) | 2 (medium) |
| 14+ (upper) | 1 (thin) |

**Tolerance:** ±1 thickness is acceptable
**Penalty:** Heavy stones placed high up lose -6 stability

### 6. COPING (Top Course)
**Rule:** Top course stones are stood on END (height > width).
- Typically 1×3 or 2×3 stones
- Caps the wall and sheds water
- +50 bonus + 3 stability recovery

---

## Stone Size Categories

### From Your Example Wall Analysis

**Foundation Stones (y = 26-27, course 0-2):**
- Typical sizes: 4×3, 5×3, 4×2, 5×2
- All thickness 2-3
- Minimum width: 4 blocks

**Body Stones (y = 14-25, courses 3-14):**
- Large jumpers: 3×3, 4×3 (create organic coursing)
- Medium: 3×2, 4×2, 5×2
- Thin fillers: 2×1, 3×1, 4×1
- Minimum width: 2 blocks (no 1×n regular stones)

**Coping Stones (y = 11-13, top 3 rows):**
- Sizes: 1×3, 2×3 (stood on end)
- Height always 3
- Width either 1 or 2

---

## Wall Building Algorithm

### Phase 1: Sort Deck by Priority
```javascript
function sortDeckForPlacement(deck) {
    return deck.sort((a, b) => {
        // Coping stones last (for top)
        if (a.isCoping !== b.isCoping) return a.isCoping ? 1 : -1;

        // Thicker stones first (for foundation)
        if (a.thickness !== b.thickness) return b.thickness - a.thickness;

        // Wider stones first (more stable)
        return b.width - a.width;
    });
}
```

### Phase 2: Placement Strategy
```javascript
function findBestPlacement(stone, board) {
    let bestScore = -Infinity;
    let bestPosition = null;

    const courseLevel = getCurrentCourseLevel(board);

    // Try each valid X position
    for (let x = leftBound; x <= rightBound - stone.width; x++) {
        const y = findLowestValidY(x, stone, board);
        if (y === null) continue;

        const score = evaluatePlacement(stone, x, y, board);
        if (score > bestScore) {
            bestScore = score;
            bestPosition = { x, y };
        }
    }

    return bestPosition;
}
```

### Phase 3: Evaluate Placement
```javascript
function evaluatePlacement(stone, x, y, board) {
    let score = 0;
    const courseLevel = ROWS - 1 - y;

    // 1. LAY FLAT CHECK
    if (stone.width >= stone.height) {
        score += 15;
    } else if (!stone.isCoping || courseLevel < WALL_HEIGHT - 3) {
        score -= 50; // Heavy penalty for non-coping on end
    }

    // 2. ONE OVER TWO CHECK
    const stonesBelow = getStonesBelow(x, y, stone.width, board);
    if (stonesBelow.size === 2) {
        score += 35;
    } else if (stonesBelow.size === 1) {
        score += 8;
    } else if (stonesBelow.size >= 3) {
        score -= 30;
    }

    // 3. MIDDLE THIRD CHECK
    if (stonesBelow.size >= 1) {
        const belowSpan = getBelowSpan(stonesBelow, board);
        const third = (belowSpan.right - belowSpan.left) / 3;
        const midLeft = belowSpan.left + third;
        const midRight = belowSpan.right - third;

        if (x >= midLeft && x + stone.width <= midRight) {
            score += 40;
        }
    }

    // 4. ZIPPER JOINT CHECK
    if (hasZipperJoint(x, y, stone, board)) {
        score -= 25;
    } else {
        score += 20;
    }

    // 5. COURSING CHECK
    const expectedThickness = courseLevel < 6 ? 3 : (courseLevel < 14 ? 2 : 1);
    if (Math.abs(stone.thickness - expectedThickness) <= 1) {
        score += 15;
    } else if (stone.thickness > expectedThickness + 1) {
        score -= 20;
    }

    // 6. COPING CHECK
    if (courseLevel >= WALL_HEIGHT - 3 && stone.isCoping) {
        score += 50;
    }

    // BONUS: Prefer filling gaps over creating overhangs
    score += getGapFillingBonus(x, y, stone, board);

    return score;
}
```

### Phase 4: Gap Detection
```javascript
function findGaps(board) {
    const gaps = [];

    for (let y = groundRow; y >= wallTop; y--) {
        let gapStart = null;

        for (let x = leftBound; x < rightBound; x++) {
            if (!board[y][x] && hasSupport(x, y, board)) {
                if (gapStart === null) gapStart = x;
            } else if (gapStart !== null) {
                gaps.push({
                    x: gapStart,
                    y: y,
                    width: x - gapStart,
                    priority: y // Lower y (higher up) = higher priority
                });
                gapStart = null;
            }
        }
    }

    return gaps.sort((a, b) => b.priority - a.priority);
}
```

---

## Stone Selection Rules for Hand

### When to Select Each Stone Type

**Select THICK stones (3-height) when:**
- Building foundation (courses 0-5)
- Need to create a jumper for structural bonding
- Filling a 3+ high gap

**Select MEDIUM stones (2-height) when:**
- Building mid-wall (courses 6-13)
- Need to bridge over a joint
- Gap is 2 high

**Select THIN stones (1-height) when:**
- Building upper wall (courses 14+)
- Filling narrow gaps
- Leveling uneven course tops

**Select COPING stones when:**
- Reached top 3 rows
- Wall body is complete

### Optimal Stone Width Selection

```javascript
function selectOptimalWidth(gap, stonesBelow) {
    // Ideal: span exactly 2 stones below
    if (stonesBelow.length >= 2) {
        const joint1 = stonesBelow[0].rightEdge;
        const joint2 = stonesBelow[1].leftEdge;
        const optimalWidth = joint2 - joint1 + 2; // Cover joint + 1 on each side
        return Math.max(2, Math.min(optimalWidth, gap.width));
    }

    // Fallback: fill gap width, minimum 2
    return Math.max(2, Math.min(gap.width, 5));
}
```

---

## Quality Metrics for Completed Walls

### Excellent Wall (90%+ score potential)
- All stones laid flat (except coping)
- 70%+ stones achieve 1-over-2
- No zipper joints
- Proper coursing throughout
- Complete coping row

### Good Wall (70-89% score)
- Most stones laid flat
- 50%+ achieve 1-over-2
- Few zipper joints
- Generally proper coursing

### Poor Wall (<70% score)
- Multiple stones on end
- Many 1-over-3+ placements
- Visible zipper joints
- Heavy stones high up

---

## Implementation Notes

### Key Data Structures
```javascript
// Stone object
{
    id: number,
    x: number,      // left column
    y: number,      // top row
    width: number,  // horizontal blocks
    height: number, // vertical blocks
    thickness: number, // visual weight (usually = height)
    isCoping: boolean
}

// Board: 2D array where board[row][col] = thickness (0 = empty)
// StoneInfo: 2D array where stoneInfo[row][col] = stone ID
```

### Performance Optimizations
1. Pre-calculate stone boundaries for quick lookup
2. Cache stones-below relationships
3. Use bitmask for gap detection
4. Sort deck once at game start

---

## Deck Generation Algorithm

Based on your "Starter Example" wall, here's the optimal stone distribution for a playable deck:

```javascript
function generateOptimalDeck() {
    const deck = [];

    // FOUNDATION STONES (5% of deck) - for bottom courses
    // All 4-5 wide, 2-3 thick
    const foundationStones = [
        { width: 5, height: 3, thickness: 3, count: 3 },
        { width: 4, height: 3, thickness: 3, count: 2 },
        { width: 5, height: 2, thickness: 2, count: 1 },
        { width: 4, height: 2, thickness: 2, count: 1 }
    ];

    // BODY STONES (75% of deck)
    // Distribution based on your example wall
    const bodyStones = [
        // Thin fillers (49% of body) - for upper courses & leveling
        { width: 3, height: 1, thickness: 1, count: 31 },
        { width: 2, height: 1, thickness: 1, count: 25 },
        { width: 4, height: 1, thickness: 1, count: 18 },

        // Medium stones (29% of body) - structural mid-wall
        { width: 4, height: 2, thickness: 2, count: 16 },
        { width: 3, height: 2, thickness: 2, count: 10 },
        { width: 2, height: 2, thickness: 2, count: 7 },
        { width: 5, height: 2, thickness: 2, count: 1 },

        // Jumpers (6% of body) - create organic coursing
        { width: 3, height: 3, thickness: 3, count: 4 },
        { width: 4, height: 3, thickness: 3, count: 2 }
    ];

    // COPING STONES (20% of deck) - for top course
    // All stood on end (height > width)
    const copingStones = [
        { width: 1, height: 3, thickness: 1, isCoping: true, count: 16 },
        { width: 2, height: 3, thickness: 2, isCoping: true, count: 14 }
    ];

    // Build deck
    for (const template of [...foundationStones, ...bodyStones, ...copingStones]) {
        for (let i = 0; i < template.count; i++) {
            deck.push({
                width: template.width,
                height: template.height,
                thickness: template.thickness,
                isCoping: template.isCoping || false
            });
        }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}
```

### Stone Selection Strategy by Course Level

```javascript
function recommendStoneForCourse(courseLevel, availableHand) {
    // courseLevel = 0 at ground, increases going up

    if (courseLevel < 3) {
        // FOUNDATION: prefer thick, wide stones
        return availableHand
            .filter(s => s.thickness >= 2 && s.width >= 4 && !s.isCoping)
            .sort((a, b) => (b.thickness * b.width) - (a.thickness * a.width))[0];
    }

    if (courseLevel < 6) {
        // LOWER BODY: mix of thick and medium
        return availableHand
            .filter(s => s.thickness >= 2 && !s.isCoping)
            .sort((a, b) => b.width - a.width)[0];
    }

    if (courseLevel < 12) {
        // MID BODY: medium stones, occasional jumper
        const jumper = availableHand.find(s => s.thickness === 3 && !s.isCoping);
        if (jumper && Math.random() < 0.25) return jumper;

        return availableHand
            .filter(s => s.thickness <= 2 && !s.isCoping)
            .sort((a, b) => b.width - a.width)[0];
    }

    if (courseLevel < 15) {
        // UPPER BODY: thin stones
        return availableHand
            .filter(s => s.thickness === 1 && !s.isCoping)
            .sort((a, b) => b.width - a.width)[0];
    }

    // COPING ZONE: coping stones only
    return availableHand.find(s => s.isCoping) ||
           availableHand.sort((a, b) => a.width - b.width)[0];
}
```

### Placement Quality Checker

```javascript
function checkPlacementQuality(stone, x, y, board, stoneInfo) {
    const report = {
        score: 0,
        maxPossible: 175, // 15+35+40+20+15+50
        principles: [],
        violations: [],
        recommendations: []
    };

    const ROWS = board.length;
    const COLS = board[0].length;
    const courseLevel = ROWS - 2 - y;

    // 1. LAY FLAT
    if (stone.width >= stone.height) {
        report.score += 15;
        report.principles.push('LAY_FLAT');
    } else if (!stone.isCoping || courseLevel < 15) {
        report.violations.push('STONE_ON_END');
        report.recommendations.push('Rotate stone to lay flat');
    }

    // 2. ONE OVER TWO
    const stonesBelow = new Set();
    for (let c = x; c < x + stone.width; c++) {
        if (y + stone.height < ROWS && stoneInfo[y + stone.height][c]) {
            stonesBelow.add(stoneInfo[y + stone.height][c]);
        }
    }

    if (stonesBelow.size === 2) {
        report.score += 35;
        report.principles.push('ONE_OVER_TWO');
    } else if (stonesBelow.size === 1) {
        report.score += 8;
        report.recommendations.push('Try to bridge over a joint');
    } else if (stonesBelow.size >= 3) {
        report.violations.push('ONE_OVER_THREE_PLUS');
        report.recommendations.push('Use a narrower stone or reposition');
    }

    // 3. MIDDLE THIRD
    if (stonesBelow.size >= 1) {
        let minX = COLS, maxX = 0;
        for (let c = 0; c < COLS; c++) {
            if (y + stone.height < ROWS &&
                stonesBelow.has(stoneInfo[y + stone.height][c])) {
                minX = Math.min(minX, c);
                maxX = Math.max(maxX, c);
            }
        }
        const belowWidth = maxX - minX + 1;
        const third = belowWidth / 3;

        if (x >= minX + third && x + stone.width <= maxX + 1 - third) {
            report.score += 40;
            report.principles.push('MIDDLE_THIRD');
        }
    }

    // 4. ZIPPER JOINTS
    let hasZipper = false;
    for (const edge of [x - 1, x + stone.width]) {
        if (edge >= 0 && edge < COLS) {
            const adjacentStones = new Set();
            for (let r = y; r < y + stone.height; r++) {
                if (stoneInfo[r][edge]) {
                    adjacentStones.add(stoneInfo[r][edge]);
                }
            }
            if (adjacentStones.size >= 2) hasZipper = true;
        }
    }

    if (!hasZipper) {
        report.score += 20;
        report.principles.push('TWO_INTO_ONE');
    } else {
        report.violations.push('ZIPPER_JOINT');
        report.recommendations.push('Offset stone to break vertical joint line');
    }

    // 5. COURSING
    const expectedThickness = courseLevel < 6 ? 3 : (courseLevel < 14 ? 2 : 1);
    if (Math.abs(stone.thickness - expectedThickness) <= 1) {
        report.score += 15;
        report.principles.push('PROPER_COURSING');
    } else if (stone.thickness > expectedThickness + 1) {
        report.violations.push('HEAVY_STONE_HIGH');
        report.recommendations.push('Save thick stones for lower courses');
    }

    // 6. COPING
    if (courseLevel >= 15 && stone.isCoping) {
        report.score += 50;
        report.principles.push('PROPER_COPING');
    }

    report.percentage = Math.round((report.score / report.maxPossible) * 100);
    return report;
}
```

---

## Summary: The Perfect Stone

For maximum points, each stone placement should:

1. ✓ Be **laid flat** (width ≥ height) — except coping
2. ✓ Sit on **exactly 2 stones** below (bridging a joint)
3. ✓ Have edges in the **middle third** of stones below
4. ✓ **Not create** vertical joint lines (zipper)
5. ✓ Match the **expected thickness** for that course level
6. ✓ Be **stood on end** if it's a coping stone at the top

**Maximum bonus per stone: +175 points** (15+35+40+20+15+50)
