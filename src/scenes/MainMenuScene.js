/**
 * MainMenuScene
 *
 * Title screen with two internal views:
 *   'title' — the default view with New Game / Load / Settings buttons.
 *   'load'  — a slot picker showing up to 5 save slots.
 *
 * Switching between views replaces only the content layer; the background
 * graphic is always visible and redrawn on resize.
 */
import { Container, Graphics, Text } from 'pixi.js';

import { BaseScene } from './BaseScene.js';
import { Button } from '../ui/Button.js';
import { GameConfig } from '../config.js';
import { getSlotMeta } from '../systems/SaveManager.js';

const { SLOT_COUNT } = GameConfig.save;

// Shared text style constants.
const FONT = 'Inter, system-ui, sans-serif';
const COLOR_MUTED  = 0x7a86a3;
const COLOR_DIM    = 0x3a4a6b;
const COLOR_TEXT   = 0xc8d4ed;
const COLOR_WHITE  = 0xffffff;
const COLOR_EMPTY  = 0x2a3550;

export class MainMenuScene extends BaseScene {
  constructor(game) {
    super(game);

    this._bg      = new Graphics();
    this._content = new Container();
    this._content.label = 'menu-content';

    /** @type {'title' | 'load'} */
    this._view = 'title';

    // Title-view nodes (null until built).
    this._title    = null;
    this._subtitle = null;
    this._version  = null;
    /** @type {Button[]} */
    this._titleBtns = [];

    // Load-view nodes (null until built).
    this._loadTitle = null;
    this._loadBackBtn = null;
    /** @type {Container[]} */
    this._slotRows = [];
  }

  async preload() {}

  async enter() {
    this.root.addChild(this._bg);
    this.root.addChild(this._content);

    this._buildTitleView();
    this._showView('title');
  }

  resize(width, height) {
    this._drawBg(width, height);
    if (this._view === 'title') {
      this._layoutTitle(width, height);
    } else {
      this._layoutLoad(width, height);
    }
  }

  update(_dt) {}

  async exit() {
    this._tearDownTitleView();
    this._tearDownLoadView();
    this._title    = null;
    this._subtitle = null;
    this._version  = null;
  }

  // -------------------------------------------------------------------------
  // View switching
  // -------------------------------------------------------------------------

  _showView(view) {
    this._view = view;
    this._content.removeChildren();

    if (view === 'title') {
      this._tearDownLoadView();
      this._buildTitleView();
      this._addTitleChildren();
    } else {
      this._tearDownTitleView();
      this._buildLoadView();
      this._addLoadChildren();
    }

    const { width, height } = this.game.screen;
    this.resize(width, height);
  }

  // -------------------------------------------------------------------------
  // Background
  // -------------------------------------------------------------------------

  _drawBg(width, height) {
    this._bg.clear().rect(0, 0, width, height).fill({ color: 0x0b0f1a });
    const gridColor = 0x0f172a;
    for (let i = 0; i < width; i += 80) {
      this._bg.moveTo(i, 0).lineTo(i, height);
    }
    for (let j = 0; j < height; j += 80) {
      this._bg.moveTo(0, j).lineTo(width, j);
    }
    this._bg.stroke({ color: gridColor, width: 1 });
  }

  // -------------------------------------------------------------------------
  // Title view
  // -------------------------------------------------------------------------

  _buildTitleView() {
    if (this._title) return; // already built

    this._title = new Text({
      text: GameConfig.meta.name,
      style: {
        fill: COLOR_WHITE,
        fontFamily: FONT,
        fontSize: 84,
        fontWeight: '800',
        letterSpacing: 2,
      },
    });
    this._title.anchor.set(0.5, 1);

    this._subtitle = new Text({
      text: 'Build your tech empire from the ground up',
      style: { fill: COLOR_MUTED, fontFamily: FONT, fontSize: 22, fontStyle: 'italic' },
    });
    this._subtitle.anchor.set(0.5, 0);

    const hasSave = getSlotMeta(0).occupied;

    const actions = [
      {
        label:   'New Game',
        handler: () => this.game.startNewGame(),
      },
      {
        label:    'Load Game',
        handler:  () => this._showView('load'),
        disabled: !hasSave,
      },
      {
        label:    'Settings',
        handler:  () => {},
        disabled: true,
      },
    ];

    this._titleBtns = actions.map(({ label, handler, disabled }) => {
      const btn = new Button(
        label,
        handler,
        disabled ? { bg: 0x111622, textColor: 0x4a5a7a, border: 0x1a2336 } : {},
      );
      if (disabled) btn.eventMode = 'none';
      return btn;
    });

    this._version = new Text({
      text: `v${GameConfig.meta.version}`,
      style: { fill: COLOR_DIM, fontFamily: 'monospace', fontSize: 12 },
    });
  }

  _addTitleChildren() {
    this._content.addChild(this._title);
    this._content.addChild(this._subtitle);
    for (const btn of this._titleBtns) this._content.addChild(btn);
    this._content.addChild(this._version);
  }

  _tearDownTitleView() {
    this._titleBtns = [];
    this._title     = null;
    this._subtitle  = null;
    this._version   = null;
  }

