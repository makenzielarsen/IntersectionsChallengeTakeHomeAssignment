const floorCanvas = document.getElementById("floorCanvas");
const floorContext = floorCanvas.getContext("2d");

floorCanvas.width = floorCanvas.offsetWidth;
floorCanvas.height = floorCanvas.offsetHeight;

// Layout (computed once — canvas size is fixed)
const lw = Math.min(floorCanvas.width, floorCanvas.height) / 16;
const roadSize = 8 * lw;
const roadLeft = (floorCanvas.width - roadSize) / 2;
const roadRight = (floorCanvas.width + roadSize) / 2;
const roadTop = (floorCanvas.height - roadSize) / 2;
const roadBottom = (floorCanvas.height + roadSize) / 2;
const nsX = (lane) => roadLeft + (lane - 0.5) * lw;
const ewY = (lane) => roadTop + (lane - 0.5) * lw;
const lightRadius = lw * 0.35;
const cwDepth = lw * 0.6;
const northY = roadTop - cwDepth - lw * 0.5;
const southY = roadBottom + cwDepth + lw * 0.5;
const westX = roadLeft - cwDepth - lw * 0.5;
const eastX = roadRight + cwDepth + lw * 0.5;

// Pedestrian system
const pedOff = cwDepth + lw * 0.6;
const pedCenters = {
    nw: { x: roadLeft - pedOff, y: roadTop - pedOff },
    ne: { x: roadRight + pedOff, y: roadTop - pedOff },
    sw: { x: roadLeft - pedOff, y: roadBottom + pedOff },
    se: { x: roadRight + pedOff, y: roadBottom + pedOff },
};
const pedBtnRadius = lw * 0.28;
const pedBtnOff = lw * 0.75;
const pedButtons = [
    // NW — right arrow crosses N-S road, down arrow crosses E-W road
    { x: pedCenters.nw.x + pedBtnOff, y: pedCenters.nw.y,
      angle: 0, crosswalk: "north" },
    { x: pedCenters.nw.x, y: pedCenters.nw.y + pedBtnOff,
      angle: Math.PI / 2, crosswalk: "west" },
    // NE — left arrow crosses N-S road, down arrow crosses E-W road
    { x: pedCenters.ne.x - pedBtnOff, y: pedCenters.ne.y,
      angle: Math.PI, crosswalk: "north" },
    { x: pedCenters.ne.x, y: pedCenters.ne.y + pedBtnOff,
      angle: Math.PI / 2, crosswalk: "east" },
    // SW — right arrow crosses N-S road, up arrow crosses E-W road
    { x: pedCenters.sw.x + pedBtnOff, y: pedCenters.sw.y,
      angle: 0, crosswalk: "south" },
    { x: pedCenters.sw.x, y: pedCenters.sw.y - pedBtnOff,
      angle: -Math.PI / 2, crosswalk: "west" },
    // SE — left arrow crosses N-S road, up arrow crosses E-W road
    { x: pedCenters.se.x - pedBtnOff, y: pedCenters.se.y,
      angle: Math.PI, crosswalk: "south" },
    { x: pedCenters.se.x, y: pedCenters.se.y - pedBtnOff,
      angle: -Math.PI / 2, crosswalk: "east" },
];
const pedRequests = { north: false, south: false, west: false, east: false };

const PED_WALK_FRAMES = [];
for (let i = 1; i <= 6; i++) {
    const img = new Image();
    img.src = `resources/person_walk${i}.png`;
    PED_WALK_FRAMES.push(img);
}
const PED_SPEED = 55;
const PED_SIZE = lw * 1.1;
const pedestrians = [];

// Timer
const TOTAL_SECONDS = 20;
const NUM_PHASES = 4;
let currentPhase = 0;
let secondsRemaining = TOTAL_SECONDS;
let lastTimestamp = null;
let phaseIdleTimer = 0;

// Car system
const carImage = new Image();
carImage.src = "resources/car1_spr.png";

const carW = lw * 0.7;
const carLen = lw * 1.5;
const CAR_SPEED = 120;
const CAR_GAP = 6;
const MAX_CARS = 40;

const cars = [];
let spawnTimer = 0;
let nextSpawnAt = 1.0;

