/**
 * CompositionDemo
 *
 * A standalone demonstration screen that proves the framework's layout and
 * widget composition. Uses ONLY static fake data — no imports from systems/,
 * state/, or scenes/.
 *
 * NOT imported by OfficeScene in this phase. To validate during development,
 * temporarily mount it from Game.js or a dedicated test scene:
 *
 *   import { CompositionDemo } from './ui/screens/_examples/CompositionDemo.js';
 *   const demo = new CompositionDemo({ screenW: 1280, screenH: 720 });
 *   app.stage.addChild(demo);
 *
 * What it demonstrates:
 *   - PopupShell (backdrop + centered window + header + body + footer)
 *   - Column / Row / Grid layouts with gap, padding, align
 *   - Spacer flex alignment (title left, button right)
 *   - Label with multiple variants
 *   - Tabs with active state + onChange
 *   - Panel cards in a 3-column Grid
 *   - ProgressBar with value and label
 *   - Divider inside a Column
 *   - Button primary / secondary / danger variants
 */
import { Container } from 'pixi.js';
import { PopupShell } from '../PopupShell.js';
import { Column } from '../../layouts/Column.js';
import { Row } from '../../layouts/Row.js';
import { Grid } from '../../layouts/Grid.js';
import { Spacer } from '../../layouts/Spacer.js';
import { Label } from '../../widgets/Label.js';
import { Button } from '../../widgets/Button.js';
import { Panel } from '../../widgets/Panel.js';
import { Divider } from '../../widgets/Divider.js';
import { ProgressBar } from '../../widgets/ProgressBar.js';
import { Tabs } from '../../widgets/Tabs.js';
import { Theme } from '../../foundation/Theme.js';

// ── Fake data ─────────────────────────────────────────────────────────────────
const FAKE_TABS = ['OVERVIEW', 'MEMBERS', 'PERFORMANCE'];
const FAKE_CARDS = [
  { title: 'Code Quality', score: 72, desc: 'Avg code review score across sprints.' },
  { title: 'Velocity', score: 58, desc: 'Story points delivered per sprint.' },
  { title: 'Team Morale', score: 84, desc: 'Based on weekly sentiment check-in.' },
  { title: 'Bug Rate', score: 41, desc: 'Open bugs per 100 features shipped.' },
  { title: 'Delivery', score: 66, desc: 'On-time delivery of committed items.' },
  { title: 'Collaboration', score: 90, desc: 'Cross-team interaction score.' },
];

// ─────────────────────────────────────────────────────────────────────────────

export class CompositionDemo extends Container {
  /**
   * @param {{ screenW: number, screenH: number }} opts
   */
  constructor({ screenW = 1280, screenH = 720 } = {}) {
    super();

    const POPUP_W = 860;
    const POPUP_H = 600;

    this._shell = new PopupShell({
      width: POPUP_W,
      height: POPUP_H,
      title: 'Framework Demo',
      hasFooter: true,
      onClose: () => {
        this.visible = false;
      },
    });
    this.addChild(this._shell);

    this._activeTab = FAKE_TABS[0];
    this._buildBody(POPUP_W, POPUP_H);
    this._buildFooter(POPUP_W);

    this._shell.open(screenW, screenH);
  }

  // ── Body ─────────────────────────────────────────────────────────────────────

  _buildBody(popupW, popupH) {
    const INNER_W = popupW - Theme.spacing.md * 2;
    const HEADER_H = 52; // PopupShell header
    const FOOTER_H = 52; // PopupShell footer
    const DIVIDER_H = 1;
    const BODY_H = popupH - HEADER_H - DIVIDER_H - FOOTER_H - DIVIDER_H;

    const body = new Column({
      width: INNER_W,
      height: BODY_H,
      gap: Theme.spacing.md,
      padding: Theme.spacing.md,
    });

    // Tabs row
    this._tabs = new Tabs({
      tabs: FAKE_TABS,
      active: this._activeTab,
      onChange: (tab) => this._onTabChange(tab),
    });
    body.add(this._tabs);

    // Divider under tabs
    body.add(new Divider({ length: INNER_W - Theme.spacing.md * 2 }));

    // Tab content slot
    this._contentSlot = new Column({
      width: INNER_W - Theme.spacing.md * 2,
      height: 'auto',
      gap: Theme.spacing.md,
    });
    this._buildTabContent(this._activeTab);
    body.add(this._contentSlot);

    this._shell.setBody(body);
  }

  _buildTabContent(tab) {
    this._contentSlot.clearChildren();

    if (tab === 'OVERVIEW') {
      this._buildOverviewTab();
    } else if (tab === 'MEMBERS') {
      this._buildMembersTab();
    } else {
      this._buildPerformanceTab();
    }
  }

  _onTabChange(tab) {
    this._activeTab = tab;
    this._buildTabContent(tab);
  }

  // ── OVERVIEW tab ──────────────────────────────────────────────────────────────

