# Software Design Document — Software Empire

**Version:** 0.1.0  
**Status:** Living document — updated as the codebase evolves.

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [System Architecture](#3-system-architecture)
4. [Module Specifications](#4-module-specifications)
   - 4.1 [Game Bootstrap](#41-game-bootstrap)
   - 4.2 [State Layer](#42-state-layer)
   - 4.3 [Systems](#43-systems)
   - 4.4 [Scenes](#44-scenes)
   - 4.5 [Entities](#45-entities)
   - 4.6 [UI Panels](#46-ui-panels)
   - 4.7 [UI Widgets](#47-ui-widgets)
5. [Data Models](#5-data-models)
6. [Event Catalog](#6-event-catalog)
7. [Key Algorithms](#7-key-algorithms)
8. [Configuration Reference](#8-configuration-reference)
9. [Known Gaps & Future Work](#9-known-gaps--future-work)

---

## 1. Purpose & Scope

This document describes the internal design of *Software Empire* — a browser-based tycoon game where the player manages a software consultancy. It covers:

- How the application bootstraps and how the frame loop is structured.
- The responsibilities and interfaces of every module.
- The shape of all mutable game state.
- The EventBus contract (all events, emitters, listeners, payloads).
- The core gameplay algorithms (skill-point accrual, economy pipeline, weather modifier).
- A full configuration reference.
- Known deficiencies and planned work.

This document is intended for developers working on the codebase. For player-facing feature documentation see `README.md`; for a visual architecture overview see `ARCHITECTURE.md`.

---

## 2. Goals & Non-Goals

### Goals (current scope)

- Single-player, single-office tycoon loop running entirely in the browser.
- Day-based simulation with configurable time controls.
- Project-based revenue model with manual employee assignment.
- Research tree that gates skill availability and upgrades.
- Persistent within a browser session; "New Game" provides a full in-memory reset.

### Non-Goals (out of scope for v0.1)

- Persistent save/load (localStorage or server-side).
- Multiplayer.
- Office tier upgrade mechanics (data exists; upgrade action not yet implemented).
- Sound and music.
- Animations beyond floating labels and idle/typing body-color swap.
- Mobile / touch input.
- Any backend or network calls.

---

## 3. System Architecture

See `ARCHITECTURE.md` for diagrams. Summary:

- **Entry point:** `main.js` instantiates `Game`, handles DOM lifecycle, and exposes `window.__GAME__` in dev mode.
- **Game:** Owns the Pixi `Application`, all managers, `SceneManager`, and `Simulation`. The Pixi Ticker drives `Game._onTick` at 60 FPS.
- **Simulation:** Coordinates all gameplay systems and owns the single `Company` state object.
- **EventBus:** The only cross-module communication channel. All important state transitions produce events; UI subscribes via `BaseScene.listen()` (auto-cleaned on scene exit).
- **Rendering:** PixiJS (WebGL/WebGPU). All UI is drawn with `Graphics` and `Text` primitives — no DOM elements, no HTML Canvas 2D, no CSS.

---

## 4. Module Specifications

### 4.1 Game Bootstrap

#### `src/main.js`

Bootstraps the DOM: creates `Game`, awaits `game.init()`, hides/removes the `#loading` overlay, and registers global `error` / `unhandledrejection` handlers for dev diagnostics.

**Exports:** none (side-effect module).

#### `src/Game.js` — `Game`

The application root. Instantiated once.

| Responsibility | Implementation |
|---|---|
| Create Pixi `Application` and mount to `#game` | `game.init()` |
| Provide shared `EventBus` | `game.events` |
| Manage asset loading | `AssetManager` |
| Track keyboard/pointer input | `InputManager` |
| Own and drive `SceneManager` | `game.scenes` |
| Own and drive `Simulation` | `game.sim` |
| Forward `window.resize` to scene | `_onResize` → `scenes.resize` |
| Drive frame loop | `app.ticker` → `_onTick` |

**Key method — `_onTick(ticker)`:**
```
dt = ticker.deltaMS / 1000 * GameConfig.loop.timeScale
game.sim.update(dt)
game.scenes.update(dt)
game.input.postUpdate()
```

---

### 4.2 State Layer

All state objects are plain JS objects produced by factory functions. No class instances. Systems mutate fields directly; the UI reads them at render time.

#### `src/state/Company.js` — `createCompany()`

Returns the root aggregate. See [Data Models — Company](#company) for field table. Also exports helper functions:

| Function | Returns |
|---|---|
| `usedDesks(company)` | `employees.length` |
| `freeDesks(company)` | `office.desks - usedDesks` |
| `dailySalaryCost(company)` | Sum of all `employee.salary` |
| `estimatedDailyProfit(company)` | `-dailySalaryCost` (revenue not tracked intra-day) |

#### `src/state/Employee.js` — `createEmployee(opts)`

Returns an employee with randomised `baseProductivity` in `[BASE_PRODUCTIVITY_MIN, BASE_PRODUCTIVITY_MAX]`.

Exports:
- `SCHEDULE_CYCLE = ['WORK', 'BREAK', 'WORK', 'TALK']` — the repeating 15-minute pattern.
- `employeeTotalPoints(employee, pointsPerLevel)` — theoretical daily output.
- `matchingSkills(employee, project)` — skills the employee holds that have open requirements on the project.

#### `src/state/Project.js` — `createProject(template)`

Copies template metadata and initialises `requirements[].current = 0`. Lifecycle flags:

| Flag | Meaning |
|---|---|
| `isActive` | Player has accepted the project |
| `isReadyToFinish` | All requirements met; awaiting player collection |
| `isCompleted` | Player has collected the payout |

Exports: `projectProgress`, `projectTotalPoints`, `projectCurrentPoints`, `isProjectComplete`.

#### `src/state/Office.js` — `createOffice(tierIndex)`

Returns `{ tierIndex, desks, name }` from `OFFICE_TIERS[tierIndex]`. Exports `getNextOfficeTier(office)`.

#### `src/state/Candidate.js` — `createCandidate(opts)`

Hire-pool entry. Same field shape as Employee minus runtime fields (`activeProjectId`, `workBuffer`, etc.). Candidate generation (random skills, median salary) is handled by `EmployeeGenerator`, not this module.

---

### 4.3 Systems

All systems are classes instantiated by `Simulation`. They receive `company` as a parameter rather than holding a reference, keeping them stateless and testable.

#### `src/systems/TimeSystem.js` — `TimeSystem`

| Field | Type | Description |
|---|---|---|
| `gameSpeed` | number | Current multiplier (0 = paused) |
| `dayProgress` | number | 0..1 fraction of day elapsed |

**`update(dt, company)`** — Advances `dayProgress` by `(dt × gameSpeed) / DAY_DURATION_SECONDS`. Emits `day:tick` every frame; emits `day:ended` once when `dayProgress >= 1`.

**`fastForward(company)`** — Immediately sets `dayProgress = 1` and triggers end-of-day (used by "End Day" button).

**`beginNextDay(company)`** — Increments `company.day`, resets `dayProgress = 0`, sets `gameSpeed = 0` (auto-pause), emits `day:began`.

**`getCurrentTimeString(schedule)`** — Maps `dayProgress` to a 12-hour clock string snapped to 15-minute increments.

---

#### `src/systems/ProjectSystem.js` — `ProjectSystem`

**`update(dt, speed, company, productivity)`** — Per-frame SP accrual. See [Key Algorithms — SP Accrual](#sp-accrual) for the formula.

**`flushWorkPeriod(company)`** — Applies buffered SP to project requirements, checks for completion, emits `project:completed` (ready) + `notification:add`. Resets all employee buffers. Returns `Map<employeeIndex, totalPts>` for floating labels.

---

#### `src/systems/EconomySystem.js` — `EconomySystem`

Runs once per `day:ended`. Order of operations:

1. Deduct `dailySalaryCost(company)` from `company.money`.
2. Add `company.pendingPayout` to `company.money` and reset it.
3. Add `company.rdPointsPerDay` to `company.rdPoints`.
4. Move `isCompleted` projects from `activeProjects` to `completedProjects`.
5. Emit `notification:add` for salary deduction.
6. Emit `notification:add` (warning) if `money < MONEY_WARNING_THRESHOLD`.
7. Emit `economy:bankrupt` + `notification:add` (critical) if `money <= BANKRUPTCY_THRESHOLD`.

---

#### `src/systems/EmployeeGenerator.js` — `EmployeeGenerator`

Procedural candidate factory. Does not hold state; all methods are pure.

| Method | Returns |
|---|---|
|| `generateCandidate(unlockedSkills, rng?)` | A `Candidate` with 1–2 random skills (level 1–5) and a median salary |
|| `generateStarterEmployee()` | Named starter employee from `employeeCatalog.json` |
|| `generateStarterCandidates()` | Named starter candidate pool from `employeeCatalog.json` |

Salary is computed by `computeMedianSalary(skills)` in `src/economy/balance.js`:
`salary = totalDailySP × spValue × salaryRatio`.

---

#### `src/systems/ProjectGenerator.js` — `ProjectGenerator`

Procedural project factory. Reads entries from `projectCatalog.json` and computes all numeric values at runtime.

| Method | Returns |
|---|---|
|| `generateFromCatalog(entry, teamOutput, difficulty)` | A project template with SP, payout, insurance, and milestones |
|| `generatePool(company, size?)` | A pool of project templates scaled to current team output and difficulty |
|| `generateStarterPool()` | A starter pool using a fixed `STARTER_TEAM_OUTPUT = 16` SP/day |

`totalSp = round(teamOutput × difficultyMultiplier)`. SP is then distributed evenly across the project's required skills.

---

#### `src/economy/balance.js`

Pure balance helpers used by both generators. No side effects, no game state.

| Export | Purpose |
|---|---|
|| `dailySpForSkill(level)` | SP per WORK period for a given skill level |
|| `computeMedianSalary(skills)` | Median daily salary for an employee's skill set |
|| `computeMedianPayout(totalSp)` | Base project payout for a given total SP |
|| `computeProjectTiming(totalSp, tier)` | Milestone deadlines and insurance amount |
|| `computeTeamOutput(employees)` | Sum of daily SP across all employee skills (defaults to 16 if no team) |
|| `pickDifficulty(rng?)` | Weighted random difficulty key: `'common'` (3), `'uncommon'` (2), `'rare'` (1) |
|| `getDifficultyConfig(key)` | `{ label, spMultiplier, weight }` for a difficulty key |

---

#### `src/systems/HiringSystem.js` — `HiringSystem`

**`refreshCandidates(company)`** — Generates a new `CANDIDATE_POOL_SIZE`-sized pool of candidates via `EmployeeGenerator.generateCandidate()`, filtered to the company's current `unlockedResearch`.

**`hire(company, candidate)`** — Moves candidate to `company.employees`; fails if no free desk. Emits `employee:hired`.

**`fire(company, employee)`** — Removes from `company.employees`; clears `pinnedProjectId` and `activeProjectId`. Emits `employee:fired`.

---

#### `src/systems/ProductivitySystem.js` — `ProductivitySystem`

**`rollDailyWeather(company)`** — Picks a random entry from `WEATHER_TYPES` and assigns it to `company.currentWeather`.

**`getTotalProductivity(employee, company)`** — Returns `employee.baseProductivity × company.currentWeather.modifier`.

---

#### `src/systems/NotificationSystem.js` — `NotificationSystem`

Maintains `notifications[]` as a ring buffer capped at `ACTIVITY_LOG_MAX`. Listens to `notification:add` via `init()`; unsubscribes via `destroy()`. The right widget bar reads `notifications` directly.

---

#### `src/systems/SceneManager.js` — `SceneManager`

Manages scene transitions. All scenes are registered by class at startup; `changeTo(name)` runs: `exit` current → `preload` next → add to stage → `enter` → `resize`.

---

### 4.4 Scenes

Both scenes extend `BaseScene` which provides `game`, `root` (stage container), and `listen(event, handler)` (auto-unsubscribing EventBus wrapper).

#### `src/scenes/MainMenuScene.js` — `MainMenuScene`

Static title screen. "New Game" calls `game.sim.reset()` then `game.scenes.changeTo('office')`. "Continue" and "Settings" are stubs.

#### `src/scenes/OfficeScene.js` — `OfficeScene`

The main gameplay scene. Responsibilities:

| Area | Mechanism |
|---|---|
| Layout | Five layered containers (world, popup, modal, hud, toasts) |
| Office grid | `_rebuildOffice()` creates/destroys entities on roster changes |
| Frame sync | `update()` pushes schedule state and project assignment into each `EmployeeEntity` |
| WORK flush | Detects 15-min slot change; calls `sim.projects.flushWorkPeriod` on WORK→non-WORK |
| HUD refresh | Accumulates 0.2 s, then calls `refresh()` on all HUD widgets |
| Navigation | `_navigate(id)` opens modal panels; sidebar calls this |
| Toasts | `_spawnToast` / `_tickToasts` manage lifetime and layout |
| Popups | Employee stats, schedule editor, weather — all opened via pointer events |

---

### 4.5 Entities

Entities are Pixi display objects managed by `OfficeScene`. They have no knowledge of game state; `OfficeScene` pushes state into them each frame.

#### `src/entities/Entity.js`

Base class wrapping a Pixi `Container` with an auto-incremented `id` and a placeholder `Graphics` rect.

#### `src/entities/DeskEntity.js` — `DeskEntity`

Renders a desk + monitor. `setOccupied(bool)` switches appearance. `setActive(bool)` is defined but currently empty (glow effect pending).

Exports: `DeskEntity`, `DESK_W = 120`, `DESK_H = 100`.

#### `src/entities/EmployeeEntity.js` — `EmployeeEntity`

Renders a stylised employee figure. Public API:

| Method | Effect |
|---|---|
| `setState('idle'\|'typing')` | Body color: grey vs blue |
| `setHasProject(bool)` | `false` → ⚠ icon; `true` → schedule icon |
| `setScheduleState('WORK'\|'BREAK'\|'TALK')` | Updates 💻/☕/💬 icon (when assigned) |
| `setSelected(bool)` | Name label highlight |
| `setOnClick(cb)` | Registers pointer handlers |
| `showPoints(n)` | Spawns floating "+N pts" label |
| `update(dt)` | Animates and fades the points label |

#### `src/entities/BuyDeskEntity.js` — `BuyDeskEntity`

Interactive tile shown at the end of the desk row when all desks are occupied. Calls its callback → `Simulation.buyDesk()` on click when affordable. Exposes `_canAfford` (read by `OfficeScene._refreshBuyDesk` to decide whether to rebuild).

---

### 4.6 UI Panels

Panels are Pixi `Container` subclasses loaded into `Modal`. They implement the `init / resize / refresh` contract.

#### `ProjectsPanel`

Two-column grid of active and available projects. Each active card shows per-skill progress bars; if `isReadyToFinish`, shows a **Collect** button → `sim.finishProject`. Available cards have Accept / Reject buttons.

#### `AssignmentPanel`

Chip-based assignment UI. One "Available" row lists unassigned employees as selectable chips. Each active project has a row acting as a drop zone. Click unassigned chip → select; click project row → `sim.assignEmployee`; click assigned chip → `sim.unassignEmployee`.

#### `HiringPanel`

Candidate cards with Hire buttons. Validates desk availability before calling `sim.hireCandidate`.

#### `EmployeesPanel`

Roster cards with Fire buttons → `sim.fireEmployee`. Each card also shows the employee's available skill points and, when skill points are available, displays upgrade buttons for each skill — identical functionality to the `EmployeeStatsPopup` skill upgrade section. Cards use dynamic height to accommodate the variable-length upgrade section.

#### `ResearchPanel`

Renders the research DAG. Each node shows cost, icon, name, unlock status, and dependency state. Click unlockable node → `sim.unlockResearch`.

---

### 4.7 UI Widgets

Widgets are persistent Pixi objects owned by `OfficeScene` (not re-created per scene). They read from `game.sim.company` directly on `refresh()`.

| Widget | File | Key responsibility |
|---|---|---|
| `TopBarHUD` | `ui/TopBarHUD.js` | Cash, day, R&D, weather chip, speed controls, progress bar |
| `LeftSidebar` | `ui/LeftSidebar.js` | Navigation buttons; `setActive(id)` highlights current view |
| `RightWidgetBar` | `ui/RightWidgetBar.js` | Activity feed + in-progress project cards with quick-collect |
| `Modal` | `ui/Modal.js` | Backdrop + titled scrollable window; forwards wheel events |
| `EmployeeStatsPopup` | `ui/EmployeeStatsPopup.js` | Per-employee detail card; positioned near clicked desk |
| `SchedulePopup` | `ui/SchedulePopup.js` | Shift editor; calls `onChange(startHour, workHours)` |
| `WeatherPopup` | `ui/WeatherPopup.js` | Weather description + full modifier table |
| `Toast` | `ui/Toast.js` | Fade-out notification chip; `update(dt)` manages lifetime |

---

## 5. Data Models

### Company

| Field | Type | Mutated by |
|---|---|---|
| `name` | `string` | — (set once on create) |
| `money` | `number` | `EconomySystem`, `Simulation.finishProject`, `Simulation.buyDesk` |
| `day` | `number` | `TimeSystem.beginNextDay` |
| `maxActiveProjects` | `number` | — (constant for now) |
| `office` | `Office` | `Simulation.buyDesk` (`office.desks++`) |
| `employees` | `Employee[]` | `HiringSystem.hire/fire` |
| `activeProjects` | `Project[]` | `Simulation.acceptProject`, `Simulation.finishProject`, `EconomySystem` |
| `availableProjects` | `Project[]` | `Simulation._refreshProjectPool`, `Simulation.acceptProject/rejectProject` |
| `completedProjects` | `Project[]` | `Simulation.finishProject`, `EconomySystem` |
| `candidates` | `Candidate[]` | `HiringSystem.refreshCandidates/hire` |
| `pendingPayout` | `number` | `EconomySystem` |
| `rdPoints` | `number` | `EconomySystem`, `Simulation.unlockResearch` |
| `rdPointsPerDay` | `number` | — |
| `unlockedResearch` | `string[]` | `Simulation.unlockResearch` |
| `schedule` | `{startHour, workHours}` | `Simulation.setSchedule` |
| `stats` | `{totalRevenue, totalSalariesPaid, projectsCompleted}` | `EconomySystem`, `Simulation.finishProject` |
| `currentWeather` | `WeatherType \| null` | `ProductivitySystem.rollDailyWeather` |

### Employee

| Field | Type | Mutated by |
|---|---|---|
| `id` | `number` | Set once |
| `name` | `string` | Set once |
| `skills` | `{skill, level}[]` | Set once (max 2) |
| `salary` | `number` | Set once |
| `baseProductivity` | `number` | Set once (random in config range) |
| `activeProjectId` | `number \| null` | `ProjectSystem.update`, `Simulation.unassignEmployee/finishProject`, `HiringSystem.fire` |
| `pinnedProjectId` | `number \| null` | `Simulation.assignEmployee/unassignEmployee/finishProject`, `HiringSystem.fire` |
| `scheduleState` | `'WORK'\|'BREAK'\|'TALK'` | `OfficeScene.update` |
| `workBuffer` | `{[projectId]: {[skill]: number}}` | `ProjectSystem.update/flushWorkPeriod` |
| `workPeriodTotal` | `number` | `ProjectSystem.update/flushWorkPeriod` |

### Project

| Field | Type | Description |
|---|---|---|
| `id` | `number` | Auto-incremented instance ID |
| `templateId` | `string` | Source template ID |
| `name` | `string` | Display name |
| `description` | `string` | Short description |
| `tier` | `number` | Catalog tier (1–4); gates which skills are required |
| `difficulty` | `'common'\|'uncommon'\|'rare'` | Generation-time difficulty; SP multiplier 1.2 / 1.5 / 2.0 |
| `basePayout` | `number` | Full reward at On Track (1.0×); equals `totalSP × $100` |
| `insurance` | `number` | Upfront cost on accept; refunded on successful collect |
| `milestones` | `{ahead, onTrack, delayed, critical}` | Elapsed-day deadlines for each tier |
| `payoutMultipliers` | `{ahead, onTrack, delayed, critical}` | Per-tier multipliers applied to `basePayout` |
| `requirements` | `{skill, points, current}[]` | Per-skill SP targets |
| `isActive` | `boolean` | Player accepted |
| `isReadyToFinish` | `boolean` | All requirements met |
| `isCompleted` | `boolean` | Player collected payout |
| `isFailed` | `boolean` | Project expired past critical deadline |
| `startedDay` | `number \| null` | `company.day` at acceptance |
| `finishedDay` | `number \| null` | `company.day` when all SP requirements were first met |
| `milestoneTier` | `string \| null` | Locked tier: `'ahead' \| 'onTrack' \| 'delayed' \| 'critical'` |
| `finalPayout` | `number \| null` | `basePayout × multiplier`, locked at `finishedDay` |

### Office

| Field | Type | Description |
|---|---|---|
| `id` | `number` | Auto-incremented |
| `tierIndex` | `number` | Index into `OFFICE_TIERS` (0–4) |
| `desks` | `number` | Current desk count |
| `name` | `string` | Display name from tier |

### Office Tiers

| Tier | ID | Name | Desks | Upgrade Cost |
|---|---|---|---|---|
| 0 | `small_office` | Small Office | 3 | — |
| 1 | `local_office` | Local Office | 8 | $8,000 |
| 2 | `city_office` | City Office | 20 | $30,000 |
| 3 | `national_hq` | National HQ | 50 | $120,000 |
| 4 | `international_hq` | International HQ | 100 | $500,000 |

---

## 6. Event Catalog

| Event | Emitter(s) | Payload Shape | Listener(s) |
|---|---|---|---|
| `game:ready` | `Game.init` | — | — |
| `resize` | `Game._onResize` | `{ width: number, height: number }` | — |
| `scene:changed` | `SceneManager.changeTo` | `{ name: string }` | — |
| `simulation:reset` | `Simulation.reset` | `{ company }` | `OfficeScene` |
| `day:tick` | `TimeSystem.update` | `{ progress: number, company }` | — |
| `day:ended` | `TimeSystem._endDay` | `{ day: number, company }` | `Simulation` (chain trigger) |
| `day:began` | `TimeSystem.beginNextDay` | `{ day: number, company }` | `OfficeScene` |
| `notification:add` | Multiple | `{ text: string, type?: 'info'\|'success'\|'warning'\|'critical' }` | `NotificationSystem`, `OfficeScene` |
| `project:accepted` | `Simulation.acceptProject` | `{ project, company }` | `OfficeScene` |
| `project:rejected` | `Simulation.rejectProject` | `{ project, company }` | — |
| `project:completed` | `ProjectSystem.flushWorkPeriod` (ready) and `Simulation.finishProject` (collected) | `{ project, company }` | `OfficeScene` |
| `project:failed` | `Simulation._checkProjectDeadlines` | `{ project, company }` | `OfficeScene` |
| `employee:hired` | `HiringSystem.hire` | `{ employee, company }` | `OfficeScene` |
| `employee:fired` | `HiringSystem.fire` | `{ employee, company }` | `OfficeScene` |
| `desk:bought` | `Simulation.buyDesk` | `{ company }` | `OfficeScene` |
| `research:unlocked` | `Simulation.unlockResearch` | `{ nodeId: string, company }` | `OfficeScene` |
| `economy:bankrupt` | `EconomySystem.runEndOfDay` | `{ company }` | — *(no listener)* |

> **Note on `project:completed`:** This event name is reused for two distinct moments — when a project becomes *ready to collect* (emitted by `ProjectSystem`) and when the payout is actually *collected* (emitted by `Simulation.finishProject`). Both cause `OfficeScene` to refresh the modal and widget bar, which is the correct behavior for both moments.

---

## 7. Key Algorithms

### Schedule Cycle and Slot Derivation

```
totalMinutes = dayProgress × schedule.workHours × 60
slot         = floor(totalMinutes / 15)
state        = SCHEDULE_CYCLE[slot % 4]
              // SCHEDULE_CYCLE = ['WORK', 'BREAK', 'WORK', 'TALK']
```

`OfficeScene.update()` computes `slot` every frame and pushes the resulting `state` into every employee via `emp.scheduleState`. It also detects when `slot` changes and the *outgoing* state was `WORK`, triggering `flushWorkPeriod`.

### SP Accrual

Story points are accrued per employee per skill per frame during WORK slots:

```
workPeriodSec     = DAY_DURATION_SECONDS × 15 / (schedule.workHours × 60)
workPeriodFraction = (dt × gameSpeed) / workPeriodSec
contribution      = SKILL_SP_TABLE[skill.level] × workPeriodFraction × totalProductivity
```

`SKILL_SP_TABLE` values (index = skill level):

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| SP/period | 1 | 2 | 4 | 6 | 9 | 12 | 16 | 21 | 28 | 36 |

The contribution is **buffered** in `employee.workBuffer[projectId][skill]` and not written to the project until `flushWorkPeriod` is called. This ensures that partial-tick rounding never produces spurious completion events mid-period.

### Work Period Flush

Called by `OfficeScene` when the schedule slot transitions out of WORK:

```
for each employee:
  for each (projectId, skillMap) in workBuffer:
    project = activeProjects.find(id === projectId)
    if project is gone, completed, or readyToFinish → skip
    for each (skill, points) in skillMap:
      req.current = min(req.points, req.current + points)
    if isProjectComplete(project):
      elapsed              = company.day - project.startedDay + 1
      project.finishedDay  = company.day
      project.milestoneTier = resolveMilestoneTier(elapsed, project.milestones)
      project.finalPayout  = round(project.basePayout × project.payoutMultipliers[tier])
      project.isReadyToFinish = true
      emit project:completed
      emit notification:add (tier label + finalPayout + insurance refund)
  reset workBuffer = {}
  reset workPeriodTotal = 0
```

### Total Productivity

```
totalProductivity = employee.baseProductivity × company.currentWeather.modifier
```

`baseProductivity` is fixed per employee. `currentWeather.modifier` is rolled once per day from:

| Weather | Modifier |
|---|---|
| Stormy | 0.950 (−5%) |
| Overcast | 0.975 (−2.5%) |
| Cloudy | 1.000 (±0%) |
| Sunny | 1.025 (+2.5%) |
| Perfect | 1.050 (+5%) |

### End-of-Day Economy Pipeline

Triggered by `day:ended`, executed in this order:

```
1. money -= dailySalaryCost(company)
2. stats.totalSalariesPaid += salaries
3. emit notification:add ("Salaries paid: -$N")
4. rdPoints += rdPointsPerDay
5. if money < MONEY_WARNING_THRESHOLD → emit warning notification
6. if money <= BANKRUPTCY_THRESHOLD   → emit economy:bankrupt + critical notification
```

After `EconomySystem` runs:

```
7. _checkProjectDeadlines:
     for each active project where !isReadyToFinish && elapsedDays > milestones.critical:
       project.isFailed = true
       remove from activeProjects, add to completedProjects
       clear employee pins
       emit project:failed + notification
8. project pool refresh (new available offers for the next day)
9. hiring refresh
10. TimeSystem.beginNextDay (day++, gameSpeed = 0, emit day:began)
```

### Project Milestone Payout

```
elapsedDays = finishedDay - startedDay + 1
tier:
  elapsed <= milestones.ahead    → 'ahead'    (×1.25)
  elapsed <= milestones.onTrack  → 'onTrack'  (×1.00)
  elapsed <= milestones.delayed  → 'delayed'  (×0.75)
  elapsed <= milestones.critical → 'critical' (×0.50)
  elapsed >  milestones.critical → project fails (no payout, insurance forfeited)

finalPayout = round(basePayout × payoutMultipliers[tier])
collected   = finalPayout + insurance  (insurance is a full refund)
```

Milestone deadlines are expressed in elapsed days from the acceptance day (inclusive). A project accepted on day 5 with `milestones.onTrack = 4` must have all SP requirements met by day 8 (elapsed ≤ 4) to count as On Track.

---

## 8. Configuration Reference

All tunables live in `src/config.js` under `GameConfig.gameplay`. The object is deeply frozen.

| Key | Default | Description |
|---|---|---|
| `DAY_DURATION_SECONDS` | `180` | Real seconds per in-game day at 1× speed |
| `SKILL_SP_TABLE` | `[0,1,2,4,6,9,12,16,21,28,36]` | SP output per skill level per 15-min WORK period |
| `SPEED_PRESETS` | `[0,1,2,4,8]` | Valid `gameSpeed` values; 0 = paused |
| `DEFAULT_SPEED` | `0` | Initial speed when entering office scene |
| `AVAILABLE_PROJECT_POOL_SIZE` | `5` | Max projects offered per day |
| `CANDIDATE_POOL_SIZE` | `4` | Hiring candidates shown per day |
| `MONEY_WARNING_THRESHOLD` | `5000` | Cash level that triggers a low-funds warning |
| `BANKRUPTCY_THRESHOLD` | `0` | Cash level that triggers bankruptcy |
| `ACTIVITY_LOG_MAX` | `20` | Max notifications retained in the activity feed |
| `BASE_PRODUCTIVITY_MIN` | `0.85` | Lower bound of random productivity trait |
| `BASE_PRODUCTIVITY_MAX` | `1.05` | Upper bound of random productivity trait |

Renderer and loop tunables:

| Key | Default | Description |
|---|---|---|
| `resolution.designWidth` | `1920` | Reference layout width |
| `resolution.designHeight` | `1080` | Reference layout height |
| `renderer.backgroundColor` | `0x0b0f1a` | Pixi canvas background |
| `renderer.antialias` | `true` | MSAA on/off |
| `renderer.resolution` | `min(devicePixelRatio, 2)` | DPR cap |
| `loop.targetFPS` | `60` | Pixi ticker target |
| `loop.timeScale` | `1` | Global dt multiplier |

---

## 9. Known Gaps & Future Work

| Area | Issue | Suggested Fix |
|---|---|---|
| `DeskEntity.setActive` | Method body is empty — the desk glow for active employees is not rendered. | Implement glow with a `Graphics` blur or drop shadow in `setActive(true)`. |
| `BottomControlBar.js` | The file exists with speed buttons and an End Day button but is not imported anywhere. It would conflict with the existing `TopBarHUD` speed controls if added. | Decide whether to replace `TopBarHUD` controls with this component or delete the file. |
| Office tier upgrade | `OFFICE_TIERS` defines five tiers with upgrade costs, and `getNextOfficeTier` is exported, but no upgrade action exists in `Simulation` and no upgrade button exists in the UI. | Add `Simulation.upgradeOffice()`, deduct cost, increment `tierIndex`, update `desks`, and add a UI trigger. |
| `economy:bankrupt` | `EconomySystem` emits this event but no listener exists. The game continues running after bankruptcy. | Add a listener in `OfficeScene` (or `Simulation`) that pauses the game and shows a game-over screen or reset prompt. |
| `project:completed` naming | The same event name covers both "project ready to collect" (mid-day) and "payout collected" (player action), making it impossible to distinguish between the two in a listener. | Rename the mid-day ready event to `project:ready` to eliminate ambiguity. |
| `ProgressBar.js` | `src/ui/ProgressBar.js` is a standalone horizontal bar widget but is not referenced by any other file. | Use it in `ProjectsPanel` and `TopBarHUD` instead of inline `Graphics` bars, or remove it. |
| `BottomControlBar` speed values | The file hard-codes speed `16`, which is not in `SPEED_PRESETS = [0,1,2,4,8]` — calling `sim.setSpeed(16)` would silently no-op. | Align the component with `SPEED_PRESETS` or remove it. |
| Research tree effects | Most research nodes are defined with costs and a DAG structure but unlock no mechanical effect beyond the four skill nodes. | Implement effect handlers for each node category (productivity bonuses, candidate pool size increases, etc.). |
| Save / Load | No persistence. All state is lost on page reload. | Serialise the `Company` object to `localStorage` on `day:ended`; deserialise on load if a save is present. |
