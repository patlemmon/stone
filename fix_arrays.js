const fs = require('fs');

const html = fs.readFileSync('/Users/PatriciusCitrus/Documents/Claude Code Projects/Stone By Stone/dry-stone-walling-game.html', 'utf8');

// Extract the 12ft array
const match12 = html.match(/WALL_SIZES\['12ft'\]\.referenceWall\s*=\s*(\[.+?\]);/);
const match6 = html.match(/WALL_SIZES\['6ft'\]\.referenceWall\s*=\s*(\[.+?\]);/);

if (!match12) { console.error('Could not find 12ft array'); process.exit(1); }
if (!match6) { console.error('Could not find 6ft array'); process.exit(1); }

const arr12 = JSON.parse(match12[1].replace(/"/g, '"'));
const arr6 = JSON.parse(match6[1].replace(/"/g, '"'));

function processArray(arr, label) {
    // Step 1: Subtract 1 from every y-coordinate (index 1)
    for (const stone of arr) {
        stone[1] = stone[1] - 1;
    }

    // Step 2: Find cheek stones at y=22, w=8, h=3, t=1 and change h from 3 to 2
    let changed = 0;
    for (const stone of arr) {
        const [x, y, w, h, t, lbl] = stone;
        if (y === 22 && w === 8 && h === 3 && t === 1 && lbl === 'c') {
            console.error(`${label}: Changing cheek stone at x=${x}, y=${y}, w=${w}, h=${h} -> h=2`);
            stone[3] = 2; // change height from 3 to 2
            changed++;
        }
    }
    console.error(`${label}: Changed ${changed} cheek stones`);
    return arr;
}

const fixed12 = processArray(arr12, '12ft');
const fixed6 = processArray(arr6, '6ft');

// Format as JS array literal
function formatArray(arr) {
    const items = arr.map(stone => {
        const parts = stone.slice(0, 5).map(v => String(v));
        if (stone.length > 5 && stone[5]) {
            parts.push(JSON.stringify(stone[5]));
        }
        return '[' + parts.join(',') + ']';
    });
    return '[' + items.join(',') + ']';
}

console.log("// === 12ft referenceWall (y-1, cheek h fix) ===");
console.log("WALL_SIZES['12ft'].referenceWall = " + formatArray(fixed12) + ";");
console.log("");
console.log("// === 6ft referenceWall (y-1, cheek h fix) ===");
console.log("WALL_SIZES['6ft'].referenceWall = " + formatArray(fixed6) + ";");
