# Traffic Intersection Simulator

Vanilla JS canvas app simulating a 4-way intersection with traffic lights, lanes, and cars.

## Stack

- Plain HTML/CSS/JS, no build tools or dependencies
- Single-page app: `index.html` loads `index.css` and `index.js` (deferred)
- Sprites in `resources/`: `car1_spr.png` (top-down, faces left), `person_walk1-6.png` (pedestrian frames)
- Open `index.html` directly in a browser to run

## Architecture

All logic lives in `index.js`:
- **Layout constants** computed once from canvas size (lane width, road boundaries, light positions)
- **Timer system** cycles through 4 traffic phases with smart skip/early-cutoff
- **Car system** handles spawning, movement, stopping, queuing, and turning
- **Pedestrian system** handles button clicks, spawn/walk/removal, car/ped yielding
- **Draw loop** via `requestAnimationFrame` redraws intersection, cars, and pedestrians each frame

## Key conventions

- The car sprite faces **left** — drawing applies `rotate(heading + PI)` and `scale(1, -1)`
- Lane width = `min(canvasWidth, canvasHeight) / 16`
- Positions like `northY`, `southY`, `westX`, `eastX` are the **light positions**, which sit beyond the crosswalks in the approach strips
- `pastLight` flag means a car has committed to crossing — it never stops again
- `turned` flag means a car completed its turn and moves freely in the new heading
- `inArc` flag means a left-turn car is actively traversing its quarter-circle arc
- Right-turn cars always stop before turning, except when adjacent straight lanes are green
- Left-turn cars go on their protected phase OR during the adjacent straight phase (blinking orange) when no oncoming straight traffic
- `rightWait` timer only increments after the car reaches the stop line (not from spawn)
- Pedestrians spawn on button click, wait for safety + no right-turn cars, then walk across
- Cars and pedestrians yield to each other at crosswalks
