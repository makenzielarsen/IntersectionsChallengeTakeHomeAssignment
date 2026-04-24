---
name: traffic-patterns
description: Use when working on the traffic intersection simulation — lane layouts, car movement directions, turn paths, traffic phases, light timing, or any question about how cars flow through the intersection. Trigger phrases include "intersection", "lanes", "traffic light", "turn", "phase", "crosswalk", "right on red", "protected left".
user-invocable: false
---

# Traffic Intersection Patterns

This project simulates a 4-way intersection viewed from above on an HTML canvas.

## Road Layout

Two roads cross at the center forming a plus/cross shape:

- **N-S road**: 8 vertical lanes, centered horizontally on the canvas
- **E-W road**: 8 horizontal lanes, centered vertically on the canvas
- **Intersection box**: the square where both roads overlap
- **Corner squares**: blank (non-road) areas at the 4 corners

Lane width is `min(canvasWidth, canvasHeight) / 16`. Both roads use the same lane width so the intersection box is square.

## Lane Numbering (per road, from left/top)

Each road has 8 lanes split between two traffic directions:

### N-S Road (lanes numbered west to east)
| Lanes | Direction | Traffic flows |
|-------|-----------|---------------|
| 1-4   | Southbound | North to south (top to bottom) |
| 5-8   | Northbound | South to north (bottom to top) |

### E-W Road (lanes numbered top to bottom)
| Lanes | Direction | Traffic flows |
|-------|-----------|---------------|
| 1-4   | Westbound | East to west (right to left) |
| 5-8   | Eastbound | West to east (left to right) |

The yellow center line divides lanes 4 and 5 on both roads.

## Lane Assignments per Entrance

Each entrance has 4 active lanes (the other 4 carry opposing outbound traffic):

### South entrance (northbound traffic, lanes 5-8)
| Lane | Type | Phase | Behavior |
|------|------|-------|----------|
| 5 | Protected left | 0 | Turns west onto E-W road (arc through intersection center) |
| 6 | Straight | 1 | Goes straight north, exits top |
| 7 | Straight | 1 | Goes straight north, exits top |
| 8 | Right turn | — | Turns east at bottom-right corner of intersection |

### North entrance (southbound traffic, lanes 4-1)
| Lane | Type | Phase | Behavior |
|------|------|-------|----------|
| 4 | Protected left | 0 | Turns east onto E-W road |
| 3 | Straight | 1 | Goes straight south, exits bottom |
| 2 | Straight | 1 | Goes straight south, exits bottom |
| 1 | Right turn | — | Turns west at top-left corner |

### West entrance (eastbound traffic, lanes 5-8)
| Lane | Type | Phase | Behavior |
|------|------|-------|----------|
| 5 | Protected left | 2 | Turns north onto N-S road |
| 6 | Straight | 3 | Goes straight east, exits right |
| 7 | Straight | 3 | Goes straight east, exits right |
| 8 | Right turn | — | Turns south at bottom-left corner |

### East entrance (westbound traffic, lanes 4-1)
| Lane | Type | Phase | Behavior |
|------|------|-------|----------|
| 4 | Protected left | 2 | Turns south onto N-S road |
| 3 | Straight | 3 | Goes straight west, exits left |
| 2 | Straight | 3 | Goes straight west, exits left |
| 1 | Right turn | — | Turns north at top-right corner |

## Traffic Signal Phases

4 phases cycle in order. Each phase runs for up to 20 seconds with smart timing:

| Phase | Name | Lights | Lanes served |
|-------|------|--------|-------------|
| 0 | N/S Left Protected | 2 lights | North lane 4 + South lane 5 |
| 1 | N/S Straight | 4 lights | North lanes 2-3 + South lanes 6-7 |
| 2 | E/W Left Protected | 2 lights | East lane 4 + West lane 5 |
| 3 | E/W Straight | 4 lights | East lanes 2-3 + West lanes 6-7 |

### Light colors (per phase timer)
- **Green**: > 5 seconds remaining
- **Yellow**: 3-5 seconds remaining
- **Red**: < 3 seconds remaining

### Smart timing
- **Skip empty phases**: when transitioning, skip any phase with no waiting cars AND no pedestrian requests for that phase
- **Early cutoff**: if green and no cars have used the lanes for 3 seconds, advance early
- **Pedestrian override** (`hasPedRequestForPhase`): phase 1 checks west/east pedestrian requests, phase 3 checks north/south — prevents skipping phases that pedestrians need

## Turn Mechanics

### Right turns
- **Path**: sharp 90-degree turn at the nearest corner of the intersection box
- **Green straight exception**: if adjacent straight lanes are green (`isGreen(car.straightPhase)`), the car proceeds without stopping
- **Otherwise always stop**: car must stop (0.5s via `rightWait` timer, incremented only after reaching the stop line) before turning
- **Yield after stop**: check for cross-traffic (`hasConflictingTraffic`) AND left-turn cars on the same road (`hasLeftTurnConflict`) before proceeding
- **Yield to pedestrians**: highest priority — if a pedestrian is walking on the exit crosswalk (`hasPedestrianOnCrosswalk`), the car will not go regardless of light state
- **Yield direction**: south/north right-turners yield to east/west traffic; west/east right-turners yield to south/north traffic
- **Crosswalk mapping** (`RIGHT_TURN_CROSSWALK`): south→east, north→west, west→south, east→north