  _layoutTitle(width, height) {
    if (!this._title) return;

    const cx = width / 2;
    this._title.position.set(cx, height * 0.35);
    this._subtitle.position.set(cx, height * 0.35 + 16);

    const btnH   = this._titleBtns[0]?.style.height ?? 64;
    const btnW   = this._titleBtns[0]?.style.width  ?? 280;
    const gap    = 18;
    const startY = height * 0.5;

    this._titleBtns.forEach((btn, i) => {
      btn.position.set(cx - btnW / 2, startY + i * (btnH + gap));
    });

    if (this._version) {
      this._version.position.set(width - 80, height - 24);
    }
  }

  // -------------------------------------------------------------------------
  // Load view
  // -------------------------------------------------------------------------

  _buildLoadView() {
    if (this._loadTitle) return; // already built

    this._loadTitle = new Text({
      text: 'Load Game',
      style: { fill: COLOR_WHITE, fontFamily: FONT, fontSize: 52, fontWeight: '700' },
    });
    this._loadTitle.anchor.set(0.5, 0.5);

    this._slotRows = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      this._slotRows.push(this._buildSlotRow(i));
    }

    this._loadBackBtn = new Button('Back', () => this._showView('title'), {
      bg: 0x111622, textColor: COLOR_TEXT, border: 0x1a2336,
      width: 160, height: 48, fontSize: 18,
    });
  }

  _buildSlotRow(index) {
    const meta = getSlotMeta(index);
    const container = new Container();

    const ROW_W = 560;
    const ROW_H = 72;
    const RAD   = 10;

    const bg = new Graphics();

    if (meta.occupied) {
      bg.roundRect(0, 0, ROW_W, ROW_H, RAD)
        .fill({ color: 0x1a2740 })
        .stroke({ color: 0x3a5a9a, width: 2, alignment: 1 });

      const slotLabel = new Text({
        text: `Slot ${index + 1}`,
        style: { fill: 0x4a7aff, fontFamily: FONT, fontSize: 13, fontWeight: '600' },
      });
      slotLabel.position.set(16, 10);

      // Show the custom save name if set, otherwise fall back to the company name.
      const displayName = meta.saveName ?? meta.companyName;
      const nameText = new Text({
        text: displayName,
        style: { fill: COLOR_WHITE, fontFamily: FONT, fontSize: 20, fontWeight: '700' },
      });
      nameText.position.set(16, 28);

      const infoText = new Text({
        text: `${meta.companyName}  ·  Day ${meta.day}  ·  $${(meta.money ?? 0).toLocaleString()}`,
        style: { fill: COLOR_MUTED, fontFamily: FONT, fontSize: 14 },
      });
      infoText.position.set(16, 52);

      const dateStr = meta.savedAt
        ? new Date(meta.savedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : '';
      const dateText = new Text({
        text: dateStr,
        style: { fill: COLOR_DIM, fontFamily: 'monospace', fontSize: 12 },
      });
      dateText.anchor.set(1, 0);
      dateText.position.set(ROW_W - 14, 10);

      container.addChild(bg, slotLabel, nameText, infoText, dateText);

      // Make the whole row clickable.
      container.eventMode = 'static';
      container.cursor    = 'pointer';
      container.on('pointerover',  () => { bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: 0x223660 }).stroke({ color: 0x4a7aff, width: 2, alignment: 1 }); });
      container.on('pointerout',   () => { bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: 0x1a2740 }).stroke({ color: 0x3a5a9a, width: 2, alignment: 1 }); });
      container.on('pointerdown',  () => { bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: 0x152030 }).stroke({ color: 0x3a5a9a, width: 2, alignment: 1 }); });
      container.on('pointerup',    () => { this.game.loadFromSlot(index); });
      container.on('pointerupoutside', () => { bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: 0x1a2740 }).stroke({ color: 0x3a5a9a, width: 2, alignment: 1 }); });
    } else {
      bg.roundRect(0, 0, ROW_W, ROW_H, RAD)
        .fill({ color: COLOR_EMPTY })
        .stroke({ color: 0x1e2d47, width: 1, alignment: 1 });

      const emptyText = new Text({
        text: `Slot ${index + 1}  —  Empty`,
        style: { fill: COLOR_DIM, fontFamily: FONT, fontSize: 18 },
      });
      emptyText.anchor.set(0, 0.5);
      emptyText.position.set(16, ROW_H / 2);

      container.addChild(bg, emptyText);
    }

    return container;
  }

  _addLoadChildren() {
    this._content.addChild(this._loadTitle);
    for (const row of this._slotRows) this._content.addChild(row);
    this._content.addChild(this._loadBackBtn);
  }

  _tearDownLoadView() {
    this._slotRows    = [];
    this._loadTitle   = null;
    this._loadBackBtn = null;
  }

  _layoutLoad(width, height) {
    if (!this._loadTitle) return;

    const cx       = width / 2;
    const ROW_W    = 560;
    const ROW_H    = 72;
    const ROW_GAP  = 12;
    const totalH   = SLOT_COUNT * ROW_H + (SLOT_COUNT - 1) * ROW_GAP;
    const startY   = (height - totalH) / 2;

    this._loadTitle.position.set(cx, startY - 52);

    this._slotRows.forEach((row, i) => {
      row.x = cx - ROW_W / 2;
      row.y = startY + i * (ROW_H + ROW_GAP);
    });

    const backW = this._loadBackBtn.style.width ?? 160;
    this._loadBackBtn.position.set(cx - backW / 2, startY + totalH + 28);
  }
}
