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
- A configurable work schedule sets the start hour (6 AM–4 PM) and shift length (8, 10, 12, or 14 hours).
- Every employee follows a repeating 15-minute schedule cycle: **WORK → BREAK → WORK → TALK**. Skill points only accrue during WORK slots.
- An in-game clock (snapped to :00 :15 :30 :45) shows the current time of day.

### Projects
- Each day a fresh pool of up to **5 available projects** is offered; projects not accepted are discarded at day-end.
- Each project requires an upfront **insurance payment** to accept. If you finish successfully the insurance is refunded in full; if the project expires it is forfeited.
- Accept or reject projects from the Projects panel; your company can run several active projects simultaneously (limited by `maxActiveProjects`).
- Projects have per-skill point requirements with live progress bars. Tier-1 projects require Frontend Development; higher tiers unlock via research.
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
- Click any employee in the office to open their **stats popup**: skills, salary, productivity, current project.

### Hiring & Firing
- The **Hiring panel** shows up to **4 candidates** per day; the pool refreshes each new day.
- Hire a candidate to fill an empty desk; fire an existing employee from the Employees panel.
- Desk slots are limited; buy additional desks for **$1,000** each via the in-world purchase tile.

### Economy
- Employee salaries are deducted at end-of-day.
- Accepting a project costs its insurance upfront; the insurance is refunded when you collect.
- Project payouts are collected instantly when the player clicks **Collect** during the day. The amount equals `basePayout × milestoneMultiplier + insurance refund`.
- **R&D points** accrue at end-of-day (10 pts/day base) and are spent in the Research tree.
- A low-funds warning fires when cash drops below **$500**; bankruptcy is declared at **$0**.
- The HUD shows current cash, daily salary cost, R&D points, and day number.

### Research Tree
- A directed acyclic graph of **24 research nodes** spanning skill unlocks and operational upgrades.
- Four skill branches: **Frontend Development** (unlocked at game start) → **Backend Development** and **Mobile Development** → **DevOps**.
- General upgrades branch through Agile Workflow, Better Workstations, Recruitment Department, and converge toward late-game nodes like AI Assisted Development, Global Offices, and Digital Monopoly.
- Locked skills cannot be assigned to projects or hired for.

### Weather & Productivity
- A **daily weather roll** picks from five states: Stormy (−5%), Overcast (−2.5%), Cloudy (±0%), Sunny (+2.5%), Perfect (+5%).
- The weather modifier multiplies every employee's total productivity for the day.
- Click the weather chip in the top bar to open a **weather popup** with the full modifier table.

### Office View
- Animated employee sprites at their desks; body color shifts between idle (grey) and typing (blue) states.
- Schedule state icon above each employee: 💻 WORK · ☕ BREAK · 💬 TALK — replaced by ⚠ when no project is pinned.
- Active desks glow when the employee is contributing to a project.
- A buy-desk tile appears at the end of the desk row when all seats are occupied.

### UI / HUD
- **Top bar**: company name, cash, salary cost, R&D points, day counter, weather chip, in-game clock, speed controls, progress bar.
- **Left sidebar**: navigation to Office / Projects / Staff / Hiring / Assignments / Research / Schedule.
- **Right widget bar**: Activity feed (last 20 notifications) and active project cards with quick-collect buttons.
- **Toast notifications**: transient banners for key events (project ready, hired, salary paid, warning, etc.).
- **Schedule popup**: graphical shift editor — pick start hour and duration.
- **Modal panels**: all management screens (Projects, Staff, Hiring, Assignments, Research) open in a scrollable modal overlay.

### New Game
- "New Game" from the main menu resets all state: company, employees, projects, research, and economy — no page reload required.

---

## Controls & Navigation

| Control | Action |
|---|---|
| Left sidebar icons | Switch between management panels |
| Speed buttons (top bar) | Set game speed or pause |
| Start Day button | Unpause at day start |
| End Day button | Fast-forward to midnight |
| Click employee sprite | Open employee stats popup |
| Click world background | Close any open popup |
| Scroll wheel inside modal | Scroll panel content |
| Weather chip (top bar) | Toggle weather detail popup |
| Schedule icon (sidebar) | Toggle schedule editor |

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
  Game.js              — Pixi app + top-level wiring
  config.js            — All gameplay tunables (single source of truth)
  main.js              — DOM bootstrap
  assets/              — Asset manifest (Pixi bundles)
  data/                — Static seed data (skills, projects, weather, research, names)
  entities/            — Pixi world objects (desk, employee, buy-desk)
  managers/            — AssetManager, InputManager
  scenes/              — MainMenuScene, OfficeScene (BaseScene lifecycle)
  state/               — Pure data factories (Company, Employee, Project, Office, Candidate)
  systems/             — Simulation + subsystems (Time, Project, Economy, Hiring, Productivity, Notification)
  ui/                  — HUD widgets, popups, modals
  ui/panels/           — Modal panel content (Projects, Staff, Hiring, Assignments, Research)
  utils/               — EventBus, math helpers
```
