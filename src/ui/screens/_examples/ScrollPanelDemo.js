/**
 * ScrollPanelDemo
 *
 * Validates PanelShell + ScrollColumn together before using them in
 * production panel migrations. Uses static fake data only — no game state.
 *
 * NOT imported by OfficeScene. To validate during development, mount from
 * Game.js or a test scene:
 *
 *   import { ScrollPanelDemo } from './ui/screens/_examples/ScrollPanelDemo.js';
 *   const demo = new ScrollPanelDemo({ screenW: 1280, screenH: 720 });
 *   app.stage.addChild(demo);
 *   demo.open();
 *
 * What it demonstrates:
 *   - PanelShell sizing logic (HUD-aware backdrop, dynamic window dimensions)
 *   - ScrollColumn clipping and wheel-scroll
 *   - resize() re-centering
 *   - setTitle() / setBody() API
 */
import { Container, Graphics, Text } from 'pixi.js';
import { PanelShell } from '../PanelShell.js';
import { ScrollColumn } from '../../layouts/ScrollColumn.js';
import { Column } from '../../layouts/Column.js';
import { Row } from '../../layouts/Row.js';
import { Label } from '../../widgets/Label.js';
import { Panel } from '../../widgets/Panel.js';
import { ProgressBar } from '../../widgets/ProgressBar.js';
import { Divider } from '../../widgets/Divider.js';
import { Theme } from '../../foundation/Theme.js';

// ── Fake data ─────────────────────────────────────────────────────────────────

const FAKE_EMPLOYEES = Array.from({ length: 15 }, (_, i) => ({
  name: `Employee ${i + 1}`,
  role: i % 3 === 0 ? 'Team Lead' : 'Programmer',
  level: Math.floor(Math.random() * 5) + 1,
  skills: [
    { label: 'Coding', value: Math.random() },
    { label: 'Testing', value: Math.random() },
    { label: 'Design', value: Math.random() },
  ],
}));

// ── Card builder ──────────────────────────────────────────────────────────────

function buildEmployeeCard(emp, width) {
  const CARD_H = 120;

  const card = new Panel({
    width,
    height: CARD_H,
    bg: Theme.colors.bgCard,
    border: Theme.colors.borderLight,
    radius: Theme.radius.md,
  });

  const nameLabel = new Label({ text: emp.name, variant: 'title' });
  nameLabel.position.set(Theme.spacing.md, Theme.spacing.sm);
  card.addChild(nameLabel);

  const roleLabel = new Label({
    text: `${emp.role}  ·  Lvl ${emp.level}`,
    variant: 'label',
  });
  roleLabel.position.set(Theme.spacing.md, 30);
  card.addChild(roleLabel);

  const skillsY = 52;
  emp.skills.forEach((skill, i) => {
    const bar = new ProgressBar({
      value: skill.value,
      width: width - Theme.spacing.md * 2 - 80,
      height: 8,
      label: skill.label,
    });
    bar.position.set(Theme.spacing.md, skillsY + i * 20);
    card.addChild(bar);
  });

  return card;
}

// ─────────────────────────────────────────────────────────────────────────────

export class ScrollPanelDemo extends Container {
  /**
   * @param {{ screenW: number, screenH: number }} opts
   */
  constructor({ screenW = 1280, screenH = 720 } = {}) {
    super();

    this._screenW = screenW;
    this._screenH = screenH;

    this._shell = new PanelShell({
      topBarHeight: 82,
      onClose: () => {},
    });

    this._scroll = new ScrollColumn({ width: 0, height: 0 });
    this._shell.setBody(this._scroll);
    this._shell.setTitle('Scroll Panel Demo');

    this.addChild(this._shell);

    // Register a wheel handler so the demo is self-contained
    this.eventMode = 'static';
    this.on('wheel', (e) => this._shell.visible && this._scroll.handleWheel(e.deltaY));
  }

  open() {
    this._shell.open(this._screenW, this._screenH);

    const bw = this._shell.bodyWidth;
    const bh = this._shell.bodyHeight;

    this._scroll.setProps({ width: bw, height: bh });
    this._scroll.clearContent();

    const col = new Column({
      width: bw,
      gap: Theme.spacing.sm,
      padding: { top: Theme.spacing.sm, horizontal: 0, bottom: Theme.spacing.sm },
    });

    col.add(new Label({ text: `${FAKE_EMPLOYEES.length} employees — scroll to see all`, variant: 'subtitle' }));
    col.add(new Divider({ length: bw }));

    for (const emp of FAKE_EMPLOYEES) {
      col.add(buildEmployeeCard(emp, bw));
    }

    this._scroll.addContent(col);
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._shell.resize(screenW, screenH);

    const bw = this._shell.bodyWidth;
    const bh = this._shell.bodyHeight;

    this._scroll.setProps({ width: bw, height: bh });
  }
}