const LANE_DEFS = {
    south: [
        { lane: 5, phase: 0, type: "left" },
        { lane: 6, phase: 1, type: "straight" },
        { lane: 7, phase: 1, type: "straight" },
        { lane: 8, phase: null, type: "right" },
    ],
    north: [
        { lane: 4, phase: 0, type: "left" },
        { lane: 3, phase: 1, type: "straight" },
        { lane: 2, phase: 1, type: "straight" },
        { lane: 1, phase: null, type: "right" },
    ],
    west: [
        { lane: 5, phase: 2, type: "left" },
        { lane: 6, phase: 3, type: "straight" },
        { lane: 7, phase: 3, type: "straight" },
        { lane: 8, phase: null, type: "right" },
    ],
    east: [
        { lane: 4, phase: 2, type: "left" },
        { lane: 3, phase: 3, type: "straight" },
        { lane: 2, phase: 3, type: "straight" },
        { lane: 1, phase: null, type: "right" },
    ],
};

// Right turns: sharp turn at the nearest corner of the intersection.
const TURN_INFO = {
    south_8: { turnX: nsX(8), turnY: ewY(8), exitHeading: 0 },
    north_1: { turnX: nsX(1), turnY: ewY(1), exitHeading: Math.PI },
    west_8:  { turnX: nsX(1), turnY: ewY(8), exitHeading: Math.PI / 2 },
    east_1:  { turnX: nsX(8), turnY: ewY(1), exitHeading: -Math.PI / 2 },
};

// Left turns: smooth quarter-circle arc through the intersection (CCW on screen).
// The arc center is offset to the LEFT of the approach direction so that
// simultaneous opposing left turns (e.g. NB + SB) curve around each other.
const LEFT_ARC_R = 3 * lw;
const LEFT_TURN_ARC = {
    south_5: { // NB → west
        cx: nsX(5) - LEFT_ARC_R, cy: ewY(4) + LEFT_ARC_R,
        startAngle: 0, endAngle: -Math.PI / 2,
        exitHeading: Math.PI,
    },
    north_4: { // SB → east
        cx: nsX(4) + LEFT_ARC_R, cy: ewY(5) - LEFT_ARC_R,
        startAngle: Math.PI, endAngle: Math.PI / 2,
        exitHeading: 0,
    },
    west_5: { // EB → north
        cx: nsX(5) - LEFT_ARC_R, cy: ewY(5) - LEFT_ARC_R,
        startAngle: Math.PI / 2, endAngle: 0,
        exitHeading: -Math.PI / 2,
    },
    east_4: { // WB → south
        cx: nsX(4) + LEFT_ARC_R, cy: ewY(4) + LEFT_ARC_R,
        startAngle: 3 * Math.PI / 2, endAngle: Math.PI,
        exitHeading: Math.PI / 2,
    },
};

// Right-turn cars yield to traffic from the far side of the cross road.
//   south yields to east entrance (WB traffic crossing their path)
//   north yields to west entrance (EB traffic)
//   west  yields to south entrance (NB traffic)
//   east  yields to north entrance (SB traffic)
const RIGHT_TURN_YIELD = {
    south: "east",
    north: "west",
    west:  "south",
    east:  "north",
};

// Unprotected left turns yield to oncoming straight traffic.
const LEFT_TURN_YIELD = {
    south: "north",
    north: "south",
    west:  "east",
    east:  "west",
};

function spawnPedestrian(btn) {
    const cw = btn.crosswalk;
    let startX, startY, endX, endY, flipX;

    if (cw === "north" || cw === "south") {
        const cy = cw === "north"
            ? roadTop - cwDepth / 2
            : roadBottom + cwDepth / 2;
        const goingRight = btn.angle === 0;
        startX = goingRight ? roadLeft - PED_SIZE : roadRight + PED_SIZE;
        endX = goingRight ? roadRight + PED_SIZE : roadLeft - PED_SIZE;
        startY = cy;
        endY = cy;
        flipX = goingRight;
    } else {
        const cx = cw === "west"
            ? roadLeft - cwDepth / 2
            : roadRight + cwDepth / 2;
        const goingDown = btn.angle === Math.PI / 2;
        startY = goingDown ? roadTop - PED_SIZE : roadBottom + PED_SIZE;
        endY = goingDown ? roadBottom + PED_SIZE : roadTop - PED_SIZE;
        startX = cx;
        endX = cx;
        flipX = goingDown;
    }

    pedestrians.push({
        crosswalk: cw,
        x: startX, y: startY,
        endX, endY,
        flipX,
        state: "waiting",
        animTimer: 0,
        frame: 0,
    });
    pedRequests[cw] = true;
}

