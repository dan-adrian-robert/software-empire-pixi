/**
 * EmployeeStatsPopup
 *
 * Tabbed employee detail modal (920×660, centered on screen).
 *
 * Tabs:
 *   ARCHETYPES   — personality wheel, top archetypes, personality/likes stubs, mute button
 *   COMMUNICATION — 4 category cards with scored topics, strongest likes/dislikes, guide
 *
 * Usage (signature unchanged from callers):
 *   popup.open(emp, company, anchorX, anchorY, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *   popup.refresh(company)
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ROLE_LABELS } from '../data/staffRoles.js';
import { ARCHETYPES, CATEGORY_COLORS as ARCH_CATEGORY_COLORS } from '../data/archetypes.js';
import { getDisplayName } from '../data/archetypeDisplayNames.js';
import { getCharacterAvatarTex } from '../utils/characterSprite.js';
import { GameConfig } from '../config.js';
import {
  COMMUNICATION_CATEGORIES,
  CATEGORY_ICONS,
  TOPIC_ICONS,
  CATEGORY_COLORS as COMM_CATEGORY_COLORS,
} from '../data/communicationTopics.js';
import { getScoreColor, getTopTopics, getBottomTopics } from '../utils/communicationScores.js';
import { relationshipKey } from '../state/relationships.js';
import { PopupShell } from './screens/PopupShell.js';
import { Tabs } from './widgets/Tabs.js';
import { Label } from './widgets/Label.js';
import { EmployeeArchetypeWheel } from './components/ArchetypeWheel.js';
import { Theme } from './foundation/Theme.js';

// ── Layout ────────────────────────────────────────────────────────────────────
const POPUP_W  = 920;
const POPUP_H  = 660;
const HEADER_H = 90;
const P        = 12;

// ARCHETYPES tab — two-column layout
const ARCH_LEFT_X  = P;
const ARCH_LEFT_W  = 240;
const ARCH_DIV_X   = ARCH_LEFT_X + ARCH_LEFT_W + 8;  // 260
const ARCH_RIGHT_X = ARCH_DIV_X + 8;                 // 268
const ARCH_RIGHT_W = POPUP_W - ARCH_RIGHT_X - P;     // 640

// INTERACTIONS tab — 2-column grid of relationship cards
const INT_COL_GAP = P;
const INT_COL_W   = Math.floor((POPUP_W - P * 2 - INT_COL_GAP) / 2);
const INT_CARD_H  = 64;
const INT_CARD_R  = 6;
const INT_BAR_H   = 5;
const INT_AVATAR  = 36;

/** Friendship thresholds → display metadata. */
const FRIENDSHIP_TIERS = [
  { min: 70,  label: 'Close Friend',  color: 0x4ade80 },
  { min: 55,  label: 'Friendly',      color: 0x84cc16 },
  { min: 45,  label: 'Neutral',       color: 0x7a86a3 },
  { min: 30,  label: 'Cold',          color: 0xf59e0b },
  { min: -Infinity, label: 'Hostile', color: 0xf87171 },
];

function friendshipTier(score) {
  return FRIENDSHIP_TIERS.find((t) => score >= t.min) ?? FRIENDSHIP_TIERS[FRIENDSHIP_TIERS.length - 1];
}

// COMMUNICATION tab — 4 equal cards
const COMM_CARD_GAP  = P;
const COMM_CARD_W    = Math.floor((POPUP_W - P * 2 - COMM_CARD_GAP * 3) / 4);
const COMM_CARD_HDR  = 58;
const COMM_CARD_PAD  = 8;
const COMM_TOPIC_H   = 38;
const COMM_CARD_H    = COMM_CARD_HDR + COMMUNICATION_CATEGORIES[0].topics.length * COMM_TOPIC_H + COMM_CARD_PAD * 2;

// ─────────────────────────────────────────────────────────────────────────────

