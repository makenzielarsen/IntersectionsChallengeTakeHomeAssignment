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
- **Skip empty phases**: when transitioning, skip any phase with no waiting cars
- **Early cutoff**: if green and no cars have used the lanes for 3 seconds, advance early

## Turn Mechanics

### Right turns
- **Path**: sharp 90-degree turn at the nearest corner of the intersection box
- **Always stop**: cars must come to a full stop (0.5s) before turning, regardless of light state
- **Yield**: after stopping, check for cross-traffic (`hasConflictingTraffic`) AND left-turn cars on the same road (`hasLeftTurnConflict`) before proceeding
- **Yield direction**: south/north right-turners yield to east/west traffic; west/east right-turners yield to south/north traffic

### Left turns (protected)
- **Path**: smooth quarter-circle arc (radius = 3 lane widths) through the intersection
- **Arc direction**: counterclockwise on screen (left turn)
- **Arc center**: offset to the left of approach direction so opposing left turns curve around each other without colliding
- **Only move on green**: controlled by their phase (0 or 2)

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

## Key Positions

- **Lights/arrows**: positioned beyond the crosswalks, in the approach strips
- **Crosswalks**: continental style (white bars), just outside the intersection box, aligned with corner square boundaries
- **Stop lines**: cars stop with their front edge at the light circle position
- **`pastLight` flag**: set when a car passes the light position; once set, the car never stops again (committed to crossing)
