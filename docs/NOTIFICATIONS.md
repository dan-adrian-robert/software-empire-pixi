# Notifications & Activity Log

This document describes how the notification system works: how messages are emitted, how they reach the activity list vs. the toast overlay, and how per-employee muting controls visibility.

---

## Overview

Every in-game event that produces a message calls:

```js
bus.emit('notification:add', { text, type, silent?, suppress? });
```

Two independent consumers listen on this event:

| Consumer | File | What it does |
|----------|------|-------------|
| `NotificationSystem` | `src/systems/NotificationSystem.js` | Stores entries in a capped ring-buffer. The Activity panel in `RightWidgetBar` reads this array every frame. |
| `OfficeScene` listener | `src/scenes/OfficeScene.js` | Spawns a `Toast` overlay that auto-dismisses after 4 seconds. |

---

## Event payload fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | `string` | required | The message to display. |
| `type` | `string` | `'info'` | Controls colour. One of `info`, `success`, `warning`, `critical`. |
| `silent` | `boolean` | `false` | When `true`, the entry is stored in the activity list but **no toast** is shown. Use for informational noise that shouldn't interrupt the player. |
| `suppress` | `boolean` | `false` | When `true`, the entry is **completely invisible** — not stored in the list and no toast is shown. Use when an employee's logs are muted. |

### Visibility matrix

| `silent` | `suppress` | Activity list | Toast |
|----------|-----------|---------------|-------|
| false | false | Yes | Yes |
| true | false | Yes | No |
| any | true | No | No |

`suppress` takes priority over `silent` — a suppressed notification is dropped entirely before `NotificationSystem` stores it.

---

## Per-employee muting

Every `Employee` object has a `logsMuted: boolean` field (default `false`). When `true`, all notifications specifically about that employee use `suppress: emp.logsMuted`, making them completely invisible.

### Toggling mute

The mute state can be toggled in two places:

- **Employee card** in the Staff panel (`src/ui/panels/EmployeesPanel.js`) — "Mute logs" / "Unmute" button in the card footer, left of the Fire button.
- **Employee popup** (`src/ui/EmployeeStatsPopup.js`) — full-width "🔔 Mute logs" / "🔕 Unmute logs" button at the bottom of the popup.

Both buttons immediately flip `emp.logsMuted` and redraw the UI.

### Which notifications respect muting

| Source | Notification | Mute behaviour |
|--------|-------------|----------------|
| `ProjectSystem` — level-up | `"[Name] reached Level N!"` | `suppress: emp.logsMuted` |
| `Simulation` — skill upgrade | `"[Name] upgraded [Skill] to Lv.N!"` | `suppress: emp.logsMuted` |
| `PmAssignmentSystem` — assignment | `"[PM]: Assigned [Dev] → [Project]"` | `suppress: pm.logsMuted` |
| `PmAssignmentSystem` — idle | `"[PM]: No unassigned developers…"` etc. | `suppress: pm.logsMuted` (list-only when not muted via `silent: true`) |

### Notifications that ignore muting

Hire and fire events (`HiringSystem`) are company-level and always show both toast and list entry, regardless of any employee's mute state.

---

## PM-specific logging rules

Project Manager logs have an extra layer of control beyond the mute toggle:

- **Idle messages** (no projects, no available devs, no matching skill) — these fire every WORK period and are informational only. When the PM is **not muted**, they go to the activity list silently (`silent: true`, no toast). When **muted**, they are fully suppressed.
- **Assignment messages** — when the PM is **not muted**, these show a toast and appear in the list. When **muted**, they are fully suppressed.

---

## Adding a new notification

```js
// Always visible (toast + list)
bus.emit('notification:add', { text: 'Something happened.', type: 'success' });

// List only — informational, no toast interruption
bus.emit('notification:add', { text: 'Background info.', type: 'info', silent: true });

// Respects employee mute state
bus.emit('notification:add', {
  text: `${emp.name} did something.`,
  type: 'info',
  suppress: emp.logsMuted,
});
```
