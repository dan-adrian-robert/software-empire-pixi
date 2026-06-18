# Asset Inventory — Sprite Migration Guide

Inventory of visual assets in Software Empire: what exists today, what uses emoji/CSS/Graphics, and what can be migrated to sprites.

## What you already have (PNG)

| Asset | Location | Status |
|---|---|---|
| Character portraits | `public/assets/images/characters/character1–5.png` | **4 wired** in `manifest.js`; **character5.png exists but isn't loaded** |
| UI SFX | `public/assets/audio/sfx/*.mp3` | Audio, not sprites |

Everything else is **Pixi `Graphics` rectangles** or **Unicode emoji/text**.

---

## Tier 1 — Best sprite migration targets

These are the clearest wins: they're emoji or procedural shapes that would read much better as art.

### World / office (procedural `Graphics` today)

| Asset | Used in | Variants needed |
|---|---|---|
| **Office floor tile** | `OfficeScene._drawFloor` / `_drawGrid` | Floor fill + optional grid overlay (64×64 tile; manifest already has a commented `office-tileset`) |
| **Desk (occupied)** | `DeskEntity` | Desk body + monitor (128×128 px) |
| **Desk (empty)** | `DeskEntity` | Empty desk (no monitor) |
| **Monitor glow** | `DeskEntity._drawScreenGlow` | Active-work glow overlay — **implemented**: `setActive(true)` draws a blue tinted rect over the monitor when the employee is producing SP |
| **Build mode placement ghost** | `BuildOverlay` | Tile highlight shown while dragging a desk/furniture card from `BuildPanel` |

### Schedule & status icons (emoji in 4+ files)

Used in `EmployeeEntity`, `EmployeesPanel`, `HiringPanel`, `EmployeeStatsPopup`:

| Icon | Current emoji | Suggested sprite ID |
|---|---|---|
| Working | 💻 | `icon-schedule-work` |
| Bathroom break | 🚻 | `icon-schedule-break` |
| Talk | 💬 | `icon-schedule-talk` |
| Unassigned warning | ⚠️ | `icon-warning` |

### Left sidebar navigation (emoji today)

From `LeftSidebar.js`:

| Nav item | Emoji | Notes |
|---|---|---|
| Projects | 📋 | Always shown |
| Staff | 👥 | Always shown |
| Hire | ➕ | Always shown |
| Assign | 📌 | Always shown |
| Research | 🔬 | Always shown |
| Info | ℹ️ | Always shown (bottom-pinned) |
| Teams | 👥 | Added dynamically after `team_management` is researched |
| Schedule | 🕐 | Added dynamically after `work_schedule` is researched |
| Save | 💾 | Always shown (bottom-pinned) |

**9 nav icons** (+ optional active/hover variants). Note: there is no "Office" nav button — the office world is always visible behind modals.

### Weather icons (5 states)

Used in `TopBarHUD` and `WeatherPopup`:

| State | Emoji |
|---|---|
| Stormy | ⛈ |
| Overcast | ☁ |
| Cloudy | ⛅ |
| Sunny | 🌤 |
| Perfect | ☀ |

### Research tree icons (18 nodes)

Each node in `researchNodes.js` has an `icon` emoji. The full set:

🖥️ 🔧 📱 🛠️ 🧑‍🤝‍🧑 📋 👥 🗂️ 📈 📊 🔄 🔃 🔃 🕐 🩷 ❤️ 💖 💎

The last four (🩷 ❤️ 💖 💎) are the Reserve Fund I–IV survival nodes. Some icons overlap with nav/schedule icons (🕐, 👥), so a shared **UI icon atlas** can cover many of these.

### Small UI symbols (emoji/unicode text)

| Symbol | Where | Sprite candidate |
|---|---|---|
| ✕ | Modal close | `icon-close` |
| ✓ | Research unlocked | `icon-check` |
| → | Schedule timeline arrows | `icon-arrow-right` |
| + | Build panel desk card | `icon-plus` |
| ▶ / ⏸ / ⏭ | Start Day, pause, End Day | `icon-play`, `icon-pause`, `icon-skip` |
| ⚗ | R&D points in top bar | `icon-rd` |

Toast messages also embed ⚠ in text (`EconomySystem`), which would look better with a warning icon sprite beside the message.

---

## Tier 2 — Already planned in code, not shipped

From `src/assets/manifest.js` (commented placeholders):

| Asset | Bundle | Purpose |
|---|---|---|
| **Logo** | `boot` | Loading screen + branding |
| **Menu background** | `main-menu` | Title screen (today: flat color + grid lines in `MainMenuScene`) |
| **Office tileset** | `office` | Replace procedural floor |
| **Employee spritesheet** | `office` | Comment mentions `employees.json` — likely for animated poses (idle/typing), since `setState('idle'\|'typing')` exists but doesn't change visuals yet |

---

## Tier 3 — Optional (usually stay as code unless you want a full art pass)

These are **Pixi `Graphics` UI chrome**. They *can* become 9-slice sprites, but they're lower priority than world objects and icons:

- Modal window frame (`ModalHost` / `PanelShell`)
- Panel card backgrounds (`ProjectsPanel`, `EmployeesPanel`, `HiringPanel`, etc.)
- Top bar / sidebars / toast backgrounds
- Skill progress bar cells (colored rects in multiple panels)
- Milestone slider tracks and ticks
- Button backgrounds (`Button.js`, speed buttons, hire/fire buttons)
- Assignment chips (currently colored rounded rects + character avatar sprites)

The HTML in `index.html` is only page chrome (background color, loading text) — not really sprite territory unless you add a boot logo there.

---

## Suggested asset checklist (counts)

If you want a practical production list:

| Category | Count | Notes |
|---|---|---|
| Character portraits | 5 (have 5 files; wire #5) | Already sprites |
| Desk sprites | 2–3 | empty, occupied, optional art for the active glow (currently a procedural blue overlay) |
| Floor tileset | 1 sheet | e.g. 64×64 tiles |
| Schedule/status icons | 4 | work, break, talk, warning |
| Nav icons | 8 | sidebar + save |
| Weather icons | 5 | |
| Research icons | ~15 | fewer if you reuse shared icons |
| UI chrome icons | ~6 | close, check, arrow, plus, play/pause/skip, rd |
| Boot/menu art | 2 | logo + menu background |
| Character animation sheet | 1+ | optional; idle/typing not visual yet |

**Rough total for a cohesive art pass: ~40–50 distinct sprites**, or fewer if you pack them into 2–3 atlases (UI icons, office environment, characters).

---

## What probably should *not* become sprites

Keep these as text/code unless you're doing a full pixel-art UI overhaul:

- Company name, money, day counter, project names, employee names
- Skill bar **levels** (the filled/empty cells are layout, not art)
- Notification message bodies in toasts/activity feed
- Research node **names and costs** (text labels beside icons)
- Schedule popup timeline (time labels, workload text)

---

## Quick priority order

1. **Office environment** — desk + floor tileset (biggest visual upgrade in the world view)
2. **UI icon atlas** — nav + schedule + weather + status symbols (replaces most emoji)
3. **Research icons** — either dedicated art or mapped onto the UI atlas
4. **Boot/menu branding** — logo and menu background
5. **Character animation** — optional second pass once portraits are settled
