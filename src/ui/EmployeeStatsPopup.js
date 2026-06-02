/**
 * EmployeeStatsPopup
 *
 * Tabbed employee detail modal (860×580, centered on screen).
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

// ── Layout ─────────────────────────────────────────────────────────────────────
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

// COMMUNICATION tab — 4 equal cards
const COMM_CARD_GAP  = P;
const COMM_CARD_W    = Math.floor((POPUP_W - P * 2 - COMM_CARD_GAP * 3) / 4); // 215
const COMM_CARD_HDR  = 58;   // px for category header area inside card
const COMM_CARD_PAD  = 8;    // inner padding for card content
const COMM_TOPIC_H   = 38;   // height per topic row (text line + bar)
const COMM_CARD_H    = COMM_CARD_HDR + COMMUNICATION_CATEGORIES[0].topics.length * COMM_TOPIC_H + COMM_CARD_PAD * 2;

// ── Palette ────────────────────────────────────────────────────────────────────
const BG          = 0x080f1f;
const BG_HEADER   = 0x0b1830;
const BG_CARD     = 0x0d1a2e;
const BORDER      = 0x2a4a8a;
const DIVIDER_CLR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;
const TEXT_MUTED  = 0x2a3a5a;
const EXP_CLR     = 0x818cf8;
const SALARY_CLR  = 0xfbbf24;
const TAB_ACTIVE  = 0x4a9eff;
const SECTION_HDR = 0x4a5a7a;

// ── Archetype wheel ────────────────────────────────────────────────────────────
const WHEEL_ORDER = [
  'creator', 'ruler', 'caregiver',
  'innocent', 'sage', 'explorer',
  'outlaw', 'magician', 'hero',
  'everyman', 'jester', 'lover',
];

const WHEEL_ICONS = {
  creator:   '✏️', ruler:     '👑', caregiver: '🤲',
  innocent:  '☀️', sage:      '📖', explorer:  '🧭',
  outlaw:    '⚡', magician:  '🎩', hero:      '🛡️',
  everyman:  '🧠', jester:    '😄', lover:     '❤️',
};

const WHEEL_R_INNER = 48;
const WHEEL_R_BASE  = 85;
const WHEEL_R_SEC   = 90;
const WHEEL_R_PRI   = 96;
const WHEEL_LABEL_R = WHEEL_R_PRI + 17; // 113
const WHEEL_SEG_GAP = 1.5;              // degrees trimmed per side

// ─────────────────────────────────────────────────────────────────────────────

export class EmployeeStatsPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game       = game;
    this.visible    = false;
    this._emp       = null;
    this._company   = null;
    this._screenW   = 0;
    this._screenH   = 0;
    this._activeTab = 'ARCHETYPES';

    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.on('pointerup', () => this.close());

    this._winBg   = new Graphics();
    this._content = new Container();

    this.addChild(this._backdrop);
    this.addChild(this._winBg);
    this.addChild(this._content);
  }

  get currentEmp() { return this._emp; }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** anchorX / anchorY are ignored — popup is always centered. */
  open(emp, company, _anchorX, _anchorY, screenW, screenH) {
    this._emp       = emp;
    this._company   = company;
    this._screenW   = screenW;
    this._screenH   = screenH;
    this._activeTab = 'ARCHETYPES';
    this._placeWindow(screenW, screenH);
    this._draw(emp, company);
    this.visible = true;
  }

  close() {
    this._emp     = null;
    this._company = null;
    this.visible  = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (!this.visible || !this._emp) return;
    this._placeWindow(screenW, screenH);
    if (this._company) this._draw(this._emp, this._company);
  }

  refresh(company) {
    this._company = company;
    if (!this.visible || !this._emp) return;
    this._draw(this._emp, company);
  }

  // ── Placement ────────────────────────────────────────────────────────────────

  _placeWindow(screenW, screenH) {
    const x = Math.max(0, Math.round((screenW - POPUP_W) / 2));
    const y = Math.max(0, Math.round((screenH - POPUP_H) / 2));
    this.position.set(x, y);
  }

  // ── Root draw ────────────────────────────────────────────────────────────────

  _draw(emp, company) {
    this._content.removeChildren();

    const px = this.position.x;
    const py = this.position.y;

    this._backdrop
      .clear()
      .rect(-px, -py, this._screenW, this._screenH)
      .fill({ color: 0x000000, alpha: 0.55 });

    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, POPUP_H, 12)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });

    this._drawHeader(emp, company);

    if (this._activeTab === 'ARCHETYPES') {
      this._drawArchetypesTab(emp, company);
    } else {
      this._drawCommunicationTab(emp);
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────────

  _drawHeader(emp, company) {
    // Header background
    this._content.addChild(
      new Graphics()
        .roundRect(0, 0, POPUP_W, HEADER_H + 12, 12)
        .fill({ color: BG_HEADER }),
    );
    this._content.addChild(
      new Graphics()
        .rect(0, HEADER_H / 2, POPUP_W, HEADER_H / 2 + 4)
        .fill({ color: BG_HEADER }),
    );

    // Avatar (52×52, top-aligned)
    const AVATAR_SIZE = 52;
    const avatarTex   = getCharacterAvatarTex(emp.characterIndex ?? 1);
    const avatar      = new Sprite(avatarTex);
    avatar.width      = AVATAR_SIZE;
    avatar.height     = AVATAR_SIZE;
    avatar.position.set(P, 8);
    this._content.addChild(avatar);

    const textX = P + AVATAR_SIZE + 10;  // 74

    // Name
    this._content.addChild((() => {
      const t = new Text({
        text:  emp.name,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15, fontWeight: '700' },
      });
      t.position.set(textX, 8);
      return t;
    })());

    // Role
    this._content.addChild((() => {
      const t = new Text({
        text:  ROLE_LABELS[emp.role] ?? emp.role,
        style: { fill: EXP_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '600' },
      });
      t.position.set(textX, 28);
      return t;
    })());

    // Team + Salary (level moved to its own row below)
    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const teamStr    = team ? team.name : 'No team';
    this._content.addChild((() => {
      const t = new Text({
        text:  `📍 ${teamStr}   💰 $${emp.salary.toLocaleString()}/day`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      t.position.set(textX, 46);
      return t;
    })());

    // Level + XP bar + XP text
    const { EXP_PER_LEVEL } = GameConfig.gameplay;
    const expFrac  = Math.min(1, (emp.exp ?? 0) / EXP_PER_LEVEL);
    const barX     = textX + 36;
    const barY     = 64;
    const barW     = 150;

    const levelLbl = new Text({
      text:  `Lv. ${emp.level ?? 0}`,
      style: { fill: EXP_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
    });
    levelLbl.position.set(textX, 62);
    this._content.addChild(levelLbl);

    // XP bar track
    this._content.addChild(
      new Graphics().roundRect(barX, barY, barW, 5, 2).fill({ color: 0x1a1a3a }),
    );
    if (expFrac > 0) {
      this._content.addChild(
        new Graphics()
          .roundRect(barX, barY, Math.max(2, Math.round(barW * expFrac)), 5, 2)
          .fill({ color: EXP_CLR, alpha: 0.85 }),
      );
    }

    const xpLbl = new Text({
      text:  `${emp.exp ?? 0} / ${EXP_PER_LEVEL} XP`,
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
    });
    xpLbl.position.set(barX + barW + 6, 63);
    this._content.addChild(xpLbl);

    // Close button — top-right, aligned to name row
    const closeT = new Text({
      text:  '✕',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    closeT.anchor.set(1, 0);
    closeT.position.set(POPUP_W - P, 16);
    closeT.eventMode = 'static';
    closeT.cursor    = 'pointer';
    closeT.on('pointerup',   () => this.close());
    closeT.on('pointerover', () => { closeT.alpha = 0.6; });
    closeT.on('pointerout',  () => { closeT.alpha = 1; });
    this._content.addChild(closeT);

    // Tab row — y=76 gives a clear padding gap after the XP row (ends ~y=74)
    const TABS = ['ARCHETYPES', 'COMMUNICATION'];
    let tabX   = textX;
    for (const tab of TABS) {
      const isActive = tab === this._activeTab;
      const tabT     = new Text({
        text:  tab,
        style: {
          fill:       isActive ? TAB_ACTIVE : TEXT_MUTED,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   13,
          fontWeight: isActive ? '700' : '400',
        },
      });
      tabT.position.set(tabX, 76);
      tabT.eventMode = 'static';
      tabT.cursor    = 'pointer';
      tabT.on('pointerup', () => {
        if (this._activeTab !== tab) {
          this._activeTab = tab;
          this._draw(this._emp, this._company);
        }
      });
      this._content.addChild(tabT);

      if (isActive) {
        this._content.addChild(
          new Graphics()
            .rect(tabX - 2, HEADER_H + 4, tabT.width + 4, 2)
            .fill({ color: TAB_ACTIVE }),
        );
      }
      tabX += tabT.width + 22;
    }

    // Header bottom divider
    this._content.addChild(
      new Graphics()
        .moveTo(0, HEADER_H + 16)
        .lineTo(POPUP_W, HEADER_H + 16)
        .stroke({ color: BORDER, width: 1 }),
    );
  }

  // ── ARCHETYPES tab ───────────────────────────────────────────────────────────

  _drawArchetypesTab(emp, company) {
    // Column divider
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_DIV_X, HEADER_H + P * 2)
        .lineTo(ARCH_DIV_X, POPUP_H - P * 2)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
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
        text:  def?.label ?? archId,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: isPri ? '700' : '400' },
      });
      archT.position.set(ARCH_LEFT_X + 16, y + 1);
      this._content.addChild(archT);

      const pctT = new Text({
        text:  `${weight}%`,
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '700' },
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

    const body = new Text({
      text:  '/TODO',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
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

    const likesHdr = new Text({
      text:  '♥ LIKES',
      style: { fill: 0x4ade80, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    likesHdr.position.set(ARCH_LEFT_X, y);
    this._content.addChild(likesHdr);

    const dislikesHdr = new Text({
      text:  '✕ DISLIKES',
      style: { fill: 0xf87171, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    dislikesHdr.position.set(col2X, y);
    this._content.addChild(dislikesHdr);
    y += 16;

    for (const xOff of [0, col2X - ARCH_LEFT_X]) {
      const todo = new Text({
        text:  '/TODO',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
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
    const bgColor = muted ? 0x2a2000 : 0x0d1526;
    const clr     = muted ? 0xfbbf24 : 0x4a5a7a;

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
      text:  muted ? '🔕 Unmute logs' : '🔔 Mute logs',
      style: { fill: clr, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(ARCH_LEFT_X + btnW / 2, y + btnH / 2);
    label.eventMode = 'none';

    this._content.addChild(btnBg);
    this._content.addChild(label);
  }

  // ── Right column ─────────────────────────────────────────────────────────────

  _drawArchetypeWheel(emp, company, y) {
    const archetypes  = emp.archetypes ?? {};
    const sorted      = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
    const primaryId   = sorted[0]?.[0] ?? null;
    const secondaryId = sorted[1]?.[0] ?? null;
    const tertiaryId  = sorted[2]?.[0] ?? null;

    const header = new Text({
      text:  'ARCHETYPE PROFILE',
      style: { fill: SECTION_HDR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    header.position.set(ARCH_RIGHT_X + 4, y);
    this._content.addChild(header);
    y += 20;

    const cx = ARCH_RIGHT_X + Math.floor(ARCH_RIGHT_W / 2);
    const cy = y + WHEEL_LABEL_R + 20;

    for (let i = 0; i < 12; i++) {
      const archId   = WHEEL_ORDER[i];
      const def      = ARCHETYPES[archId];
      const category = def?.category ?? 'structure';

      const isPrimary   = archId === primaryId;
      const isSecondary = archId === secondaryId;
      const isTertiary  = archId === tertiaryId;

      let segColor, segAlpha, outerR;
      if (isPrimary) {
        segColor = ARCH_CATEGORY_COLORS[category]; segAlpha = 1.0; outerR = WHEEL_R_PRI;
      } else if (isSecondary) {
        segColor = ARCH_CATEGORY_COLORS[category]; segAlpha = 0.7; outerR = WHEEL_R_SEC;
      } else if (isTertiary) {
        segColor = ARCH_CATEGORY_COLORS[category]; segAlpha = 0.45; outerR = WHEEL_R_BASE;
      } else {
        segColor = ARCH_CATEGORY_COLORS[category]; segAlpha = 0.12; outerR = WHEEL_R_BASE - 5;
      }

      const startDeg = -90 - 15 + i * 30 + WHEEL_SEG_GAP;
      const endDeg   = -90 - 15 + (i + 1) * 30 - WHEEL_SEG_GAP;
      const startRad = startDeg * (Math.PI / 180);
      const endRad   = endDeg   * (Math.PI / 180);

      const seg = new Graphics();
      seg
        .moveTo(cx + WHEEL_R_INNER * Math.cos(startRad), cy + WHEEL_R_INNER * Math.sin(startRad))
        .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
        .arc(cx, cy, outerR, startRad, endRad, false)
        .lineTo(cx + WHEEL_R_INNER * Math.cos(endRad), cy + WHEEL_R_INNER * Math.sin(endRad))
        .arc(cx, cy, WHEEL_R_INNER, endRad, startRad, true)
        .closePath()
        .fill({ color: segColor, alpha: segAlpha });
      this._content.addChild(seg);

      const isHighlighted = isPrimary || isSecondary || isTertiary;
      const midDeg = -90 + i * 30;
      const midRad = midDeg * (Math.PI / 180);
      const iconR  = (WHEEL_R_INNER + outerR) / 2;

      const icon = new Text({ text: WHEEL_ICONS[archId] ?? '', style: { fontSize: 13 } });
      icon.anchor.set(0.5, 0.5);
      icon.position.set(cx + iconR * Math.cos(midRad), cy + iconR * Math.sin(midRad));
      icon.alpha = isHighlighted ? 1.0 : 0.3;
      this._content.addChild(icon);

      const lx        = cx + WHEEL_LABEL_R * Math.cos(midRad);
      const ly        = cy + WHEEL_LABEL_R * Math.sin(midRad);
      const labelText = new Text({
        text:  def?.label ?? archId,
        style: {
          fill:       isHighlighted ? (ARCH_CATEGORY_COLORS[category] ?? TEXT_BRIGHT) : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          fontWeight: isHighlighted ? '700' : '400',
        },
      });
      labelText.anchor.set(0.5, 0.5);
      labelText.position.set(lx, ly);
      this._content.addChild(labelText);
    }

    // Centre circle
    this._content.addChild(
      new Graphics().circle(cx, cy, WHEEL_R_INNER - 3).fill({ color: 0x0d1526 }),
    );

    const displayName = getDisplayName(archetypes);
    const dnText = new Text({
      text:  displayName,
      style: { fill: 0xc4b5fd, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700', align: 'center' },
    });
    dnText.anchor.set(0.5, 0.5);
    dnText.position.set(cx, cy - 10);
    this._content.addChild(dnText);

    const teamFitLbl = new Text({
      text:  'Team Fit',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
    });
    teamFitLbl.anchor.set(0.5, 0.5);
    teamFitLbl.position.set(cx, cy + 4);
    this._content.addChild(teamFitLbl);

    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const rawScore   = (team && teamSystem) ? teamSystem.teamCompatibility(company, team) : null;
    const fitPct     = rawScore !== null ? Math.round((rawScore + 100) / 2) : null;
    const fitColor   = fitPct === null ? TEXT_DIM : fitPct >= 60 ? 0x4ade80 : fitPct >= 40 ? SALARY_CLR : 0xf87171;

    const fitText = new Text({
      text:  fitPct !== null ? `${fitPct}%` : '—',
      style: { fill: fitColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    fitText.anchor.set(0.5, 0.5);
    fitText.position.set(cx, cy + 17);
    this._content.addChild(fitText);

    // Legend row
    y = cy + WHEEL_R_PRI + 18;
    const RANK_LABELS  = ['Primary', 'Secondary', 'Tertiary'];
    const RANK_WEIGHTS = [60, 25, 15];
    const RANK_ALPHAS  = [1.0, 0.7, 0.45];
    const legendItemW  = Math.floor(ARCH_RIGHT_W / 3);

    sorted.slice(0, 3).forEach(([archId, _weight], i) => {
      const def   = ARCHETYPES[archId];
      const color = ARCH_CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const lx    = ARCH_RIGHT_X + 4 + i * legendItemW;

      this._content.addChild(
        new Graphics().circle(lx + 5, y + 7, 4).fill({ color, alpha: RANK_ALPHAS[i] }),
      );
      const legendTxt = new Text({
        text:  `${RANK_LABELS[i]} (${RANK_WEIGHTS[i]}%)`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      legendTxt.position.set(lx + 12, y + 1);
      this._content.addChild(legendTxt);
    });

    return y + 20;
  }

  _drawBestWorkEnvironment(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_RIGHT_X, y)
        .lineTo(POPUP_W - P, y)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );
    y += 10;

    const t = new Text({
      text:  'BEST WORK ENVIRONMENT',
      style: { fill: SECTION_HDR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    t.position.set(ARCH_RIGHT_X + 4, y);
    this._content.addChild(t);
  }

  // ── COMMUNICATION tab ────────────────────────────────────────────────────────

  _drawCommunicationTab(emp) {
    const comm = emp.communication ?? {};

    if (Object.keys(comm).length === 0) {
      const noData = new Text({
        text:  'No communication data',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      });
      noData.anchor.set(0.5, 0.5);
      noData.position.set(POPUP_W / 2, POPUP_H / 2);
      this._content.addChild(noData);
      return;
    }

    // ── Category cards ──────────────────────────────────────────────────────────
    const cardsY = HEADER_H + P * 2;
    for (let ci = 0; ci < COMMUNICATION_CATEGORIES.length; ci++) {
      const cat   = COMMUNICATION_CATEGORIES[ci];
      const cardX = P + ci * (COMM_CARD_W + COMM_CARD_GAP);
      this._drawCategoryCard(cat, comm, cardX, cardsY);
    }

    // ── Summary panels ──────────────────────────────────────────────────────────
    const summaryY = cardsY + COMM_CARD_H + P * 2;
    this._drawSummaryPanels(comm, summaryY);
  }

  _drawCategoryCard(cat, comm, cardX, cardY) {
    const catColor = COMM_CATEGORY_COLORS[cat.id] ?? 0x4a9eff;

    // Card background
    this._content.addChild(
      new Graphics()
        .roundRect(cardX, cardY, COMM_CARD_W, COMM_CARD_H, 6)
        .fill({ color: BG_CARD })
        .stroke({ color: catColor, width: 1, alpha: 0.4 }),
    );

    // Top accent bar
    this._content.addChild(
      new Graphics()
        .roundRect(cardX, cardY, COMM_CARD_W, 3, 2)
        .fill({ color: catColor }),
    );

    // Category icon
    const iconT = new Text({ text: CATEGORY_ICONS[cat.id] ?? '📋', style: { fontSize: 17 } });
    iconT.position.set(cardX + COMM_CARD_PAD, cardY + 9);
    this._content.addChild(iconT);

    // Category title
    const titleT = new Text({
      text:  cat.label,
      style: { fill: catColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    titleT.position.set(cardX + COMM_CARD_PAD + 22, cardY + 9);
    this._content.addChild(titleT);

    // "(N topics)" sublabel on left, "Opinion (1-100)" on right
    const subT = new Text({
      text:  `(${cat.topics.length} topics)`,
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
    });
    subT.position.set(cardX + COMM_CARD_PAD, cardY + 30);
    this._content.addChild(subT);

    const opinionT = new Text({
      text:  'Opinion (1-100)',
      style: { fill: TEXT_MUTED, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
    });
    opinionT.anchor.set(1, 0);
    opinionT.position.set(cardX + COMM_CARD_W - COMM_CARD_PAD, cardY + 30);
    this._content.addChild(opinionT);

    // Divider below header area
    this._content.addChild(
      new Graphics()
        .moveTo(cardX + COMM_CARD_PAD, cardY + COMM_CARD_HDR - 4)
        .lineTo(cardX + COMM_CARD_W - COMM_CARD_PAD, cardY + COMM_CARD_HDR - 4)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );

    // Topic rows
    for (let ti = 0; ti < cat.topics.length; ti++) {
      const topic = cat.topics[ti];
      const score = comm[topic.id] ?? 50;
      const color = getScoreColor(score);
      const rowY  = cardY + COMM_CARD_HDR + COMM_CARD_PAD + ti * COMM_TOPIC_H;

      // Icon
      const topicIcon = new Text({ text: TOPIC_ICONS[topic.id] ?? '•', style: { fontSize: 13 } });
      topicIcon.position.set(cardX + COMM_CARD_PAD, rowY);
      this._content.addChild(topicIcon);

      // Topic label
      const labelT = new Text({
        text:  topic.label,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 },
      });
      labelT.position.set(cardX + COMM_CARD_PAD + 18, rowY + 1);
      this._content.addChild(labelT);

      // Score number (right-aligned)
      const scoreT = new Text({
        text:  String(score),
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(cardX + COMM_CARD_W - COMM_CARD_PAD, rowY + 1);
      this._content.addChild(scoreT);

      // Colored progress bar beneath the text row
      const barX  = cardX + COMM_CARD_PAD;
      const barY  = rowY + 20;
      const barW  = COMM_CARD_W - COMM_CARD_PAD * 2;
      const fillW = Math.max(2, Math.round(barW * (score / 100)));

      this._content.addChild(
        new Graphics().roundRect(barX, barY, barW, 3, 1).fill({ color: DIVIDER_CLR }),
      );
      this._content.addChild(
        new Graphics().roundRect(barX, barY, fillW, 3, 1).fill({ color }),
      );
    }
  }

  _drawSummaryPanels(comm, y) {
    const panelW     = Math.floor((POPUP_W - P * 4) / 3);
    const likeX      = P;
    const dislikeX   = P * 2 + panelW;
    const guideX     = P * 3 + panelW * 2;
    const ITEM_H     = 28;
    const BOX_PAD    = 10;
    const GUIDE_BANDS = [
      { range: '80 - 100', label: 'Strong Agreement',     desc: 'Great conversations, strong bond potential', color: 0x4ade80 },
      { range: '60 - 79',  label: 'Agreement',             desc: 'Positive conversations',                    color: 0x84cc16 },
      { range: '40 - 59',  label: 'Neutral',               desc: 'Neutral conversations',                     color: 0xf59e0b },
      { range: '20 - 39',  label: 'Disagreement',          desc: 'Potential for tension',                     color: 0xef4444 },
      { range: '1 - 19',   label: 'Strong Disagreement',   desc: 'High conflict risk',                        color: 0xb91c1c },
    ];
    const listBoxH   = BOX_PAD + 20 + 3 * ITEM_H + BOX_PAD;
    const guideBoxH  = BOX_PAD + 18 + 16 + GUIDE_BANDS.length * 32 + BOX_PAD;

    const drawPanelBox = (x, boxY, w, h, strokeColor) => {
      this._content.addChild(
        new Graphics()
          .roundRect(x, boxY, w, h, 6)
          .fill({ color: BG_CARD })
          .stroke({ color: strokeColor, width: 1, alpha: 0.45 }),
      );
    };

    const boxY = y - BOX_PAD;
    drawPanelBox(likeX, boxY, panelW, listBoxH, 0x4ade80);
    drawPanelBox(dislikeX, boxY, panelW, listBoxH, 0xf87171);
    drawPanelBox(guideX, boxY, panelW, guideBoxH, BORDER);

    const likeInnerX    = likeX + BOX_PAD;
    const dislikeInnerX = dislikeX + BOX_PAD;
    const guideInnerX   = guideX + BOX_PAD;
    const likeScoreX    = likeX + panelW - BOX_PAD;
    const dislikeScoreX = dislikeX + panelW - BOX_PAD;

    // ── STRONGEST LIKES ─────────────────────────────────────────────────────────
    this._content.addChild((() => {
      const t = new Text({
        text:  '↑ STRONGEST LIKES',
        style: { fill: 0x4ade80, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
      });
      t.position.set(likeInnerX, y);
      return t;
    })());

    const topTopics = getTopTopics(comm, 3);
    for (let i = 0; i < topTopics.length; i++) {
      const { id, label, score } = topTopics[i];
      const color = getScoreColor(score);
      const iy    = y + 24 + i * ITEM_H;

      const iconT = new Text({ text: TOPIC_ICONS[id] ?? '•', style: { fontSize: 14 } });
      iconT.position.set(likeInnerX, iy);
      this._content.addChild(iconT);

      const labelT = new Text({
        text:  label,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 },
      });
      labelT.position.set(likeInnerX + 20, iy + 1);
      this._content.addChild(labelT);

      const scoreT = new Text({
        text:  String(score),
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(likeScoreX, iy + 1);
      this._content.addChild(scoreT);
    }

    // ── STRONGEST DISLIKES ───────────────────────────────────────────────────────
    this._content.addChild((() => {
      const t = new Text({
        text:  '↓ STRONGEST DISLIKES',
        style: { fill: 0xf87171, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
      });
      t.position.set(dislikeInnerX, y);
      return t;
    })());

    const bottomTopics = getBottomTopics(comm, 3);
    for (let i = 0; i < bottomTopics.length; i++) {
      const { id, label, score } = bottomTopics[i];
      const color = getScoreColor(score);
      const iy    = y + 24 + i * ITEM_H;

      const iconT = new Text({ text: TOPIC_ICONS[id] ?? '•', style: { fontSize: 14 } });
      iconT.position.set(dislikeInnerX, iy);
      this._content.addChild(iconT);

      const labelT = new Text({
        text:  label,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 },
      });
      labelT.position.set(dislikeInnerX + 20, iy + 1);
      this._content.addChild(labelT);

      const scoreT = new Text({
        text:  String(score),
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
      });
      scoreT.anchor.set(1, 0);
      scoreT.position.set(dislikeScoreX, iy + 1);
      this._content.addChild(scoreT);
    }

    // ── INTERACTION GUIDE ────────────────────────────────────────────────────────
    this._content.addChild((() => {
      const t = new Text({
        text:  '? INTERACTION GUIDE',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '700' },
      });
      t.position.set(guideInnerX, y);
      return t;
    })());

    const noteT = new Text({
      text:  'This are the ranges for likes',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
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
        text:  `${band.range}  ${band.label}`,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '600' },
      });
      labelT.position.set(guideInnerX + 18, gy);
      this._content.addChild(labelT);

      const descT = new Text({
        text:  band.desc,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
      });
      descT.position.set(guideInnerX + 18, gy + 15);
      this._content.addChild(descT);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _addLeftSectionHeader(text, y) {
    const t = new Text({
      text,
      style: { fill: SECTION_HDR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    t.position.set(ARCH_LEFT_X, y);
    this._content.addChild(t);
  }

  _addLeftHorizDivider(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(ARCH_LEFT_X, y)
        .lineTo(ARCH_DIV_X - 4, y)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );
  }
}

export { POPUP_W as STATS_POPUP_W };
