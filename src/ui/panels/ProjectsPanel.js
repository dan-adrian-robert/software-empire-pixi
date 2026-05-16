/**
 * ProjectsPanel
 *
 * Overlay panel listing Active projects (with progress bars) and
 * Available projects (with Accept/Reject buttons).
 *
 * Re-rendered on `refresh()` which is called by OfficeScene on relevant bus events.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { SKILL_LABELS, SKILL_COLORS } from '../../data/skills.js';
import { projectProgress } from '../../state/Project.js';
import { Panel } from '../Panel.js';

const SECTION_LABEL_COLOR = 0x7a86a3;
const CARD_BG = 0x131929;
const CARD_BORDER = 0x1e3050;
const ACTIVE_CARD_BORDER = 0x2a5090;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const PAYOUT_COLOR = 0x4ade80;
const PADDING = 12;
const CARD_RADIUS = 8;
const PROGRESS_TRACK = 0x1a2336;

export class ProjectsPanel extends Container {
  /**
   * @param {import('../../Game.js').Game} game
   * @param {(panel: Container) => void} [onClose]
   */
  constructor(game, onClose) {
    super();
    this.game = game;
    this.onClose = onClose;

    this._scroll = new Container();
    this._mask = new Graphics();
    this.addChild(this._scroll);

    this._width = 600;
    this._height = 500;
    this._scrollY = 0;
  }

  init(x, y, width, height) {
    this._width = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  resize(x, y, width, height) {
    this._width = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  refresh() {
    this._scroll.removeChildren();
    const company = this.game.sim?.company;
    if (!company) return;

    let y = 0;

    y = this._buildSection('Active Projects', company.activeProjects, y, true);
    y += 8;
    y = this._buildSection('Available Projects', company.availableProjects, y, false);
  }

  // -----------------------------------------------------------------------

  _buildSection(title, projects, startY, isActive) {
    let y = startY;

    const header = new Text({
      text: title.toUpperCase(),
      style: {
        fill: SECTION_LABEL_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    header.position.set(PADDING, y);
    this._scroll.addChild(header);
    y += 22;

    if (projects.length === 0) {
      const empty = new Text({
        text: isActive ? 'No active projects.' : 'No projects available.',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      });
      empty.position.set(PADDING + 8, y);
      this._scroll.addChild(empty);
      return y + 24;
    }

    const COL_COUNT = 2;
    const COL_GAP = 8;
    const cardW = Math.floor((this._width - PADDING * 2 - COL_GAP * (COL_COUNT - 1)) / COL_COUNT);

    for (let i = 0; i < projects.length; i += COL_COUNT) {
      let rowH = 0;
      for (let col = 0; col < COL_COUNT && i + col < projects.length; col++) {
        const x = PADDING + col * (cardW + COL_GAP);
        const h = this._buildProjectCard(projects[i + col], y, isActive, x, cardW);
        rowH = Math.max(rowH, h);
      }
      y += rowH + 8;
    }

    return y;
  }

  /**
   * @returns {number} card height (px)
   */
  _buildProjectCard(project, startY, isActive, startX = PADDING, cardW = null) {
    if (cardW === null) cardW = this._width - PADDING * 2;
    const company = this.game.sim.company;

    const reqCount = project.requirements.length;
    const cardH = 64 + reqCount * 24 + (isActive && !project.isReadyToFinish ? 0 : 36);

    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, CARD_RADIUS)
      .fill({ color: CARD_BG })
      .stroke({ color: isActive ? ACTIVE_CARD_BORDER : CARD_BORDER, width: 1.5 });
    bg.position.set(startX, startY);
    this._scroll.addChild(bg);

    const nameText = new Text({
      text: project.name,
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
      },
    });
    nameText.position.set(startX + 10, startY + 10);
    this._scroll.addChild(nameText);

    const payoutText = new Text({
      text: `$${project.payout.toLocaleString()}`,
      style: {
        fill: PAYOUT_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '700',
      },
    });
    payoutText.anchor.set(1, 0);
    payoutText.position.set(startX + cardW - 10, startY + 10);
    this._scroll.addChild(payoutText);

    const descText = new Text({
      text: project.description,
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        wordWrap: true,
        wordWrapWidth: cardW - 20,
      },
    });
    descText.position.set(startX + 10, startY + 28);
    this._scroll.addChild(descText);

    let reqY = startY + 46;
    for (const req of project.requirements) {
      const pct = Math.min(1, req.current / req.points);
      const barW = Math.floor(cardW * 0.45);
      const skillColor = SKILL_COLORS[req.skill] ?? 0x4a9eff;

      const skillLabel = new Text({
        text: SKILL_LABELS[req.skill] ?? req.skill,
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
        },
      });
      skillLabel.position.set(startX + 10, reqY);
      this._scroll.addChild(skillLabel);

      // Track
      const trackBg = new Graphics()
        .roundRect(0, 0, barW, 10, 3)
        .fill({ color: PROGRESS_TRACK });
      trackBg.position.set(startX + cardW - barW - 48, reqY + 1);
      this._scroll.addChild(trackBg);

      // Fill
      const fillW = Math.max(0, barW * pct);
      if (fillW > 0) {
        const fill = new Graphics()
          .roundRect(0, 0, fillW, 10, 3)
          .fill({ color: skillColor });
        fill.position.set(startX + cardW - barW - 48, reqY + 1);
        this._scroll.addChild(fill);
      }

      const ptText = new Text({
        text: `${Math.floor(req.current)}/${req.points}`,
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
        },
      });
      ptText.anchor.set(1, 0);
      ptText.position.set(startX + cardW - 10, reqY);
      this._scroll.addChild(ptText);

      reqY += 20;
    }

    // Collect button for finished active projects.
    if (isActive && project.isReadyToFinish) {
      const btnY = reqY - startY + 8;
      const collectBtn = this._makeButton(
        `Collect $${project.payout.toLocaleString()}`,
        0x0a2a14, 0x4ade80,
        () => {
          this.game.sim.finishProject(project);
          this.refresh();
        },
        120,
      );
      collectBtn.position.set(startX + cardW - 130, startY + btnY);
      this._scroll.addChild(collectBtn);
    }

    // Buttons for available projects.
    if (!isActive) {
      const canAccept = company.activeProjects.length < company.maxActiveProjects;
      const btnY = reqY - startY + 4;

      const acceptBtn = this._makeButton(
        'Accept',
        canAccept ? 0x1a3a1a : 0x1a1a1a,
        canAccept ? 0x4ade80 : 0x4a5a6a,
        () => {
          if (!canAccept) return;
          this.game.sim.acceptProject(project);
          this.refresh();
        },
      );
      acceptBtn.position.set(startX + cardW - 160, startY + btnY);
      this._scroll.addChild(acceptBtn);

      const rejectBtn = this._makeButton('Reject', 0x2a1a1a, 0xf87171, () => {
        this.game.sim.rejectProject(project);
        this.refresh();
      });
      rejectBtn.position.set(startX + cardW - 76, startY + btnY);
      this._scroll.addChild(rejectBtn);
    }

    return cardH;
  }

  _makeButton(label, bgColor, textColor, onClick, width = 72) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, width, 26, 5)
      .fill({ color: bgColor })
      .stroke({ color: textColor, width: 1, alpha: 0.5 });
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, 13);
    container.addChild(text);

    container.on('pointerup', onClick);
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout', () => { bg.alpha = 1; });

    return container;
  }
}