  _buildOverviewTab() {
    const cs = this._contentSlot;
    const innerW = cs.props.width;

    cs.add(new Label({ text: 'Team Alpha', variant: 'title' }));
    cs.add(
      new Label({
        text: 'This screen is assembled entirely from framework components — no manual position.set() calls inside the body.',
        variant: 'body',
        wordWrap: true,
        wordWrapWidth: innerW,
      }),
    );

    cs.add(new Divider({ length: innerW }));

    // 3-column grid of metric cards
    const grid = new Grid({
      columns: 3,
      width: innerW,
      gap: Theme.spacing.md,
      align: 'start',
    });

    for (const card of FAKE_CARDS) {
      const cardPanel = new Panel({
        width: Math.floor((innerW - Theme.spacing.md * 2) / 3),
        height: 100,
        bg: Theme.colors.bgCard,
        border: Theme.colors.border,
        radius: Theme.radius.md,
        accentColor:
          card.score >= 70
            ? Theme.colors.success
            : card.score >= 50
              ? Theme.colors.warning
              : Theme.colors.danger,
      });

      const col = new Column({
        width: Math.floor((innerW - Theme.spacing.md * 2) / 3) - Theme.spacing.md * 2,
        height: 'auto',
        gap: 4,
        padding: Theme.spacing.sm,
      });
      col.add(new Label({ text: card.title, variant: 'label' }));
      col.add(
        new ProgressBar({
          width: Math.floor((innerW - Theme.spacing.md * 2) / 3) - Theme.spacing.md * 2,
          value: card.score / 100,
          fillColor:
            card.score >= 70
              ? Theme.colors.success
              : card.score >= 50
                ? Theme.colors.warning
                : Theme.colors.danger,
          height: 5,
        }),
      );
      col.add(new Label({ text: String(card.score), variant: 'subtitle' }));
      col.add(
        new Label({ text: card.desc, variant: 'caption', wordWrap: true, wordWrapWidth: 180 }),
      );

      cardPanel.addChild(col);
      grid.add(cardPanel);
    }

    cs.add(grid);
  }

  // ── MEMBERS tab ───────────────────────────────────────────────────────────────

  _buildMembersTab() {
    const cs = this._contentSlot;
    const innerW = cs.props.width;

    cs.add(new Label({ text: 'Team Members', variant: 'subtitle' }));
    cs.add(
      new Label({
        text: '(Tab content uses the same Column + Label composition)',
        variant: 'caption',
      }),
    );

    const names = ['Alex Morgan', 'Sam Chen', 'Jordan Lee', 'Riley Park'];
    const roles = ['Programmer', 'Designer', 'Programmer', 'PM'];
    const salaries = [640, 550, 710, 600];

    for (let i = 0; i < names.length; i++) {
      const row = new Row({
        width: innerW,
        height: 36,
        gap: Theme.spacing.md,
        align: 'center',
      });
      row.add(new Label({ text: names[i], variant: 'body' }));
      row.add(new Label({ text: roles[i], variant: 'caption' }));
      row.add(new Spacer({ flex: 1 }));
      row.add(new Label({ text: `$${salaries[i]}/day`, variant: 'label' }));
      cs.add(row);
      if (i < names.length - 1) cs.add(new Divider({ length: innerW }));
    }
  }

  // ── PERFORMANCE tab ───────────────────────────────────────────────────────────

  _buildPerformanceTab() {
    const cs = this._contentSlot;
    const innerW = cs.props.width;
    const metrics = [
      { label: 'Sprint Velocity', value: 0.74 },
      { label: 'Code Review Score', value: 0.61 },
      { label: 'On-time Delivery', value: 0.88 },
      { label: 'Bug Resolution', value: 0.52 },
    ];

    cs.add(new Label({ text: 'Performance Metrics', variant: 'subtitle' }));

    for (const m of metrics) {
      const row = new Row({ width: innerW, height: 32, gap: Theme.spacing.md, align: 'center' });
      row.add(new Label({ text: m.label, variant: 'body', width: 180 }));
      row.add(
        new ProgressBar({
          width: innerW - 180 - Theme.spacing.md * 3 - 40,
          value: m.value,
          fillColor:
            m.value >= 0.7
              ? Theme.colors.success
              : m.value >= 0.5
                ? Theme.colors.warning
                : Theme.colors.danger,
        }),
      );
      row.add(new Label({ text: `${Math.round(m.value * 100)}%`, variant: 'label', width: 40 }));
      cs.add(row);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────

  _buildFooter(popupW) {
    const INNER_W = popupW - Theme.spacing.md * 2;
    const footer = new Row({
      width: INNER_W,
      height: 'auto',
      gap: Theme.spacing.sm,
      align: 'center',
      justify: 'end',
    });
    footer.add(
      new Button({
        label: 'Cancel',
        variant: 'secondary',
        width: 100,
        onClick: () => {
          this.visible = false;
        },
      }),
    );
    footer.add(
      new Button({
        label: 'Confirm',
        variant: 'primary',
        width: 100,
        onClick: () => {
          this.visible = false;
        },
      }),
    );
    this._shell.setFooter(footer);
  }

  // ── Resize ────────────────────────────────────────────────────────────────────

  resize(screenW, screenH) {
    this._shell.resize(screenW, screenH);
  }
}
