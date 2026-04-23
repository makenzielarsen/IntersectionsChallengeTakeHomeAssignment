# Traffic Intersection Simulator

Vanilla JS canvas app simulating a 4-way intersection with traffic lights, lanes, and cars.

## Stack

- Plain HTML/CSS/JS, no build tools or dependencies
- Single-page app: `index.html` loads `index.css` and `index.js` (deferred)
- Car sprite: `car1_spr.png` (top-down, faces left)
- Open `index.html` directly in a browser to run

## Architecture

All logic lives in `index.js`:
- **Layout constants** computed once from canvas size (lane width, road boundaries, light positions)
- **Timer system** cycles through 4 traffic phases with smart skip/early-cutoff
- **Car system** handles spawning, movement, stopping, queuing, and turning
- **Draw loop** via `requestAnimationFrame` redraws intersection then cars each frame

## Key conventions

- The car sprite faces **left** — drawing applies `rotate(heading + PI)` and `scale(1, -1)`
- Lane width = `min(canvasWidth, canvasHeight) / 16`
- Positions like `northY`, `southY`, `westX`, `eastX` are the **light positions**, which sit beyond the crosswalks in the approach strips
- `pastLight` flag means a car has committed to crossing — it never stops again
- `turned` flag means a car completed its turn and moves freely in the new heading
- `inArc` flag means a left-turn car is actively traversing its quarter-circle arc
- Right-turn cars always stop before turning; left-turn cars only go on their protected phase