export class EmployeeStatsPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game       = game;
    this.visible    = false;
    this._emp       = null;
    this._company   = null;
    this._activeTab = 'ARCHETYPES';

    this._shell = new PopupShell({
      width: POPUP_W,
      height: POPUP_H,
      noHeader: true,
      onClose: () => {
        this._emp     = null;
        this._company = null;
        this.visible  = false;
      },
    });
    this.addChild(this._shell);

    this._content = new Container();
    this._shell.window.addChild(this._content);
  }

  get currentEmp() { return this._emp; }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** anchorX / anchorY are ignored — popup is always centered. */
  open(emp, company, _anchorX, _anchorY, screenW, screenH) {
    this._emp       = emp;
    this._company   = company;
    this._activeTab = 'ARCHETYPES';
    this._shell.open(screenW, screenH);
    this._draw(emp, company);
    this.visible = true;
  }

  close() {
    this._emp     = null;
    this._company = null;
    this.visible  = false;
    this._shell.visible = false;
  }

  resize(screenW, screenH) {
    this._shell.resize(screenW, screenH);
    if (!this.visible || !this._emp) return;
    if (this._company) this._draw(this._emp, this._company);
  }

  refresh(company) {
    this._company = company;
    if (!this.visible || !this._emp) return;
    this._draw(this._emp, company);
  }

  // ── Root draw ────────────────────────────────────────────────────────────────

  _draw(emp, company) {
    this._content.removeChildren();

    // Header band background (chrome provided by PopupShell; this is just the tinted strip)
    this._content.addChild(
      new Graphics()
        .roundRect(0, 0, POPUP_W, HEADER_H + 12, 12)
        .fill({ color: Theme.colors.bgHeader }),
    );
    this._content.addChild(
      new Graphics()
        .rect(0, HEADER_H / 2, POPUP_W, HEADER_H / 2 + 4)
        .fill({ color: Theme.colors.bgHeader }),
    );

    this._drawHeader(emp, company);

    if (this._activeTab === 'ARCHETYPES') {
      this._drawArchetypesTab(emp, company);
    } else if (this._activeTab === 'INTERACTIONS') {
      this._drawInteractionsTab(emp, company);
    } else {
      this._drawCommunicationTab(emp);
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────────

  _drawHeader(emp, company) {
    const AVATAR_SIZE = 52;
    const avatarTex   = getCharacterAvatarTex(emp.characterIndex ?? 1);
    const avatar      = new Sprite(avatarTex);
    avatar.width      = AVATAR_SIZE;
    avatar.height     = AVATAR_SIZE;
    avatar.position.set(P, 8);
    this._content.addChild(avatar);

    const textX = P + AVATAR_SIZE + 10;

    const nameLabel = new Label({ text: emp.name, variant: 'title' });
    nameLabel.position.set(textX, 8);
    this._content.addChild(nameLabel);

    const roleLabel = new Label({
      text: ROLE_LABELS[emp.role] ?? emp.role,
      style: { fill: Theme.colors.xp, fontFamily: Theme.typography.fontFamily, fontSize: 12, fontWeight: '600' },
    });
    roleLabel.position.set(textX, 28);
    this._content.addChild(roleLabel);

    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const teamStr    = team ? team.name : 'No team';

    const infoLabel = new Label({
      text: `📍 ${teamStr}   💰 $${emp.salary.toLocaleString()}/day`,
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
    });
    infoLabel.position.set(textX, 46);
    this._content.addChild(infoLabel);

    // Level + XP bar
    const { EXP_PER_LEVEL } = GameConfig.gameplay;
    const expFrac  = Math.min(1, (emp.exp ?? 0) / EXP_PER_LEVEL);
    const barX     = textX + 36;
    const barY     = 64;
    const barW     = 150;

    const levelLbl = new Label({
      text: `Lv. ${emp.level ?? 0}`,
      style: { fill: Theme.colors.xp, fontFamily: Theme.typography.fontFamily, fontSize: 10, fontWeight: '700' },
    });
    levelLbl.position.set(textX, 62);
    this._content.addChild(levelLbl);

    this._content.addChild(
      new Graphics().roundRect(barX, barY, barW, 5, 2).fill({ color: 0x1a1a3a }),
    );
    if (expFrac > 0) {
      this._content.addChild(
        new Graphics()
          .roundRect(barX, barY, Math.max(2, Math.round(barW * expFrac)), 5, 2)
          .fill({ color: Theme.colors.xp, alpha: 0.85 }),
      );
    }
    const xpLbl = new Label({
      text: `${emp.exp ?? 0} / ${EXP_PER_LEVEL} XP`,
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 8 },
    });
    xpLbl.position.set(barX + barW + 6, 63);
    this._content.addChild(xpLbl);

    // Close button
    const closeT = new Text({
      text: '✕',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
    });
    closeT.anchor.set(1, 0);
    closeT.position.set(POPUP_W - P, 16);
    closeT.eventMode = 'static';
    closeT.cursor    = 'pointer';
    closeT.on('pointerup',   () => this.close());
    closeT.on('pointerover', () => { closeT.alpha = 0.6; });
    closeT.on('pointerout',  () => { closeT.alpha = 1; });
    this._content.addChild(closeT);

    // Tabs widget (replaces manual tab text + click handlers)
    const tabs = new Tabs({
      tabs: ['ARCHETYPES', 'COMMUNICATION', 'INTERACTIONS'],
      active: this._activeTab,
      gap: 22,
      onChange: (tab) => {
        this._activeTab = tab;
        this._draw(this._emp, this._company);
      },
    });
    tabs.position.set(textX, 86);
    this._content.addChild(tabs);

    // Header bottom divider
    this._content.addChild(
      new Graphics()
        .moveTo(0, HEADER_H + 16)
        .lineTo(POPUP_W, HEADER_H + 16)
        .stroke({ color: Theme.colors.border, width: 1 }),
    );
  }

  // ── ARCHETYPES tab ───────────────────────────────────────────────────────────

  _drawArchetypesTab(emp, company) {
    // Column divider
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_DIV_X, HEADER_H + P * 2)
        .lineTo(ARCH_DIV_X, POPUP_H - P * 2)
        .stroke({ color: Theme.colors.divider, width: 1 }),
    );

    let leftY = HEADER_H + P * 2;
    leftY = this._drawTopArchetypes(emp, leftY);
    leftY = this._drawPersonalitySummary(leftY);
    leftY = this._drawLikesDislikes(leftY);
    this._appendMuteButton(emp, company, leftY);

    let rightY = HEADER_H + P * 2;
    rightY = this._drawArchetypeWheel(emp, company, rightY);
    this._drawBestWorkEnvironment(rightY);
  }

  // ── Left column ──────────────────────────────────────────────────────────────

  _drawTopArchetypes(emp, y) {
    this._addLeftSectionHeader('TOP ARCHETYPES', y);
    y += 16;

    const sorted = Object.entries(emp.archetypes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [archId, weight] of sorted) {
      const def   = ARCHETYPES[archId];
      const color = ARCH_CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const isPri = weight === 60;

      this._content.addChild(
        new Graphics().circle(ARCH_LEFT_X + 6, y + 8, 5).fill({ color }),
      );

      const archT = new Text({
        text: def?.label ?? archId,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 11, fontWeight: isPri ? '700' : '400' },
      });
      archT.position.set(ARCH_LEFT_X + 16, y + 1);
      this._content.addChild(archT);

      const pctT = new Text({
        text: `${weight}%`,
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 11, fontWeight: '700' },
      });
      pctT.anchor.set(1, 0);
      pctT.position.set(ARCH_DIV_X - 8, y + 1);
      this._content.addChild(pctT);

      y += 20;
    }

    this._addLeftHorizDivider(y);
    return y + 10;
  }

  _drawPersonalitySummary(y) {
    this._addLeftSectionHeader('PERSONALITY SUMMARY', y);
    y += 16;

    const body = new Label({
      text: '/TODO',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 10 },
    });
    body.position.set(ARCH_LEFT_X, y);
    this._content.addChild(body);
    y += 22;

    this._addLeftHorizDivider(y);
    return y + 10;
  }

  _drawLikesDislikes(y) {
    const halfW = Math.floor((ARCH_LEFT_W - 8) / 2);
    const col2X = ARCH_LEFT_X + halfW + 8;

    const likesHdr = new Label({
      text: '♥ LIKES',
      style: { fill: Theme.colors.success, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontWeight: '700' },
    });
    likesHdr.position.set(ARCH_LEFT_X, y);
    this._content.addChild(likesHdr);

    const dislikesHdr = new Label({
      text: '✕ DISLIKES',
      style: { fill: Theme.colors.dangerLight, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontWeight: '700' },
    });
    dislikesHdr.position.set(col2X, y);
    this._content.addChild(dislikesHdr);
    y += 16;

    for (const xOff of [0, col2X - ARCH_LEFT_X]) {
      const todo = new Label({
        text: '/TODO',
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 10 },
      });
      todo.position.set(ARCH_LEFT_X + xOff, y);
      this._content.addChild(todo);
    }
    y += 22;

    this._addLeftHorizDivider(y);
    return y + 10;
  }

  _appendMuteButton(emp, company, y) {
    const btnW    = ARCH_LEFT_W;
    const btnH    = 24;
    const muted   = emp.logsMuted;
    const bgColor = muted ? 0x2a2000 : Theme.colors.bgPanel;
    const clr     = muted ? Theme.colors.salary : Theme.colors.textSubtle;

    const btnBg = new Graphics()
      .roundRect(ARCH_LEFT_X, y, btnW, btnH, 5)
      .fill({ color: bgColor })
      .stroke({ color: clr, width: 1, alpha: 0.8 });
    btnBg.eventMode = 'static';
    btnBg.cursor    = 'pointer';
    btnBg.on('pointerup',   () => { emp.logsMuted = !emp.logsMuted; this._draw(emp, company); });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

    const label = new Text({
      text: muted ? '🔕 Unmute logs' : '🔔 Mute logs',
      style: { fill: clr, fontFamily: Theme.typography.fontFamily, fontSize: 11, fontWeight: '600' },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(ARCH_LEFT_X + btnW / 2, y + btnH / 2);
    label.eventMode = 'none';

    this._content.addChild(btnBg);
    this._content.addChild(label);
  }

  // ── Right column ─────────────────────────────────────────────────────────────

  _drawArchetypeWheel(emp, company, y) {
    const archetypes = emp.archetypes ?? {};

    const sectionHdr = new Label({ text: 'ARCHETYPE PROFILE', variant: 'sectionHeader' });
    sectionHdr.position.set(ARCH_RIGHT_X + 4, y);
    this._content.addChild(sectionHdr);
    y += 20;

    // Compute team fit for the wheel centre
    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const rawScore   = (team && teamSystem) ? teamSystem.teamCompatibility(company, team) : null;
    const fitPct     = rawScore !== null ? Math.round((rawScore + 100) / 2) : null;
    const fitColor   = fitPct === null
      ? Theme.colors.textDim
      : fitPct >= 60 ? Theme.colors.success : fitPct >= 40 ? Theme.colors.salary : Theme.colors.dangerLight;

    // EmployeeArchetypeWheel replaces ~140 lines of _drawArchetypeWheel
    const wheel = new EmployeeArchetypeWheel({
      archetypes,
      displayName: getDisplayName(archetypes),
      fitPct,
      fitColor,
      width: ARCH_RIGHT_W,
    });
    wheel.position.set(ARCH_RIGHT_X, y);
    this._content.addChild(wheel);

    return y + wheel.measure().height + 20;
  }

  _drawBestWorkEnvironment(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_RIGHT_X, y)
        .lineTo(POPUP_W - P, y)
        .stroke({ color: Theme.colors.divider, width: 1 }),
    );
    y += 10;

    const lbl = new Label({ text: 'BEST WORK ENVIRONMENT', variant: 'sectionHeader' });
    lbl.position.set(ARCH_RIGHT_X + 4, y);
    this._content.addChild(lbl);
  }

  // ── INTERACTIONS tab ─────────────────────────────────────────────────────────

  _drawInteractionsTab(emp, company) {
    const others = company.employees.filter((e) => e.id !== emp.id);
    const tabY   = HEADER_H + P * 2;
    const font   = Theme.typography.fontFamily;

    if (others.length === 0) {
      const empty = new Text({
        text: 'No other employees hired yet.',
        style: { fill: Theme.colors.textDim, fontFamily: font, fontSize: 13 },
      });
      empty.anchor.set(0.5, 0.5);
      empty.position.set(POPUP_W / 2, POPUP_H / 2);
      this._content.addChild(empty);
      return;
    }

    // Sort by friendship descending (best relationships first).
    const sorted = [...others].sort((a, b) => {
      const fa = (company.relationships[relationshipKey(emp.id, a.id)]?.friendship ?? 50);
      const fb = (company.relationships[relationshipKey(emp.id, b.id)]?.friendship ?? 50);
      return fb - fa;
    });

    let col = 0;
    let row = 0;

    for (const other of sorted) {
      const friendship = Math.round(
        (company.relationships[relationshipKey(emp.id, other.id)]?.friendship ?? 50) * 10,
      ) / 10;
      const tier = friendshipTier(friendship);

      const cardX = P + col * (INT_COL_W + INT_COL_GAP);
      const cardY = tabY + row * (INT_CARD_H + 8);

      // Card background
      this._content.addChild(
        new Graphics()
          .roundRect(cardX, cardY, INT_COL_W, INT_CARD_H, INT_CARD_R)
          .fill({ color: Theme.colors.bgCard })
          .stroke({ color: tier.color, width: 1, alpha: 0.3 }),
      );

      // Left accent strip (tier colour)
      this._content.addChild(
        new Graphics()
          .roundRect(cardX, cardY, 3, INT_CARD_H, INT_CARD_R)
          .fill({ color: tier.color }),
      );

      // Avatar
      const avatarTex = getCharacterAvatarTex(other.characterIndex ?? 1);
      const avatar    = new Sprite(avatarTex);
      avatar.width    = INT_AVATAR;
      avatar.height   = INT_AVATAR;
      avatar.position.set(cardX + 10, cardY + (INT_CARD_H - INT_AVATAR) / 2);
      this._content.addChild(avatar);

      const textX = cardX + 10 + INT_AVATAR + 8;

      // Name
      const nameT = new Text({
        text: other.name,
        style: { fill: Theme.colors.textBright, fontFamily: font, fontSize: 12, fontWeight: '700' },
      });
      nameT.position.set(textX, cardY + 8);
      this._content.addChild(nameT);

      // Tier label
      const tierT = new Text({
        text: tier.label,
        style: { fill: tier.color, fontFamily: font, fontSize: 10, fontWeight: '600' },
      });
      tierT.position.set(textX, cardY + 24);
      this._content.addChild(tierT);

      // Friendship bar
      const barX = textX;
      const barW = INT_COL_W - (textX - cardX) - 52;
      const barY = cardY + 40;

      // Normalise: 0 maps to 0%, 100 maps to 100% (bar can overflow but is clamped).
      const fillPct = Math.min(1, Math.max(0, friendship / 100));

      this._content.addChild(
        new Graphics()
          .roundRect(barX, barY, barW, INT_BAR_H, 2)
          .fill({ color: Theme.colors.divider }),
      );
      if (fillPct > 0) {
        this._content.addChild(
          new Graphics()
            .roundRect(barX, barY, Math.max(2, Math.round(barW * fillPct)), INT_BAR_H, 2)
            .fill({ color: tier.color }),
        );
      }

      // Numeric score (right-aligned in card)
      const scoreT = new Text({
        text: String(friendship),
        style: { fill: tier.color, fontFamily: font, fontSize: 14, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0.5);
      scoreT.position.set(cardX + INT_COL_W - 8, cardY + INT_CARD_H / 2);
      this._content.addChild(scoreT);

      // Advance grid position
      col++;
      if (col >= 2) { col = 0; row++; }
    }
  }

  // ── COMMUNICATION tab ────────────────────────────────────────────────────────

  _drawCommunicationTab(emp) {
    const comm = emp.communication ?? {};

    if (Object.keys(comm).length === 0) {
      const noData = new Text({
        text: 'No communication data',
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 12 },
      });
      noData.anchor.set(0.5, 0.5);
      noData.position.set(POPUP_W / 2, POPUP_H / 2);
      this._content.addChild(noData);
      return;
    }

    const cardsY = HEADER_H + P * 2;
    for (let ci = 0; ci < COMMUNICATION_CATEGORIES.length; ci++) {
      const cat   = COMMUNICATION_CATEGORIES[ci];
      const cardX = P + ci * (COMM_CARD_W + COMM_CARD_GAP);
      this._drawCategoryCard(cat, comm, cardX, cardsY);
    }

    const summaryY = cardsY + COMM_CARD_H + P * 2;
    this._drawSummaryPanels(comm, summaryY);
  }

  _drawCategoryCard(cat, comm, cardX, cardY) {
    const catColor = COMM_CATEGORY_COLORS[cat.id] ?? Theme.colors.primary;

    this._content.addChild(
      new Graphics()
        .roundRect(cardX, cardY, COMM_CARD_W, COMM_CARD_H, 6)
        .fill({ color: Theme.colors.bgCard })
        .stroke({ color: catColor, width: 1, alpha: 0.4 }),
    );

    this._content.addChild(
      new Graphics()
        .roundRect(cardX, cardY, COMM_CARD_W, 3, 2)
        .fill({ color: catColor }),
    );

    const iconT = new Text({ text: CATEGORY_ICONS[cat.id] ?? '📋', style: { fontSize: 17 } });
    iconT.position.set(cardX + COMM_CARD_PAD, cardY + 9);
    this._content.addChild(iconT);

    const titleT = new Text({
      text: cat.label,
      style: { fill: catColor, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
    });
    titleT.position.set(cardX + COMM_CARD_PAD + 22, cardY + 9);
    this._content.addChild(titleT);

    const subT = new Text({
      text: `(${cat.topics.length} topics)`,
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 12 },
    });
    subT.position.set(cardX + COMM_CARD_PAD, cardY + 30);
    this._content.addChild(subT);

    const opinionT = new Text({
      text: 'Opinion (1-100)',
      style: { fill: Theme.colors.textMuted, fontFamily: Theme.typography.fontFamily, fontSize: 12 },
    });
    opinionT.anchor.set(1, 0);
    opinionT.position.set(cardX + COMM_CARD_W - COMM_CARD_PAD, cardY + 30);
    this._content.addChild(opinionT);

    this._content.addChild(
      new Graphics()
        .moveTo(cardX + COMM_CARD_PAD, cardY + COMM_CARD_HDR - 4)
        .lineTo(cardX + COMM_CARD_W - COMM_CARD_PAD, cardY + COMM_CARD_HDR - 4)
        .stroke({ color: Theme.colors.divider, width: 1 }),
    );

    for (let ti = 0; ti < cat.topics.length; ti++) {
      const topic = cat.topics[ti];
      const score = comm[topic.id] ?? 50;
      const color = getScoreColor(score);
      const rowY  = cardY + COMM_CARD_HDR + COMM_CARD_PAD + ti * COMM_TOPIC_H;

      const topicIcon = new Text({ text: TOPIC_ICONS[topic.id] ?? '•', style: { fontSize: 13 } });
      topicIcon.position.set(cardX + COMM_CARD_PAD, rowY);
      this._content.addChild(topicIcon);

      const labelT = new Text({
        text: topic.label,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 13 },
      });
      labelT.position.set(cardX + COMM_CARD_PAD + 18, rowY + 1);
      this._content.addChild(labelT);

      const scoreT = new Text({
        text: String(score),
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 13, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(cardX + COMM_CARD_W - COMM_CARD_PAD, rowY + 1);
      this._content.addChild(scoreT);

      const barX  = cardX + COMM_CARD_PAD;
      const barY  = rowY + 20;
      const barW  = COMM_CARD_W - COMM_CARD_PAD * 2;
      const fillW = Math.max(2, Math.round(barW * (score / 100)));

      this._content.addChild(
        new Graphics().roundRect(barX, barY, barW, 3, 1).fill({ color: Theme.colors.divider }),
      );
      this._content.addChild(
        new Graphics().roundRect(barX, barY, fillW, 3, 1).fill({ color }),
      );
    }
  }

  _drawSummaryPanels(comm, y) {
    const panelW      = Math.floor((POPUP_W - P * 4) / 3);
    const likeX       = P;
    const dislikeX    = P * 2 + panelW;
    const guideX      = P * 3 + panelW * 2;
    const ITEM_H      = 28;
    const BOX_PAD     = 10;
    const GUIDE_BANDS = [
      { range: '80 - 100', label: 'Strong Agreement',   desc: 'Great conversations, strong bond potential', color: Theme.colors.success },
      { range: '60 - 79',  label: 'Agreement',           desc: 'Positive conversations',                    color: Theme.colors.successDim },
      { range: '40 - 59',  label: 'Neutral',             desc: 'Neutral conversations',                     color: Theme.colors.warning },
      { range: '20 - 39',  label: 'Disagreement',        desc: 'Potential for tension',                     color: Theme.colors.danger },
      { range: '1 - 19',   label: 'Strong Disagreement', desc: 'High conflict risk',                        color: Theme.colors.dangerDark },
    ];
    const listBoxH  = BOX_PAD + 20 + 3 * ITEM_H + BOX_PAD;
    const guideBoxH = BOX_PAD + 18 + 16 + GUIDE_BANDS.length * 32 + BOX_PAD;

    const drawPanelBox = (x, boxY, w, h, strokeColor) => {
      this._content.addChild(
        new Graphics()
          .roundRect(x, boxY, w, h, 6)
          .fill({ color: Theme.colors.bgCard })
          .stroke({ color: strokeColor, width: 1, alpha: 0.45 }),
      );
    };

    const boxY = y - BOX_PAD;
    drawPanelBox(likeX, boxY, panelW, listBoxH, Theme.colors.success);
    drawPanelBox(dislikeX, boxY, panelW, listBoxH, Theme.colors.dangerLight);
    drawPanelBox(guideX, boxY, panelW, guideBoxH, Theme.colors.border);

    const likeInnerX    = likeX + BOX_PAD;
    const dislikeInnerX = dislikeX + BOX_PAD;
    const guideInnerX   = guideX + BOX_PAD;
    const likeScoreX    = likeX + panelW - BOX_PAD;
    const dislikeScoreX = dislikeX + panelW - BOX_PAD;

    // Strongest likes
    const likesHdr = new Text({
      text: '↑ STRONGEST LIKES',
      style: { fill: Theme.colors.success, fontFamily: Theme.typography.fontFamily, fontSize: 13, fontWeight: '700' },
    });
    likesHdr.position.set(likeInnerX, y);
    this._content.addChild(likesHdr);

    const topTopics = getTopTopics(comm, 3);
    for (let i = 0; i < topTopics.length; i++) {
      const { id, label, score } = topTopics[i];
      const color = getScoreColor(score);
      const iy    = y + 24 + i * ITEM_H;

      const iconT = new Text({ text: TOPIC_ICONS[id] ?? '•', style: { fontSize: 14 } });
      iconT.position.set(likeInnerX, iy);
      this._content.addChild(iconT);

      const labelT = new Text({
        text: label,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 14 },
      });
      labelT.position.set(likeInnerX + 20, iy + 1);
      this._content.addChild(labelT);

      const scoreT = new Text({
        text: String(score),
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(likeScoreX, iy + 1);
      this._content.addChild(scoreT);
    }

    // Strongest dislikes
    const dislikesHdr = new Text({
      text: '↓ STRONGEST DISLIKES',
      style: { fill: Theme.colors.dangerLight, fontFamily: Theme.typography.fontFamily, fontSize: 13, fontWeight: '700' },
    });
    dislikesHdr.position.set(dislikeInnerX, y);
    this._content.addChild(dislikesHdr);

    const bottomTopics = getBottomTopics(comm, 3);
    for (let i = 0; i < bottomTopics.length; i++) {
      const { id, label, score } = bottomTopics[i];
      const color = getScoreColor(score);
      const iy    = y + 24 + i * ITEM_H;

      const iconT = new Text({ text: TOPIC_ICONS[id] ?? '•', style: { fontSize: 14 } });
      iconT.position.set(dislikeInnerX, iy);
      this._content.addChild(iconT);

      const labelT = new Text({
        text: label,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 14 },
      });
      labelT.position.set(dislikeInnerX + 20, iy + 1);
      this._content.addChild(labelT);

      const scoreT = new Text({
        text: String(score),
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(dislikeScoreX, iy + 1);
      this._content.addChild(scoreT);
    }

    // Interaction guide
    const guideHdr = new Text({
      text: '? INTERACTION GUIDE',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 12, fontWeight: '700' },
    });
    guideHdr.position.set(guideInnerX, y);
    this._content.addChild(guideHdr);

    const noteT = new Text({
      text: 'This are the ranges for likes',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
    });
    noteT.position.set(guideInnerX, y + 20);
    this._content.addChild(noteT);

    for (let i = 0; i < GUIDE_BANDS.length; i++) {
      const band = GUIDE_BANDS[i];
      const gy   = y + 40 + i * 32;

      this._content.addChild(
        new Graphics().circle(guideInnerX + 6, gy + 7, 4).fill({ color: band.color }),
      );

      const labelT = new Text({
        text: `${band.range}  ${band.label}`,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 12, fontWeight: '600' },
      });
      labelT.position.set(guideInnerX + 18, gy);
      this._content.addChild(labelT);

      const descT = new Text({
        text: band.desc,
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 10 },
      });
      descT.position.set(guideInnerX + 18, gy + 15);
      this._content.addChild(descT);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _addLeftSectionHeader(text, y) {
    const lbl = new Label({ text, variant: 'sectionHeader' });
    lbl.position.set(ARCH_LEFT_X, y);
    this._content.addChild(lbl);
  }

  _addLeftHorizDivider(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_LEFT_X, y)
        .lineTo(ARCH_DIV_X - 4, y)
        .stroke({ color: Theme.colors.divider, width: 1 }),
    );
  }
}

export { POPUP_W as STATS_POPUP_W };