### Left turns (protected + unprotected)
- **Path**: smooth quarter-circle arc (radius = 3 lane widths) through the intersection
- **Arc direction**: counterclockwise on screen (left turn)
- **Arc center**: offset to the left of approach direction so opposing left turns curve around each other without colliding
- **Protected phase**: moves on green during own phase (0 or 2)
- **Unprotected (blinking orange)**: during the adjacent straight phase (phase 1 for N/S lefts, phase 3 for E/W lefts), the left-turn light blinks orange (500ms on/off). Cars may turn if no oncoming straight traffic (`hasOncomingStraightTraffic` checks the opposing entrance via `LEFT_TURN_YIELD`)
- **Yellow cutoff**: when the straight phase enters yellow (≤5s remaining), the blinking orange becomes solid red — cars that haven't passed the light must stop
- **Yield mapping** (`LEFT_TURN_YIELD`): south→north, north→south, west→east, east→west

### Straight
- **Path**: straight line through the intersection
- **Only move on green**: controlled by their phase (1 or 3)

## Car Lifecycle

1. **Spawn** at canvas edge in a random entrance/lane (every 0.5-2s)
2. **Approach** the stop line at constant speed
3. **Stop** if light is red/yellow (or always for right turns)
4. **Queue** behind the car ahead with a gap
5. **Enter intersection** when allowed (green light, no conflicts)
6. **Turn** at the designated point (arc for left, sharp for right, straight through for straight)
7. **Exit** off the opposite edge of the canvas
8. **Removed** when fully off-screen

## Pedestrian System

### Visual elements
- **Pedestrian symbols**: stick figures at each of the 4 corners, positioned just outside the crosswalk boundaries in the corner squares
- **Symbol color**: white when safe to cross (straight phase green), dark grey (`#44403c`) otherwise
- **Arrow buttons**: 2 per corner (8 total), each pointing toward the crosswalk it activates. Clicking toggles a `pedRequests` entry

### Button layout (per corner)
| Corner | Button 1 | Button 2 |
|--------|----------|----------|
| NW | Right arrow → north crosswalk | Down arrow → west crosswalk |
| NE | Left arrow → north crosswalk | Down arrow → east crosswalk |
| SW | Right arrow → south crosswalk | Up arrow → west crosswalk |
| SE | Left arrow → south crosswalk | Up arrow → east crosswalk |

### Crosswalk safety (`isCrosswalkSafe`)
- **North/south crosswalks**: safe during phase 3 (E/W straight) while green (>5s remaining)
- **West/east crosswalks**: safe during phase 1 (N/S straight) while green (>5s remaining)

### Pedestrian sprites
- 6 frames in `resources/person_walk1-6.png` (frames 1-2 idle, 3-6 walking)
- Clicking a button spawns a pedestrian at the corner edge of the crosswalk in "waiting" state (frame 1)
- When `isCrosswalkSafe` AND no right-turn car in the crosswalk (`hasRightTurnCarInCrosswalk`), pedestrian starts walking at 55px/s, cycling frames 3-6 at ~8fps
- Sprite flipped horizontally based on walking direction (faces direction of travel)
- Removed when reaching the far side
- `pedRequests` cleared per-crosswalk only when no pedestrians remain on that crosswalk

### Safe crossing indicator
- When crosswalk is safe, active button becomes a large flashing white arrow (2.2x size, 500ms blink)
- When not safe, renders as a normal circle button (blue when active)

### Car/pedestrian interaction
- **Cars yield to pedestrians**: right-turn `canGo` checks `hasPedestrianOnCrosswalk` as highest priority
- **Pedestrians yield to cars**: pedestrians in "waiting" state check `hasRightTurnCarInCrosswalk` before starting to walk
- **Crosswalk mapping** (`CROSSWALK_RIGHT_TURN_SOURCE`): east→south, west→north, south→west, north→east (which entrance's right-turn cars cross each crosswalk)

## Road Markings

- **Lane dividers**: dashed white lines between lanes within each direction
- **Solid lane markers**: at turn/straight boundaries (dividers 1, 3, 5, 7) — inner half (intersection to midpoint) is solid, outer half (midpoint to canvas edge) is dashed
- **Center line**: double solid yellow between lanes 4 and 5 on both roads (two 2px lines offset 3px from center)
- **Crosswalks**: continental style (8 thick white bars per crosswalk), positioned outside the intersection box in the approach strips

## Key Positions

- **Lights/arrows**: positioned beyond the crosswalks, in the approach strips
- **Crosswalks**: continental style (white bars), just outside the intersection box, aligned with corner square boundaries
- **Stop lines**: cars stop with their front edge at the light circle position
- **`pastLight` flag**: set when a car passes the light position; once set, the car never stops again (committed to crossing)
