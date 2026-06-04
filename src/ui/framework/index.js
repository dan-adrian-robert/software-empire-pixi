/**
 * @file src/ui/framework/index.js
 *
 * Public API for the PixiJS UI Framework.
 *
 * Import from this single entry-point rather than reaching into sub-folders:
 *
 *   import { Column, Row, Label, Button, Theme, PopupShell } from '../ui/framework/index.js';
 *
 * WARNING: This framework coexists with the legacy hand-positioned UI in
 * src/ui/*.js (Button, Panel, ProgressBar, Modal, etc.). Do NOT import the
 * legacy files from framework code and do NOT import framework files from
 * legacy code during the migration period. Each popup migrates independently.
 */

// ── Foundation ────────────────────────────────────────────────────────────────
export { Component } from '../foundation/Component.js';
export { Theme } from '../foundation/Theme.js';
export { EventEmitter, uiEvents } from '../foundation/Events.js';

// ── Layouts ───────────────────────────────────────────────────────────────────
export { Layout } from '../layouts/Layout.js';
export { Column } from '../layouts/Column.js';
export { Row } from '../layouts/Row.js';
export { Stack } from '../layouts/Stack.js';
export { Grid } from '../layouts/Grid.js';
export { Spacer } from '../layouts/Spacer.js';

// ── Widgets ───────────────────────────────────────────────────────────────────
export { Label } from '../widgets/Label.js';
export { Button } from '../widgets/Button.js';
export { Panel } from '../widgets/Panel.js';
export { Divider } from '../widgets/Divider.js';
export { ProgressBar } from '../widgets/ProgressBar.js';
export { Tabs } from '../widgets/Tabs.js';
export { Avatar } from '../widgets/Avatar.js';
export { Tooltip } from '../widgets/Tooltip.js';

// ── Screens ───────────────────────────────────────────────────────────────────
export { PopupShell } from '../screens/PopupShell.js';

// ── Utils ─────────────────────────────────────────────────────────────────────
export { measureText, clearMeasureCache } from '../utils/measure.js';
export { drawRoundRect, drawCircleDot, drawHLine, drawProgressBar } from '../utils/graphics.js';