function updatePedestrians(elapsed) {
    for (let i = pedestrians.length - 1; i >= 0; i--) {
        const ped = pedestrians[i];

        if (ped.state === "waiting") {
            if (isCrosswalkSafe(ped.crosswalk)) ped.state = "walking";
            continue;
        }

        // Walking — advance position
        const dx = ped.endX - ped.x;
        const dy = ped.endY - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 2) {
            pedestrians.splice(i, 1);
            continue;
        }

        const step = PED_SPEED * elapsed;
        ped.x += (dx / dist) * step;
        ped.y += (dy / dist) * step;

        // Cycle walk frames (frames index 2-5 = walk3-walk6)
        ped.animTimer += elapsed;
        if (ped.animTimer >= 0.12) {
            ped.animTimer = 0;
            ped.frame = (ped.frame + 1) % 4;
        }
    }

    // Update pedRequests: keep active while any pedestrian needs that crosswalk
    for (const cw of ["north", "south", "west", "east"]) {
        const hasPed = pedestrians.some(
            (p) => p.crosswalk === cw
        );
        if (!hasPed) pedRequests[cw] = false;
    }
}

function isCrosswalkSafe(crosswalk) {
    if (crosswalk === "north" || crosswalk === "south") {
        return currentPhase === 3 && secondsRemaining > 5;
    }
    return currentPhase === 1 && secondsRemaining > 5;
}

function isGreen(phase) {
    if (phase === null) return true;
    return phase === currentPhase && secondsRemaining > 5;
}

function hasConflictingTraffic(car) {
    const yieldTo = RIGHT_TURN_YIELD[car.entrance];

    for (const other of cars) {
        if (other.entrance !== yieldTo) continue;
        if (other.turned) continue;

        // Is this car in the intersection zone (between the two light lines)?
        let inZone = false;
        const approaching = isGreen(other.phase);
        const look = approaching ? carLen * 4 : 0;

        switch (other.entrance) {
            case "east":
                inZone = other.x > westX && other.x < eastX + look;
                break;
            case "west":
                inZone = other.x > westX - look && other.x < eastX;
                break;
            case "north":
                inZone = other.y > northY - look && other.y < southY;
                break;
            case "south":
                inZone = other.y > northY && other.y < southY + look;
                break;
        }

        if (inZone) return true;
    }
    return false;
}

function hasLeftTurnConflict(car) {
    // Check for left-turn cars from either side of the same road
    const sameRoad = (car.entrance === "south" || car.entrance === "north")
        ? ["south", "north"]
        : ["west", "east"];

    for (const other of cars) {
        if (other.type !== "left") continue;
        if (!sameRoad.includes(other.entrance)) continue;
        if (other.turned) continue;

        // Actively turning on the arc
        if (other.inArc) return true;

        // Past the light and still in the intersection box
        if (other.pastLight) {
            if (other.x > roadLeft - carLen && other.x < roadRight + carLen &&
                other.y > roadTop - carLen && other.y < roadBottom + carLen) {
                return true;
            }
        }
    }
    return false;
}

function hasOncomingStraightTraffic(car) {
    const yieldTo = LEFT_TURN_YIELD[car.entrance];

    for (const other of cars) {
        if (other.entrance !== yieldTo) continue;
        if (other.type !== "straight") continue;
        if (other.turned) continue;

        let inZone = false;
        const look = carLen * 4;

        switch (other.entrance) {
            case "east":
                inZone = other.x > westX && other.x < eastX + look;
                break;
            case "west":
                inZone = other.x > westX - look && other.x < eastX;
                break;
            case "north":
                inZone = other.y > northY - look && other.y < southY;
                break;
            case "south":
                inZone = other.y > northY && other.y < southY + look;
                break;
        }

        if (inZone) return true;
    }
    return false;
}

function hasPedRequestForPhase(phase) {
    if (phase === 1) return pedRequests.west || pedRequests.east;
    if (phase === 3) return pedRequests.north || pedRequests.south;
    return false;
}

function hasCarsWaitingForPhase(phase) {
    if (hasPedRequestForPhase(phase)) return true;
    for (const car of cars) {
        if (car.phase !== phase) continue;
        if (car.turned || car.inArc || car.pastLight) continue;
        return true;
    }
    return false;
}

function hasCarsUsingPhase(phase) {
    for (const car of cars) {
        if (car.phase !== phase) continue;
        // Car is in the intersection (actively crossing)
        if (car.pastLight && !car.turned) return true;
        if (car.inArc) return true;
        // Car is approaching and hasn't stopped (still heading to the light)
        if (!car.pastLight && !car.turned) return true;
    }
    return false;
}

function advancePhase() {
    // Try each subsequent phase; skip any with no waiting cars
    for (let attempt = 0; attempt < NUM_PHASES; attempt++) {
        const next = (currentPhase + 1 + attempt) % NUM_PHASES;
        if (hasCarsWaitingForPhase(next)) {
            currentPhase = next;
            secondsRemaining = TOTAL_SECONDS;
            phaseIdleTimer = 0;
            return;
        }
    }
    // No cars waiting anywhere — just advance normally
    currentPhase = (currentPhase + 1) % NUM_PHASES;
    secondsRemaining = TOTAL_SECONDS;
    phaseIdleTimer = 0;
}

