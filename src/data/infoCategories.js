/**
 * Tutorial categories for the Info (Game Guide) panel.
 * Each entry has a short sidebar label, a full title, and multi-paragraph body text.
 */
export const INFO_CATEGORIES = [
  {
    id: 'getting_started',
    label: 'Getting Started',
    title: 'Getting Started',
    body: `Welcome to Software Empire — a day-based software company sim where you hire programmers, pick up client projects, and grow your studio into an industry powerhouse.

Each in-game day lasts 180 real-world seconds at 1× speed. Time only moves when you press Start Day; the game begins every day paused so you can review your situation before committing.

Speed Controls — use the buttons in the top bar to run time at 1×, 2×, 4×, or 8× speed. You can also pause at any moment with the 0× button.

End Day — pressing this fast-forwards directly to the end of the current day, skipping the wait. Useful when you have nothing left to adjust.

Day Report — after every day ends, a summary popup appears showing your finances for the day, project progress, and the activity log. Read it, then click Continue to start the next day.

Pause Menu — press ESC at any time during gameplay to open the Pause Menu. It pauses time and lets you Resume, Save Game, Load Game, or return to the Main Menu. Press ESC again to resume. The Pause Menu is not available after the game ends in insolvency.

Autosave — the game automatically saves your progress to the active save slot at the start of each new day, so you rarely lose more than one day's work.`,
  },
  {
    id: 'projects',
    label: 'Projects',
    title: 'Projects',
    body: `Projects are the primary source of income. Each day a pool of up to five available projects is refreshed for you to browse.

Accepting a Project — when you accept a project you pay an insurance fee upfront (equal to the project's total story points × 2.5). This fee is refunded on successful completion, but forfeited if the project fails.

Requirements — every project lists skill requirements (Frontend, Backend, Mobile, DevOps). Only employees whose skills match an open requirement will contribute work toward it. Make sure you have the right people before accepting.

Story Points (SP) — employees generate SP during WORK periods. Each skill level produces a different amount of SP per period. As SPs accumulate in each requirement bar the project moves toward completion.

Milestone Deadlines — projects track how many elapsed days have passed since you accepted them. There are four tiers:
  • Ahead — finished early, payout ×1.25
  • On Track — completed within the expected window, payout ×1.0
  • Delayed — a bit late, payout ×0.75
  • Critical — very late, payout ×0.5

Auto-Fail — if a project is still incomplete when it passes the Critical deadline, it fails at end of day. You lose the insurance fee and receive no payout.

Project Refresh — once you unlock the Project Refresh research node, you can spend $500 to immediately reroll the available project pool instead of waiting for the next day.

You can run up to three active projects at once (starter limit).`,
  },
  {
    id: 'staff',
    label: 'Staff',
    title: 'Staff',
    body: `Your company has three employee roles, each with distinct responsibilities.

Programmers are the core workforce. They produce Story Points during WORK periods when assigned to a matching project. Each programmer can have up to two skills (Frontend, Backend, Mobile, or DevOps) at levels 1–10.

Team Leads require the Team Management research node to hire. When a Team Lead joins, a team is automatically created around them. All programmers in a Team Lead's team gain a small EXP multiplier each WORK period (1 + leadLevel × 0.05).

Project Managers require the Project Management research node. After every WORK period, each PM automatically reassigns one unassigned programmer to an eligible project — saving you from manually juggling every assignment.

Skills & EXP — programmers earn EXP after any WORK period in which they produced SP. Each level requires more EXP than the last (starting at 100, growing ~25% per level). On level-up they receive one pending skill point. Visit the Staff panel to spend pending skill points, raising one of their existing skills by +1. Each skill has a personal potential cap (1–10) set at hire — the skill bar shows filled cells for current level, outlined cells for the attainable range up to potential, and dim cells beyond it.

Base Productivity — each employee has an innate productivity multiplier (roughly 0.85–1.05) set at hire. This is factored into their SP output.

Archetypes — each employee is randomly assigned one or two personality archetypes that influence team chemistry. Archetypes are visible in the employee stats popup (click an employee sprite in the office).

Notification Mute — individual employees can be muted so their activity entries and toast notifications are suppressed. Toggle this from the employee's stats popup.`,
  },
  {
    id: 'hiring',
    label: 'Hiring',
    title: 'Hiring',
    body: `The Hiring panel shows a fresh pool of candidates that refreshes every day.

Candidate Pools — the size and variety of the pool depends on your HR research:
  • No HR research: one merged "People" list with up to 3 candidates.
  • HR Basics: split into Programmers and Other (Team Leads / PMs) tabs.
  • HR Organised: three tabs — Programmers, Team Leads, and Project Managers.
  • HR Leads 1 / Leads 2: pool size expands from 3 up to 5 candidates per tab.

Desk Capacity — you cannot hire if no free desks are available. Place a new desk in Build Mode first (costs $1,000).

Hiring — click Hire on a candidate card to bring them on board. Their salary is deducted from your funds each day.

Firing — you can dismiss any current employee from the Staff panel. Firing a Team Lead dissolves their team and removes all members from it.

Paid Refresh — once you unlock the Hire Refresh research node, a Refresh button appears in the Hiring panel. Spend $500 to immediately replace the current candidate pool with fresh candidates without waiting for the next day.`,
  },
  {
    id: 'assignments',
    label: 'Assignments',
    title: 'Project Assignments',
    body: `SP is only produced when a programmer is actively assigned to a project. Unassigned programmers sit idle during WORK periods and produce nothing.

Manual Assignment — open the Assignments panel to drag each programmer to the project you want them to work on. Only assignments where the programmer's skills match an open project requirement are productive.

Removing an Assignment — you can unassign an employee at any time. They will sit idle until you reassign them or a PM picks them up.

PM Auto-Assignment — if you have hired a Project Manager, they will automatically assign one unassigned programmer per eligible project after every WORK period ends. The PM picks the best skill match based on open requirements and accepts them in the order projects were accepted. This is a great safety net to avoid idle downtime.

Skill Matching — an employee's skill must match an open (incomplete) requirement slot to count. If all requirement bars of a matching type are already full, the employee's contribution is wasted — reassign them to a project that still needs their skill type.`,
  },
  {
    id: 'research',
    label: 'Research',
    title: 'Research',
    body: `Research unlocks new capabilities and systems for your company. Open the Research panel to see the full tech tree.

R&D Points — you earn +10 R&D points automatically at the end of every day. Points are spent to unlock individual research nodes.

Dependencies — most nodes require one or more other nodes to be unlocked first. Each node shows a short benefit subtitle so you can plan your research path at a glance.

Key research chains:

Skill Unlocks — Frontend Dev is available from the start. Research Backend Dev and Mobile Dev (both require Frontend Dev), then DevOps (requires Backend Dev) to expand the kinds of projects your team can work on.

Team Management — unlocks the Team Lead hire pool and the Teams panel. Required before you can use team-based EXP bonuses.

Project Management — unlocks the Project Manager hire pool and PM auto-assignment.

HR Chain — HR Basics → HR Organised → HR Leads 1 → HR Leads 2. Each step improves the Hiring panel UI and increases the number of daily candidates (3 → 4 → 5 per tab).

Agile Workflow — a prerequisite node that unlocks both Project Refresh and Work Schedule research.

Project Refresh — spend $500 to reroll the project pool on demand.

Hire Refresh — spend $500 to reroll the candidate pool on demand (requires HR Basics).

Work Schedule — unlocks the Schedule popup where you can configure your work day start hour and duration (8, 10, 12, or 14 hours).

Company Calendar — unlocks the Calendar sidebar, which shows upcoming days on a monthly sheet and lets you schedule company events on eligible future days.

Event Planning I & II — each node reduces the minimum cooldown between company events by 2 days (default 10 days → 8 → 6). More frequent events means more EXP and morale opportunities for your team.

Reserve Fund Chain — Reserve Fund I → II → III → IV. Each node cumulatively extends your insolvency grace period: +1, +2, +3, and +4 extra days respectively. With all four unlocked your company can survive up to 13 consecutive days in the red before game over.`,
  },
  {
    id: 'teams',
    label: 'Teams',
    title: 'Teams',
    body: `Teams are automatically created when you hire a Team Lead (requires Team Management research).

Membership — assign programmers to a team using the Teams panel. A programmer can only be in one team at a time. Removing a Team Lead from your company dissolves their team and releases all members.

EXP Buff — programmers in a team receive a small EXP multiplier after WORK periods: 1 + (Team Lead's level × 0.05). A level 5 Team Lead gives a 1.25× EXP bonus to their team. The Team Lead themselves always earns EXP at 1×.

Team Chemistry — each employee has a personality archetype. The archetypes of all team members are compared pairwise to produce a compatibility score, shown as a stress label:
  • Low Stress — highly compatible group
  • Reduced Stress — mostly compatible
  • Neutral — mixed compatibility
  • Elevated Stress — some friction
  • High Stress — poor overall compatibility

Team Effect — the dominant archetype category in the team produces a label (e.g. "Leadership Team", "Research Team"). These are informational indicators and do not currently apply modifiers to SP production.

Team Info Popup — click the team card in the world view or Teams panel to see a detailed chemistry breakdown of every member.`,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    title: 'Work Schedule',
    body: `The workday is divided into 15-minute activity slots. Employees cycle through activities automatically as time passes.

Default Schedule — before unlocking Work Schedule research, all employees follow a fixed 9 AM–5 PM schedule (8 hours of activities).

Configurable Schedule — once Work Schedule (under Agile Workflow) is researched, the Schedule button appears in the left sidebar. You can set:
  • Start Hour: 6 AM through 4 PM
  • Duration: 8, 10, 12, or 14 hours

Activity Cycle — employees rotate through these states during the day:
  • WORK — programmers produce Story Points and contribute them to assigned projects. This is when EXP is earned and PM auto-assignment runs at the end of each period.
  • TALK — employees pair up randomly and discuss a topic. This affects friendship scores and is logged in the Communication widget on the right.
  • Bathroom Break — a short pause between activities (no gameplay effect currently).

More WORK periods in the day (longer schedule) means more total SP output, but also higher daily salaries paid. Find the duration that balances output with cost.`,
  },
  {
    id: 'economy',
    label: 'Economy',
    title: 'Economy & Money',
    body: `Your company starts with $1,000 in the bank. All costs are paid from this pool; income comes from completing projects.

Daily Salaries — every employee's daily salary is automatically deducted from your funds at the end of each day. Salary is calculated from the employee's total SP potential, their skills, and a salary ratio from the game's balance. Check each employee card in the Hiring or Staff panels to see their daily cost before hiring.

Insurance — when you accept a project you pay an upfront insurance fee (totalSP × 2.5). On success the fee is refunded with your payout. On failure (auto-fail or missing the deadline) the fee is forfeited. Be careful about accepting projects you cannot staff properly.

Payout Multipliers — your payout is scaled by how quickly you finish:
  • Ahead: base payout × 1.25
  • On Track: × 1.0
  • Delayed: × 0.75
  • Critical: × 0.5

R&D Points — separate from money. You earn +10 R&D per day automatically. These are only used to unlock research nodes and cannot be spent on anything else.

Low Funds Warning — a notification appears if your balance drops below $5,000. Keep an eye on daily salaries versus expected project income to avoid going broke.

Insolvency — if your cash balance is negative at the end of a day, a deficit streak counter starts. The counter is shown next to your cash balance in the top bar (❤️ livesLeft/graceDays) at all times — green when healthy, yellow while you're in deficit. If the counter reaches your grace-day limit on consecutive days, the company is declared insolvent and the game ends. Collecting a project payout or cutting salaries to get above $0 by end-of-day resets the streak. On game over you can Load Game (opens the slot picker — your autosave from the start of the fatal day is still there), start a New Game, or return to the Main Menu. The grace period can be extended up to 13 days by researching the Reserve Fund chain.

Stats Tracking — the game tracks total revenue earned, total salaries paid, and total projects completed. These are visible in the day report summary.`,
  },
  {
    id: 'weather',
    label: 'Weather',
    title: 'Weather',
    body: `Each day begins with a random weather condition that applies a global productivity modifier to all SP output for the entire day.

Weather types range from Stormy (−5% productivity) through Cloudy, Neutral, Partly Cloudy, Sunny, and up to Perfect (+5% productivity).

The modifier is applied on top of each employee's base productivity, so a −5% day meaningfully reduces the SP your team produces.

Weather Popup — the current weather is shown as a chip in the top bar. Click it to open a small popup with the weather name, modifier percentage, and a short description of the conditions.

Because the weather is rolled at the start of each day, you cannot plan around it in advance — it is a small random variance layer on top of your staffing decisions.`,
  },
  {
    id: 'office_build',
    label: 'Office & Build',
    title: 'Office & Build Mode',
    body: `Your office is the physical space where employees work. Desks represent seats — you need at least one free desk before you can hire a new employee.

Build Mode — click the Build toggle button (bottom-right of the screen) to enter Build Mode. In this mode you can place, move, and remove desks and decorative furniture. The office world is not interactive while Build Mode is active.

Placing a Desk — in Build Mode, click any free floor tile to place a new desk. Each desk costs $1,000. The cost is deducted immediately on placement.

Moving a Desk — in Build Mode, click a desk to select it, then click a free tile to move it. Moving is free.

Removing a Desk — select a desk and press Remove. You cannot remove a desk that has an employee seated at it — fire or reassign the employee first.

Furniture — you can place decorative items (plants, couches, filing cabinets) anywhere on the floor. Furniture placement is free and items have no gameplay effect — they are purely cosmetic.

Office Capacity — the number of desks in your office sets the maximum number of employees you can have at once. As your team grows, you will need to add more desks to make room for new hires.`,
  },
  {
    id: 'communication',
    label: 'Communication',
    title: 'Communication & Relationships',
    body: `Employees don't just work — they talk. During TALK activity slots, a random pair of employees finds each other and discusses a random topic.

Communication Topics — there are 24 conversation topics spanning four categories (Technical, Social, Personal, and Creative). Each employee has a personal affinity score (1–100) for every topic.

Friendship Scores — each pair of employees has a friendship score that starts at 50 (neutral). When two people talk, their scores on the chosen topic are compared. Similar views move friendship closer together; differing views push it slightly apart. Scores are clamped between 0 and 100.

Communication Log — the right sidebar has a Communication widget showing the last 50 TALK events. Each entry shows who spoke, the topic, and a brief outcome. You can scroll through recent entries to understand the social dynamics of your team.

Employee Relationships — open an employee's stats popup (click their sprite in the office or in the Staff panel) to see their current friendship score with each coworker, displayed as a relationship tier.

Note: friendship scores and team stress are currently tracked and displayed but do not yet apply modifiers to productivity or story point output. This is a foundation for future mechanics.`,
  },
  {
    id: 'ui_navigation',
    label: 'Interface & UI',
    title: 'Interface & Navigation',
    body: `The game screen is divided into several always-visible areas.

Top Bar — shows the current day, your balance, the active weather chip (click for details), R&D points, and speed controls. "Start Day" and "End Day" buttons live here.

Left Sidebar — the vertical icon strip on the left. Each button opens a full panel:
  • 📋 Projects — view and manage your project pipeline
  • 👥 Staff — see all employees, skills, and stats
  • ➕ Hire — browse and hire new candidates
  • 📌 Assign — set which employee works on which project
  • 🔬 Research — unlock new capabilities
  • (Teams and Schedule appear after research unlocks them)
  • ℹ️ Info — this guide

Right Sidebar — collapsible widgets on the right:
  • Activity Log — a running log of key events (completions, milestones, errors)
  • Active Projects — a compact view of your in-progress projects with SP bars
  • SP Productivity — a live bar showing story point output for the current day
  • Communication Log — recent TALK interactions between employees

Toasts — short popup notifications appear in the bottom-right for important events (project completed, level-up, low funds, etc.). They auto-dismiss after a few seconds.

Employee Popup — click any employee sprite in the office world to open their detailed stats popup, showing skills, archetypes, communication profile, relationships, and team membership.

Day Report — appears automatically after each day ends. It summarizes revenue, expenses, SP output, and project statuses. Read it before pressing Continue to start the next day.`,
  },
  {
    id: 'save_load',
    label: 'Save & Load',
    title: 'Save & Load',
    body: `Software Empire keeps your progress across sessions using save slots stored in your browser's local storage.

Save Slots — there are five save slots. You can name each slot to distinguish between different playthroughs.

Manual Save — click the 💾 Save button at the bottom of the left sidebar at any time to write your current state to the active slot. You can also save from the Pause Menu (ESC → Save Game) mid-game.

Autosave — the game automatically saves to the active slot at the beginning of each new day. This means you can safely close the tab mid-day and resume from the previous day's start.

Loading a Save — from the Main Menu you can load any slot that has a saved game. You can also access the slot picker mid-game via the Pause Menu (ESC → Load Game), which returns you to the Main Menu load view. The save includes your full company state: employees, projects, assignments, research, office layout, relationships, and all settings.

Starting a New Game — choosing New Game from the Main Menu begins with TechNova Studios, $1,000, Day 1, a Small Office with 3 desks, and three starter Frontend Dev candidates waiting to be hired.`,
  },
];
