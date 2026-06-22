# Software Empire

A browser-based tycoon game where you run a software consultancy. Hire engineers, accept client projects, manage daily schedules and payroll, and invest your profits into a research tree to unlock new skills and scale your operation.

Built with [PixiJS v8](https://pixijs.com/) and [Vite 6](https://vitejs.dev/).

---

## Quick Start

```bash
npm install
npm run dev       # start dev server (http://localhost:5173)
npm run build     # production build → dist/
npm run preview   # preview production build locally
npm run lint      # ESLint check
npm run format    # Prettier format
```

---

## Features

### Time & Scheduling
- Each in-game day runs for 180 real seconds at 1× speed.
- Speed controls: **Pause / 1× / 2× / 4× / 8×**; "End Day" button fast-forwards to midnight.
- The day **auto-pauses** at the start of each new day so you can plan before unpausing.
- By default the work day runs from **9 AM to 5 PM** (a fixed 8-hour shift). Once the **Schedule** research node is unlocked (after Agile Workflow), a configurable work schedule editor becomes available to set the start hour (6 AM–4 PM) and shift length (8, 10, 12, or 14 hours).
- Every employee follows a repeating 15-minute schedule cycle: **WORK → BATHROOM_BREAK → WORK → TALK**. Skill points only accrue during WORK slots.
- An in-game clock (snapped to :00 :15 :30 :45) shows the current time of day.

### Projects
- Each day a fresh pool of up to **5 available projects** is offered; projects not accepted are discarded at day-end.
- Each project requires an upfront **insurance payment** to accept. If you finish successfully the insurance is refunded in full; if the project expires it is forfeited.
- Accept or reject projects from the Projects panel; your company can run several active projects simultaneously (limited by `maxActiveProjects`).
- Projects have per-skill point requirements with live progress bars. Tier-1 projects require Frontend Development; higher tiers unlock via research.
- Every project is tagged with a **difficulty**: Common (×1.2), Uncommon (×1.5), or Rare (×2.0). Difficulty determines total SP relative to your team's current daily output — the pool scales automatically as your team grows.
- Every project has four **milestone deadlines** (measured in elapsed days from acceptance):
  - **Ahead of Schedule** — finish early for a 1.25× bonus payout.
  - **On Track** — finish within the expected window for the full base payout (1.0×).
  - **Delayed** — finish late for a reduced 0.75× payout.
  - **Critical Deadline** — last-chance window; only 0.5× payout if collected here.
  - **Past Critical** — if no one collects before the critical deadline expires, the project is **lost** and the insurance is forfeited.
- The milestone tier is locked the moment all skill-point requirements are met, regardless of when you click Collect.
- When all requirements are met a **Collect** button appears — click it to bank the milestone-adjusted payout plus the insurance refund.
- Active project cards show the current milestone status and a countdown to the next tier deadline.
- Collecting a project immediately clears all employee pins for that project.

### Employees & Assignment
- Employees have up to two skills, each ranked level 1–10. Skill-point output per 15-minute WORK period scales non-linearly (levels 1–10 produce 1–36 points).
- Each employee has an innate **base productivity trait** (0.85–1.05×) rolled once on creation.
- Manually assign employees to projects via the **Assignment panel** (chip-based drag-assign UI). Unassigned employees display a **⚠ warning icon** above their head in the office view.
- A floating **+N pts** label animates above an employee when a WORK period ends and they contributed points.
- Click any employee in the office to open their **stats popup**: skills, salary, productivity, current project. When a skill point is available, upgrade buttons appear in both the stats popup and the **Staff panel**.

### Teams & Roles
- Unlock **Team Management** to hire **Team Leads**. Each Team Lead automatically creates a team and provides an EXP bonus to members (Lv 1 lead → +5%, Lv 10 → +50%).
- Unlock **Project Management** to hire **Project Managers**. PMs auto-assign unassigned programmers to active projects after each WORK flush, logged in the activity feed.
- The **Teams panel** (available after Team Management is researched) shows each team's lead, members, and archetype compatibility.

### Hiring & Firing
- The **Hiring panel** shows programmer candidates each day. The pool size starts at **3** and grows to **4** after researching HR Leads 1, and **5** after HR Leads 2. Researching HR Basics and HR Organised splits the panel into tabs for Programmers, Team Leads, and Project Managers.
- Hire a candidate to occupy a desk; fire an existing employee from the Employees panel.
- Desk slots are limited; add desks via **Build mode** for **$1,000** each (see Office below).

### Economy
- Employee salaries are deducted at end-of-day. Salary is set at hire time based on the employee's skills: `dailySP × $100 × 40%` (median market rate from the PLOT.md balance table).
- Accepting a project costs its insurance upfront; the insurance is refunded when you collect.
- Project payouts are collected instantly when the player clicks **Collect** during the day. The amount equals `basePayout × milestoneMultiplier + insurance refund`. Base payout = `totalSP × $100`.
- **R&D points** accrue at end-of-day (10 pts/day base) and are spent in the Research tree.
- A low-funds warning fires when cash drops below **$5,000**.
- **Insolvency:** if cash is negative after salaries at the end of a day, a deficit streak counter increments. The game ends after N consecutive negative end-of-days (default 3). Collecting a project payout or cutting salaries before midnight resets the streak.
- A **hearts counter** (`❤️ livesLeft/graceDays`) is always visible in the top bar next to cash — green when healthy, yellow while in deficit.
- The **Reserve Fund** research chain (I → II → III → IV) adds +1, +2, +3, +4 extra grace days cumulatively, extending the maximum streak tolerance to 13 days.
- The HUD shows current cash, hearts counter, daily salary cost, R&D points, and day number.

### Research Tree
- A directed acyclic graph of **18 research nodes** spanning skill unlocks, team management, HR upgrades, operational improvements, and survival bonuses.
- Four skill branches: **Frontend Development** (unlocked at game start) → **Backend Development** and **Mobile Development** → **DevOps**.
- Additional branches and their mechanical effects:

  | Branch | Nodes | Effect |
  |---|---|---|
  | Skills | frontend → backend / mobile → devops | Gates which skill types can be hired and assigned to projects |
  | Teams | team_management, project_management | Unlocks Team Lead and PM hiring; Teams panel; PM auto-assignment after each WORK flush |
  | HR | hr_basics → hr_organised → hr_leads_1 → hr_leads_2 | Splits hiring UI into tabs; grows candidate pool from 3 → 4 → 5 per day; unlocks Refresh Hire button |
  | Ops | agile_workflow → project_refresh / work_schedule; hire_refresh (from hr_basics) | Paid pool-refresh buttons ($500 each); unlocks the work schedule editor |
  | Survival | life_reserve_1 → life_reserve_2 → life_reserve_3 → life_reserve_4 | Extends insolvency grace period (+1/+2/+3/+4 days cumulatively, up to 13 total) |

- Locked skills cannot be assigned to projects or hired for.

### Weather & Productivity
- A **daily weather roll** picks from five states: Stormy (−5%), Overcast (−2.5%), Cloudy (±0%), Sunny (+2.5%), Perfect (+5%).
- The weather modifier multiplies every employee's total productivity for the day.
- Click the weather chip in the top bar to open a **weather popup** with the full modifier table.

### Office & Build Mode
- The office floor is a tile grid. Employee desks are tile-placed objects, each occupying a 2×2 tile area.
- Click the **Build** button (bottom-left of the office) to enter **Build mode**:
  - Drag a **Desk** card from the right panel onto any free tile to place a new desk for **$1,000**.
  - Drag an existing desk to move it; a trash button removes it (blocked when an employee is seated).
  - Other furniture types can be placed as decorations.
- Exit build mode to return to normal office operation.
- Animated employee sprites sit at their desks; the monitor glows when the employee is actively contributing to a project.
- Schedule state icon above each employee: 💻 WORK · 🚻 BATHROOM_BREAK · 💬 TALK — replaced by ⚠ when no project is pinned.

### Save / Load
- Up to **5 save slots** backed by `localStorage`. Each slot stores a full day-start checkpoint.
- **Autosave** writes to the active slot at the start of every new day (paused, before the player unpauses).
- **Manual save** is available at any time via the 💾 button at the bottom of the left sidebar, or via **Save Game** in the Pause Menu (ESC).
- **Load Game** on the main menu shows all occupied slots; click a row to load that checkpoint. The same slot picker is accessible from the Pause Menu's **Load Game** button mid-game.
- Checkpoints include: full company state, ID counters, version, save name, and timestamp. Time state is not saved — loading always starts at the beginning of the saved day, paused.
- Save files are version-locked; files from a different game version are rejected on load.

### Day Report
- At the end of every day a **Day Summary** modal shows the day's net finances, project status, and a scrollable activity log.
- When cash is negative, the report includes a **Deficit streak** line (`X / N days`) to remind you how close you are to insolvency.
- The player clicks **Continue** to advance to the next day's planning phase.

### Game Over
- After N consecutive end-of-days with negative cash (default 3; extendable via Reserve Fund research), the company is declared **insolvent**.
- The day report shows `INSOLVENT` instead of the streak count, and **Continue** opens the **Game Over** screen instead of advancing.
- The **Game Over** screen displays final stats and offers three options: **Load Game** (opens the save slot picker — the autosave from the start of the fatal day is still intact), **New Game**, or **Main Menu**.
- The simulation is frozen after insolvency; the ESC pause menu is disabled until the player makes a choice.

### Pause Menu
- Press **ESC** at any time during office play to open the **Pause Menu** (disabled after game over).
- Pauses time and presents four actions: **Resume** (restores previous speed), **Save Game** (opens the save slot dialog), **Load Game** (returns to the main menu load view), **Main Menu** (returns to the title screen).
- Pressing ESC again is equivalent to Resume.

### Game Guide
- The **Info** button in the left sidebar opens the in-game **Game Guide** — a split-pane reference covering every game mechanic with scrollable category entries.

### UI / HUD
- **Top bar**: company name, cash, hearts counter (`❤️ livesLeft/graceDays`), salary cost, R&D points, day counter, weather chip, in-game clock, speed controls, day progress bar.
- **Left sidebar**: navigation to Projects / Staff / Hire / Assign / Research / Info. The **Teams** and **Schedule** buttons appear dynamically after the corresponding research nodes are unlocked. A **Save** button is pinned to the bottom.
- **Right widget bar**: Activity feed (last 100 notifications) and active project cards with quick-collect buttons.
- **Toast notifications**: transient banners for key events (project ready, hired, salary paid, warning, etc.).
- **Schedule popup**: graphical shift editor — pick start hour and duration. Available after the Schedule research node is unlocked.
- **Modal panels**: all management screens (Projects, Staff, Hiring, Assignments, Research, Game Guide) open in a scrollable modal overlay.

### Audio
- Sound effects are played via the browser's `HTMLAudioElement` API. The first user gesture unlocks audio.
- Current clips: `ui_modal_open` and `ui_project_claim`. No background music.

### New Game
- "New Game" from the main menu resets all state (company, employees, projects, research, economy), writes a day-1 checkpoint to slot 0, and enters the office — no page reload required.

---

## Known Limitations (v0.1.0)

- **Office tier upgrades** are defined in data but have no in-game action or UI yet.
- **Settings** button on the main menu is disabled.
- The **Archetype** sub-tabs in employee popups (Personality Summary, Likes/Dislikes, effect bonuses) show placeholder `/TODO` content.
---

## Controls & Navigation

| Control | Action |
|---|---|
| Left sidebar icons | Switch between management panels |
| Speed buttons (top bar) | Set game speed or pause |
| ESC | Toggle pause menu (Resume / Save / Load / Main Menu) |
| Start Day button | Unpause at day start |
| End Day button | Fast-forward to midnight |
| Click employee sprite | Open employee stats popup |
| Click world background | Close any open popup |
| Scroll wheel inside modal | Scroll panel content |
| Weather chip (top bar) | Toggle weather detail popup |
| Schedule icon (sidebar) | Toggle schedule editor |
| Build button | Enter / exit build mode |
| 💾 button (sidebar bottom) | Open save slot dialog |

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Renderer | PixiJS 8 (WebGL/WebGPU) |
| Build | Vite 6 |
| Language | Vanilla ES2022 modules |
| Linting | ESLint 9 (flat config) |
| Formatting | Prettier 3 |

---

## Project Structure

```
src/
  Game.js              — Pixi app + top-level wiring + save/load coordination
  config.js            — All gameplay tunables (single source of truth)
  main.js              — DOM bootstrap
  assets/              — Asset manifest (Pixi bundles)
  data/                — Static seed data (skills, catalog JSONs, weather, research, names,
                         lifeResearch helpers)
  economy/             — Balance helpers (salary/payout formulas, team output, difficulty)
  entities/            — Pixi world objects (desk, employee, furniture)
  managers/            — AssetManager, InputManager, SoundManager
  scenes/              — MainMenuScene, OfficeScene (BaseScene lifecycle)
  state/               — Pure data factories (Company, Employee, Project, Office, Candidate,
                         Team, FurnitureItem, relationships)
  systems/             — Simulation + subsystems (Time, Project, Economy, Hiring, Productivity,
                         Notification, EmployeeGenerator, ProjectGenerator, SaveManager,
                         TeamSystem, PmAssignmentSystem, ScheduleSystem, CommunicationGenerator)
  ui/                  — HUD widgets, popups, modals, BuildOverlay, BuildPanel
                         (PauseMenu.js, GameOverPopup.js, DayReportPopup.js, SaveSlotPopup.js,
                          EmployeeStatsPopup.js, SchedulePopup.js, WeatherPopup.js, Toast.js)
  ui/panels/           — Modal panel content (Projects, Staff, Hiring, Assignments, Research,
                         Teams, Info)
  utils/               — EventBus, math helpers
```