function spawnCar() {
    if (cars.length >= MAX_CARS) return;

    const entrances = ["north", "south", "east", "west"];
    const entrance = entrances[Math.floor(Math.random() * 4)];
    const lanes = LANE_DEFS[entrance];
    const laneDef = lanes[Math.floor(Math.random() * lanes.length)];

    let x, y, heading;
    switch (entrance) {
        case "south":
            x = nsX(laneDef.lane);
            y = floorCanvas.height + carLen;
            heading = -Math.PI / 2;
            break;
        case "north":
            x = nsX(laneDef.lane);
            y = -carLen;
            heading = Math.PI / 2;
            break;
        case "west":
            x = -carLen;
            y = ewY(laneDef.lane);
            heading = 0;
            break;
        case "east":
            x = floorCanvas.width + carLen;
            y = ewY(laneDef.lane);
            heading = Math.PI;
            break;
    }

    for (const other of cars) {
        if (other.entrance !== entrance || other.lane !== laneDef.lane) continue;
        if (Math.hypot(other.x - x, other.y - y) < carLen * 2.5) return;
    }

    const newCar = {
        entrance,
        lane: laneDef.lane,
        phase: laneDef.phase,
        type: laneDef.type,
        x, y, heading,
        pastLight: false,
        turned: false,
    };

    // Attach sharp-turn info for right-turn cars
    const turnKey = `${entrance}_${laneDef.lane}`;
    const turnInfo = TURN_INFO[turnKey];
    if (turnInfo) {
        newCar.turnX = turnInfo.turnX;
        newCar.turnY = turnInfo.turnY;
        newCar.exitHeading = turnInfo.exitHeading;
    }

    // Right-turn cars must stop when adjacent straight or left-protected is active
    if (laneDef.type === "right") {
        newCar.straightPhase = { south: 1, north: 1, west: 3, east: 3 }[entrance];
        newCar.leftPhase = { south: 0, north: 0, west: 2, east: 2 }[entrance];
        newCar.stoppedAtLine = false;
        newCar.rightWait = 0;
    }

    // Left-turn cars track the adjacent straight phase for unprotected turns
    if (laneDef.type === "left") {
        newCar.straightPhase = { south: 1, north: 1, west: 3, east: 3 }[entrance];
    }

    // Attach arc info for left-turn cars
    const arcInfo = LEFT_TURN_ARC[turnKey];
    if (arcInfo) {
        newCar.arcCX = arcInfo.cx;
        newCar.arcCY = arcInfo.cy;
        newCar.arcR = LEFT_ARC_R;
        newCar.arcStart = arcInfo.startAngle;
        newCar.arcEnd = arcInfo.endAngle;
        newCar.arcExitHeading = arcInfo.exitHeading;
        newCar.inArc = false;
        newCar.arcAngle = null;
    }

    cars.push(newCar);
}

function updateCars(elapsed) {
    // Move already-turned cars freely (they left their original lane)
    for (const car of cars) {
        if (car.turned) {
            car.x += Math.cos(car.heading) * CAR_SPEED * elapsed;
            car.y += Math.sin(car.heading) * CAR_SPEED * elapsed;
            continue;
        }
        // Advance left-turn cars along their arc
        if (car.inArc) {
            car.arcAngle -= (CAR_SPEED / car.arcR) * elapsed;
            if (car.arcAngle <= car.arcEnd) {
                car.arcAngle = car.arcEnd;
                car.x = car.arcCX + car.arcR * Math.cos(car.arcEnd);
                car.y = car.arcCY + car.arcR * Math.sin(car.arcEnd);
                car.heading = car.arcExitHeading;
                car.turned = true;
                car.inArc = false;
            } else {
                car.x = car.arcCX + car.arcR * Math.cos(car.arcAngle);
                car.y = car.arcCY + car.arcR * Math.sin(car.arcAngle);
                car.heading = car.arcAngle - Math.PI / 2;
            }
        }
    }

    // Group cars still approaching by entrance + lane (exclude turned and in-arc)
    const groups = {};
    for (const car of cars) {
        if (car.turned || car.inArc) continue;
        const key = `${car.entrance}_${car.lane}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(car);
    }

    for (const key of Object.keys(groups)) {
        const group = groups[key];
        const entrance = group[0].entrance;

        // Sort: closest to intersection first
        group.sort((a, b) => {
            switch (entrance) {
                case "south": return a.y - b.y;
                case "north": return b.y - a.y;
                case "west":  return b.x - a.x;
                case "east":  return a.x - b.x;
            }
            return 0;
        });

        for (let i = 0; i < group.length; i++) {
            const car = group[i];

            // Determine whether this car can proceed
            let canGo;
            if (car.type === "right") {
                if (isGreen(car.straightPhase)) {
                    canGo = true;
                } else if (car.stoppedAtLine) {
                    canGo = !hasConflictingTraffic(car)
                        && !hasLeftTurnConflict(car);
                } else {
                    canGo = false;
                }
            } else if (car.type === "left") {
                if (isGreen(car.phase)) {
                    canGo = true;
                } else if (isGreen(car.straightPhase)
                    && !hasOncomingStraightTraffic(car)) {
                    canGo = true;
                } else {
                    canGo = false;
                }
            } else {
                canGo = isGreen(car.phase);
            }

            let newX = car.x + Math.cos(car.heading) * CAR_SPEED * elapsed;
            let newY = car.y + Math.sin(car.heading) * CAR_SPEED * elapsed;

            // Stop at light / yield line if car can't go yet
            if (!car.pastLight && !canGo) {
                switch (entrance) {
                    case "south": {
                        const stop = southY + carLen / 2 + 3;
                        if (car.y >= stop && newY < stop) newY = stop;
                        break;
                    }
                    case "north": {
                        const stop = northY - carLen / 2 - 3;
                        if (car.y <= stop && newY > stop) newY = stop;
                        break;
                    }
                    case "west": {
                        const stop = westX - carLen / 2 - 3;
                        if (car.x <= stop && newX > stop) newX = stop;
                        break;
                    }
                    case "east": {
                        const stop = eastX + carLen / 2 + 3;
                        if (car.x >= stop && newX < stop) newX = stop;
                        break;
                    }
                }
            }

            // Queue behind car ahead
            if (i > 0) {
                const ahead = group[i - 1];
                const gap = carLen + CAR_GAP;
                switch (entrance) {
                    case "south":
                        if (newY < ahead.y + gap) newY = ahead.y + gap;
                        break;
                    case "north":
                        if (newY > ahead.y - gap) newY = ahead.y - gap;
                        break;
                    case "west":
                        if (newX > ahead.x - gap) newX = ahead.x - gap;
                        break;
                    case "east":
                        if (newX < ahead.x + gap) newX = ahead.x + gap;
                        break;
                }
            }

            car.x = newX;
            car.y = newY;

            // Right-turn: only count wait time once actually at the stop line
            if (car.type === "right" && !car.stoppedAtLine && !canGo) {
                let atLine = false;
                switch (entrance) {
                    case "south":
                        atLine = car.y <= southY + carLen / 2 + 4;
                        break;
                    case "north":
                        atLine = car.y >= northY - carLen / 2 - 4;
                        break;
                    case "west":
                        atLine = car.x >= westX - carLen / 2 - 4;
                        break;
                    case "east":
                        atLine = car.x <= eastX + carLen / 2 + 4;
                        break;
                }
                if (atLine) {
                    car.rightWait += elapsed;
                    if (car.rightWait >= 0.5) car.stoppedAtLine = true;
                }
            }

            // Left-turn: enter arc when reaching the entry point
            if (car.type === "left" && car.arcCX !== undefined && !car.inArc) {
                const entryX = car.arcCX + car.arcR * Math.cos(car.arcStart);
                const entryY = car.arcCY + car.arcR * Math.sin(car.arcStart);
                let shouldEnter = false;
                switch (entrance) {
                    case "south": shouldEnter = car.y <= entryY; break;
                    case "north": shouldEnter = car.y >= entryY; break;
                    case "west":  shouldEnter = car.x >= entryX; break;
                    case "east":  shouldEnter = car.x <= entryX; break;
                }
                if (shouldEnter) {
                    car.inArc = true;
                    car.arcAngle = car.arcStart;
                    car.x = entryX;
                    car.y = entryY;
                    car.pastLight = true;
                }
            }

            // Right-turn: sharp turn at the turn point
            if (car.turnX !== undefined && !car.turned) {
                let shouldTurn = false;
                switch (entrance) {
                    case "south": shouldTurn = car.y <= car.turnY; break;
                    case "north": shouldTurn = car.y >= car.turnY; break;
                    case "west":  shouldTurn = car.x >= car.turnX; break;
                    case "east":  shouldTurn = car.x <= car.turnX; break;
                }
                if (shouldTurn) {
                    car.x = car.turnX;
                    car.y = car.turnY;
                    car.heading = car.exitHeading;
                    car.turned = true;
                    car.pastLight = true;
                }
            }

            // Mark past light (committed to crossing — won't stop again)
            if (!car.pastLight) {
                switch (entrance) {
                    case "south": if (car.y < southY) car.pastLight = true; break;
                    case "north": if (car.y > northY) car.pastLight = true; break;
                    case "west":  if (car.x > westX)  car.pastLight = true; break;
                    case "east":  if (car.x < eastX)  car.pastLight = true; break;
                }
            }
        }
    }

    // Remove off-screen cars
    for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        const margin = carLen * 3;
        if (car.x < -margin || car.x > floorCanvas.width + margin ||
            car.y < -margin || car.y > floorCanvas.height + margin) {
            cars.splice(i, 1);
        }
    }
}

// === Drawing ===

function getActiveColor(seconds) {
    if (seconds > 5) return "#22c55e";
    if (seconds > 3) return "#eab308";
    return "#ef4444";
}

function drawLight(x, y, radius, phase) {
    floorContext.beginPath();
    floorContext.arc(x, y, radius, 0, Math.PI * 2);

    let color;
    if (phase === currentPhase) {
        color = getActiveColor(secondsRemaining);
    } else if (secondsRemaining > 5
        && ((phase === 0 && currentPhase === 1)
        || (phase === 2 && currentPhase === 3))) {
        const blinkOn = Math.floor((lastTimestamp || 0) / 500) % 2 === 0;
        color = blinkOn ? "#f97316" : "#44403c";
    } else {
        color = "#ef4444";
    }

    floorContext.fillStyle = color;
    floorContext.fill();
}

function drawPedestrianSymbol(cx, cy, size, color) {
    floorContext.save();
    floorContext.translate(cx, cy);
    floorContext.strokeStyle = color;
    floorContext.fillStyle = color;
    floorContext.lineWidth = size * 0.1;
    floorContext.lineCap = "round";

    // Head
    floorContext.beginPath();
    floorContext.arc(0, -size * 0.32, size * 0.1, 0, Math.PI * 2);
    floorContext.fill();

    // Body
    floorContext.beginPath();
    floorContext.moveTo(0, -size * 0.22);
    floorContext.lineTo(size * 0.03, size * 0.08);
    floorContext.stroke();

    // Arms (walking pose)
    floorContext.beginPath();
    floorContext.moveTo(-size * 0.15, size * 0.05);
    floorContext.lineTo(0, -size * 0.1);
    floorContext.lineTo(size * 0.15, -size * 0.02);
    floorContext.stroke();

    // Legs (walking stride)
    floorContext.beginPath();
    floorContext.moveTo(-size * 0.13, size * 0.38);
    floorContext.lineTo(size * 0.03, size * 0.08);
    floorContext.lineTo(size * 0.16, size * 0.38);
    floorContext.stroke();

    floorContext.restore();
}

function drawPedButton(btn) {
    const safe = isCrosswalkSafe(btn.crosswalk);

    if (safe) {
        const blinkOn = Math.floor((lastTimestamp || 0) / 500) % 2 === 0;
        if (!blinkOn) return;

        const size = pedBtnRadius * 2.2;
        const shaft = size * 0.5;
        const head = size * 0.4;

        floorContext.save();
        floorContext.translate(btn.x, btn.y);
        floorContext.rotate(btn.angle);

        floorContext.strokeStyle = "#ffffff";
        floorContext.lineWidth = 3;
        floorContext.lineCap = "round";
        floorContext.beginPath();
        floorContext.moveTo(-shaft, 0);
        floorContext.lineTo(shaft, 0);
        floorContext.stroke();

        floorContext.fillStyle = "#ffffff";
        floorContext.beginPath();
        floorContext.moveTo(shaft + head, 0);
        floorContext.lineTo(shaft - head * 0.15, -head);
        floorContext.lineTo(shaft - head * 0.15, head);
        floorContext.closePath();
        floorContext.fill();

        floorContext.restore();
        return;
    }

    const active = pedRequests[btn.crosswalk];

    floorContext.beginPath();
    floorContext.arc(btn.x, btn.y, pedBtnRadius, 0, Math.PI * 2);
    floorContext.fillStyle = active ? "#3b82f6" : "#374151";
    floorContext.fill();
    floorContext.strokeStyle = "#6b7280";
    floorContext.lineWidth = 1.5;
    floorContext.stroke();

    const shaft = pedBtnRadius * 0.45;
    const head = pedBtnRadius * 0.3;

    floorContext.save();
    floorContext.translate(btn.x, btn.y);
    floorContext.rotate(btn.angle);

    floorContext.strokeStyle = "#ffffff";
    floorContext.lineWidth = 2;
    floorContext.lineCap = "round";
    floorContext.beginPath();
    floorContext.moveTo(-shaft, 0);
    floorContext.lineTo(shaft, 0);
    floorContext.stroke();

    floorContext.fillStyle = "#ffffff";
    floorContext.beginPath();
    floorContext.moveTo(shaft + head, 0);
    floorContext.lineTo(shaft - head * 0.2, -head);
    floorContext.lineTo(shaft - head * 0.2, head);
    floorContext.closePath();
    floorContext.fill();

    floorContext.restore();
}

function drawRightTurnArrow(cx, cy, size, rotation) {
    const r = size * 0.3;
    const straight = size * 0.35;
    const headSize = size * 0.18;

    floorContext.save();
    floorContext.translate(cx, cy);
    floorContext.rotate(rotation);

    floorContext.strokeStyle = "#d1d5db";
    floorContext.lineWidth = 2;
    floorContext.lineCap = "round";
    floorContext.beginPath();
    floorContext.moveTo(0, straight);
    floorContext.lineTo(0, 0);
    floorContext.arc(r, 0, r, Math.PI, 1.5 * Math.PI);
    floorContext.stroke();

    floorContext.fillStyle = "#d1d5db";
    floorContext.beginPath();
    floorContext.moveTo(r + headSize, -r);
    floorContext.lineTo(r - headSize * 0.4, -r - headSize * 0.6);
    floorContext.lineTo(r - headSize * 0.4, -r + headSize * 0.6);
    floorContext.closePath();
    floorContext.fill();

    floorContext.restore();
}

function drawIntersection() {
    const { width, height } = floorCanvas;

    floorContext.fillStyle = "#111827";
    floorContext.fillRect(0, 0, width, height);

    floorContext.fillStyle = "#374151";
    floorContext.fillRect(roadLeft, 0, roadSize, height);
    floorContext.fillRect(0, roadTop, width, roadSize);

    // Dashed lane dividers
    floorContext.strokeStyle = "#6b7280";
    floorContext.lineWidth = 2;
    floorContext.setLineDash([15, 10]);

    for (let i = 1; i < 8; i++) {
        if (i === 4) continue; // center line drawn separately
        const x = roadLeft + i * lw;
        floorContext.beginPath();
        floorContext.moveTo(x, 0);
        floorContext.lineTo(x, roadTop - cwDepth);
        floorContext.moveTo(x, roadBottom + cwDepth);
        floorContext.lineTo(x, height);
        floorContext.stroke();
    }
    for (let i = 1; i < 8; i++) {
        if (i === 4) continue;
        const y = roadTop + i * lw;
        floorContext.beginPath();
        floorContext.moveTo(0, y);
        floorContext.lineTo(roadLeft - cwDepth, y);
        floorContext.moveTo(roadRight + cwDepth, y);
        floorContext.lineTo(width, y);
        floorContext.stroke();
    }
    floorContext.setLineDash([]);

    // Solid yellow center lines (between lanes 4 and 5)
    floorContext.strokeStyle = "#eab308";
    floorContext.lineWidth = 4;

    const nsCenterX = roadLeft + 4 * lw;
    floorContext.beginPath();
    floorContext.moveTo(nsCenterX, 0);
    floorContext.lineTo(nsCenterX, roadTop - cwDepth);
    floorContext.moveTo(nsCenterX, roadBottom + cwDepth);
    floorContext.lineTo(nsCenterX, height);
    floorContext.stroke();

    const ewCenterY = roadTop + 4 * lw;
    floorContext.beginPath();
    floorContext.moveTo(0, ewCenterY);
    floorContext.lineTo(roadLeft - cwDepth, ewCenterY);
    floorContext.moveTo(roadRight + cwDepth, ewCenterY);
    floorContext.lineTo(width, ewCenterY);
    floorContext.stroke();

    // Crosswalks (continental style — thick white bars parallel to traffic)
    const cwBarWidth = lw * 0.55;

    floorContext.fillStyle = "#ffffff";

    // North crosswalk (just above the intersection box, aligned with corner edges)
    for (let i = 0; i < 8; i++) {
        const x = roadLeft + i * lw + (lw - cwBarWidth) / 2;
        floorContext.fillRect(x, roadTop - cwDepth, cwBarWidth, cwDepth);
    }

    // South crosswalk
    for (let i = 0; i < 8; i++) {
        const x = roadLeft + i * lw + (lw - cwBarWidth) / 2;
        floorContext.fillRect(x, roadBottom, cwBarWidth, cwDepth);
    }

    // West crosswalk
    for (let i = 0; i < 8; i++) {
        const y = roadTop + i * lw + (lw - cwBarWidth) / 2;
        floorContext.fillRect(roadLeft - cwDepth, y, cwDepth, cwBarWidth);
    }

    // East crosswalk
    for (let i = 0; i < 8; i++) {
        const y = roadTop + i * lw + (lw - cwBarWidth) / 2;
        floorContext.fillRect(roadRight, y, cwDepth, cwBarWidth);
    }

    drawLight(nsX(4), northY, lightRadius, 0);
    drawLight(nsX(3), northY, lightRadius, 1);
    drawLight(nsX(2), northY, lightRadius, 1);
    drawLight(nsX(5), southY, lightRadius, 0);
    drawLight(nsX(6), southY, lightRadius, 1);
    drawLight(nsX(7), southY, lightRadius, 1);

    drawLight(eastX, ewY(4), lightRadius, 2);
    drawLight(eastX, ewY(3), lightRadius, 3);
    drawLight(eastX, ewY(2), lightRadius, 3);
    drawLight(westX, ewY(5), lightRadius, 2);
    drawLight(westX, ewY(6), lightRadius, 3);
    drawLight(westX, ewY(7), lightRadius, 3);

    const arrowSize = lw * 0.8;
    drawRightTurnArrow(nsX(8), southY, arrowSize, 0);
    drawRightTurnArrow(nsX(1), northY, arrowSize, Math.PI);
    drawRightTurnArrow(westX, ewY(8), arrowSize, Math.PI / 2);
    drawRightTurnArrow(eastX, ewY(1), arrowSize, 3 * Math.PI / 2);

    // Pedestrian symbols and crossing buttons at the four corners
    const pedSize = lw * 0.9;
    const pedSafe = (currentPhase === 1 || currentPhase === 3)
        && secondsRemaining > 5;
    const pedColor = pedSafe ? "#ffffff" : "#44403c";
    for (const key of Object.keys(pedCenters)) {
        const c = pedCenters[key];
        drawPedestrianSymbol(c.x, c.y, pedSize, pedColor);
    }
    for (const btn of pedButtons) {
        drawPedButton(btn);
    }
}

function drawCars() {
    if (!carImage.complete) return;

    for (const car of cars) {
        floorContext.save();
        floorContext.translate(car.x, car.y);
        floorContext.rotate(car.heading + Math.PI);
        floorContext.scale(1, -1);
        floorContext.drawImage(
            carImage,
            -carLen / 2, -carW / 2,
            carLen, carW
        );
        floorContext.restore();
    }
}

function drawPedestrians() {
    for (const ped of pedestrians) {
        const frameIdx = ped.state === "waiting" ? 0 : 2 + ped.frame;
        const img = PED_WALK_FRAMES[frameIdx];
        if (!img.complete) continue;

        floorContext.save();
        floorContext.translate(ped.x, ped.y);
        if (ped.flipX) floorContext.scale(-1, 1);
        floorContext.drawImage(
            img,
            -PED_SIZE / 2, -PED_SIZE / 2,
            PED_SIZE, PED_SIZE
        );
        floorContext.restore();
    }
}

function draw() {
    drawIntersection();
    drawPedestrians();
    drawCars();
}

function tick(timestamp) {
    if (lastTimestamp !== null) {
        const elapsed = (timestamp - lastTimestamp) / 1000;

        secondsRemaining -= elapsed;
        if (secondsRemaining <= 0) {
            advancePhase();
        }

        // Early phase change: if green and no cars using or approaching for 3s
        if (secondsRemaining > 5) {
            if (hasCarsUsingPhase(currentPhase)) {
                phaseIdleTimer = 0;
            } else {
                phaseIdleTimer += elapsed;
                if (phaseIdleTimer >= 3) {
                    advancePhase();
                }
            }
        }

        updatePedestrians(elapsed);

        spawnTimer += elapsed;
        if (spawnTimer >= nextSpawnAt) {
            spawnCar();
            spawnTimer = 0;
            nextSpawnAt = 0.5 + Math.random() * 1.5;
        }

        updateCars(elapsed);
    }
    lastTimestamp = timestamp;
    draw();
    requestAnimationFrame(tick);
}

function canvasCoords(e) {
    const rect = floorCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (floorCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (floorCanvas.height / rect.height),
    };
}

function hitButton(mx, my) {
    for (const btn of pedButtons) {
        const dx = mx - btn.x;
        const dy = my - btn.y;
        if (dx * dx + dy * dy <= pedBtnRadius * pedBtnRadius) return btn;
    }
    return null;
}

floorCanvas.addEventListener("click", (e) => {
    const { x, y } = canvasCoords(e);
    const btn = hitButton(x, y);
    if (btn) spawnPedestrian(btn);
});

floorCanvas.addEventListener("mousemove", (e) => {
    const { x, y } = canvasCoords(e);
    floorCanvas.style.cursor = hitButton(x, y) ? "pointer" : "default";
});

draw();
requestAnimationFrame(tick);
