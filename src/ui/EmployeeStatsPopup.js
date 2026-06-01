/**
 * EmployeeStatsPopup — Redesigned two-column card.
 *
 * Left column : profile header, top archetypes, personality summary,
 *               likes / dislikes, mute-logs button.
 * Right column: archetype wheel with 12 segments, centre Team-Fit score,
 *               legend, and a "Best Work Environment" placeholder.
 *
 * Usage:
 *   popup.open(emp, company, anchorX, anchorY, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *   popup.refresh(company)
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ROLE_LABELS } from '../data/staffRoles.js';
import { ARCHETYPES, CATEGORY_COLORS } from '../data/archetypes.js';
import { getDisplayName } from '../data/archetypeDisplayNames.js';
import { getCharacterAvatarTex } from '../utils/characterSprite.js';
import { GameConfig } from '../config.js';

// ── Layout ────────────────────────────────────────────────────────────────────
const POPUP_W = 560;
const P       = 14;       // outer padding

// Left column: spans from x=P to x=P+L_W
const L_W       = 210;
// Vertical divider
const DIVIDER_X = P + L_W + 8;   // 232
// Right column: spans from DIVIDER_X+8 to POPUP_W-P
const R_X = DIVIDER_X + 8;       // 240
const R_W = POPUP_W - R_X - P;   // 306

// ── Palette ───────────────────────────────────────────────────────────────────
const BG           = 0x0b1422;
const BORDER       = 0x2a4a8a;
const DIVIDER_CLR  = 0x1a2a44;
const TEXT_BRIGHT  = 0xe6e8ef;
const TEXT_DIM     = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const EXP_COLOR        = 0x818cf8;
const EXP_EMPTY_COLOR  = 0x1a1a3a;
const SECTION_HDR_CLR  = 0x4a5a7a;

// ── Profile avatar ────────────────────────────────────────────────────────────
const AVATAR_SIZE = 52;

// ── Archetype wheel ───────────────────────────────────────────────────────────
/** Clockwise order from top: structure → paradise → mark → connection */
const WHEEL_ORDER = [
  'creator', 'ruler', 'caregiver',
  'innocent', 'sage', 'explorer',
  'outlaw', 'magician', 'hero',
  'everyman', 'jester', 'lover',
];

const WHEEL_R_INNER = 48;
const WHEEL_R_BASE  = 85;   // outer radius for non-highlighted segments
const WHEEL_R_SEC   = 90;   // outer radius for secondary
const WHEEL_R_PRI   = 96;   // outer radius for primary (extends beyond others)
const WHEEL_LABEL_R = WHEEL_R_PRI + 17;  // 113 — label anchor radius
const WHEEL_SEG_GAP = 1.5;  // degrees removed from each side of a segment gap

/**
 * Emoji icon drawn inside each archetype wheel segment.
 * Active archetypes (primary/secondary/tertiary) render at full opacity;
 * inactive ones at 0.3 so the category tint remains visible but muted.
 */
const WHEEL_ICONS = {
  creator:   '✏️',
  ruler:     '👑',
  caregiver: '🤲',
  innocent:  '☀️',
  sage:      '📖',
  explorer:  '🧭',
  outlaw:    '⚡',
  magician:  '🎩',
  hero:      '🛡️',
  everyman:  '🧠',
  jester:    '😄',
  lover:     '❤️',
};

// ─────────────────────────────────────────────────────────────────────────────

export class EmployeeStatsPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game    = game;
    this.visible = false;
    this._emp    = null;
    this._screenW = 0;
    this._screenH = 0;
    this._popupH  = 400;
    this._anchorX = 0;
    this._anchorY = 0;

    this._winBg   = new Graphics();
    this._content = new Container();

    this.addChild(this._winBg);
    this.addChild(this._content);
  }

  get currentEmp() { return this._emp; }

  // ── Public API ──────────────────────────────────────────────────────────────

  open(emp, company, anchorX, anchorY, screenW, screenH) {
    this._emp     = emp;
    this._screenW = screenW;
    this._screenH = screenH;
    this._anchorX = anchorX;
    this._anchorY = anchorY;

    this._draw(emp, company);
    this._placeWindow(screenW, screenH);
    this.visible = true;
  }

  close() {
    this._emp    = null;
    this.visible = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._placeWindow(screenW, screenH);
  }

  /** Re-draw while open — called every ~0.2 s tick. */
  refresh(company) {
    if (!this.visible || !this._emp) return;
    this._draw(this._emp, company);
  }

  // ── Placement ───────────────────────────────────────────────────────────────

  _placeWindow(screenW, screenH) {
    const x = Math.max(8, Math.round((screenW - POPUP_W) / 2));
    const y = Math.max(8, Math.round((screenH - this._popupH) / 2));
    this.position.set(x, y);
  }

  // ── Root draw ───────────────────────────────────────────────────────────────

  _draw(emp, company) {
    this._content.removeChildren();

    let leftY  = P;
    leftY = this._drawProfileHeader(emp, company, leftY);
    leftY = this._drawTopArchetypes(emp, leftY);
    leftY = this._drawPersonalitySummary(leftY);
    leftY = this._drawLikesDislikes(leftY);
    leftY = this._appendMuteButton(emp, company, leftY);

    let rightY = P;
    rightY = this._drawArchetypeWheel(emp, company, rightY);
    rightY = this._drawBestWorkEnvironment(rightY);

    const totalH = Math.max(leftY, rightY) + P;
    this._popupH  = totalH;

    // Vertical divider
    this._content.addChild(
      new Graphics()
        .moveTo(DIVIDER_X, P * 2)
        .lineTo(DIVIDER_X, totalH - P * 2)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );

    // Background
    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, totalH, 10)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  // ── Left column sections ────────────────────────────────────────────────────

  /**
   * Profile header: avatar, name, role label, level + XP bar, team, salary.
   * @returns {number} updated y cursor
   */
  _drawProfileHeader(emp, company, y) {
    // Avatar sprite
    const avatarTex = getCharacterAvatarTex(emp.characterIndex ?? 1);
    const avatar    = new Sprite(avatarTex);
    avatar.width    = AVATAR_SIZE;
    avatar.height   = AVATAR_SIZE;
    avatar.position.set(P, y);
    this._content.addChild(avatar);

    // Text block to the right of the avatar
    const textX = P + AVATAR_SIZE + 10;

    const nameText = new Text({
      text:  emp.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    nameText.position.set(textX, y);
    this._content.addChild(nameText);

    const roleText = new Text({
      text:  ROLE_LABELS[emp.role] ?? emp.role,
      style: { fill: EXP_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    roleText.position.set(textX, y + 18);
    this._content.addChild(roleText);

    // Level label + XP bar
    const { EXP_PER_LEVEL } = GameConfig.gameplay;
    const expFrac   = Math.min(1, (emp.exp ?? 0) / EXP_PER_LEVEL);
    const expBarW   = DIVIDER_X - textX - 38;

    const levelLabel = new Text({
      text:  `Lv. ${emp.level ?? 0}`,
      style: { fill: EXP_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    levelLabel.position.set(textX, y + 35);
    this._content.addChild(levelLabel);

    const barX = textX + 30;
    const barY = y + 37;
    this._content.addChild(
      new Graphics().roundRect(barX, barY, expBarW, 6, 2).fill({ color: EXP_EMPTY_COLOR }),
    );
    if (expFrac > 0) {
      this._content.addChild(
        new Graphics()
          .roundRect(barX, barY, Math.max(0, expBarW * expFrac), 6, 2)
          .fill({ color: EXP_COLOR, alpha: 0.85 }),
      );
    }

    const xpText = new Text({
      text:  `${emp.exp ?? 0} / ${EXP_PER_LEVEL} XP`,
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
    });
    xpText.position.set(textX, y + 46);
    this._content.addChild(xpText);

    // Advance y past the avatar block (whichever is taller)
    y = Math.max(y + AVATAR_SIZE + 8, y + 58);

    // Team assignment row
    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const teamStr    = team ? team.name : 'No team';
    const teamLine   = new Text({
      text:  `📍 ${teamStr}`,
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    teamLine.position.set(P, y);
    this._content.addChild(teamLine);
    y += 18;

    // Salary row
    const salaryLine = new Text({
      text:  `💰 Salary: $${emp.salary.toLocaleString()} / day`,
      style: { fill: SALARY_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    salaryLine.position.set(P, y);
    this._content.addChild(salaryLine);
    y += 22;

    this._addLeftDivider(y);
    y += 10;

    return y;
  }

  /**
   * TOP ARCHETYPES section — coloured dot, label, and weight%.
   * @returns {number} updated y cursor
   */
  _drawTopArchetypes(emp, y) {
    this._addSectionHeader('TOP ARCHETYPES', y);
    y += 16;

    const sorted = Object.entries(emp.archetypes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

    for (const [archId, weight] of sorted) {
      const def    = ARCHETYPES[archId];
      const color  = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const label  = def?.label ?? archId;
      const isPri  = weight === 60;

      // Coloured dot
      this._content.addChild(
        new Graphics().circle(P + 6, y + 8, 5).fill({ color }),
      );

      const archText = new Text({
        text:  label,
        style: {
          fill:       TEXT_BRIGHT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
          fontWeight: isPri ? '700' : '400',
        },
      });
      archText.position.set(P + 16, y + 1);
      this._content.addChild(archText);

      const pctText = new Text({
        text:  `${weight}%`,
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '700' },
      });
      pctText.anchor.set(1, 0);
      pctText.position.set(DIVIDER_X - 8, y + 1);
      this._content.addChild(pctText);

      y += 20;
    }

    this._addLeftDivider(y);
    y += 10;

    return y;
  }

  /**
   * PERSONALITY SUMMARY section — placeholder.
   * @returns {number} updated y cursor
   */
  _drawPersonalitySummary(y) {
    this._addSectionHeader('PERSONALITY SUMMARY', y);
    y += 16;

    const body = new Text({
      text:  '/TODO',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
    });
    body.position.set(P, y);
    this._content.addChild(body);
    y += 22;

    this._addLeftDivider(y);
    y += 10;

    return y;
  }

  /**
   * LIKES / DISLIKES section — side-by-side placeholder.
   * @returns {number} updated y cursor
   */
  _drawLikesDislikes(y) {
    const halfW = Math.floor((L_W - 8) / 2);
    const col2X = P + halfW + 8;

    const likesHdr = new Text({
      text:  '♥ LIKES',
      style: { fill: 0x4ade80, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    likesHdr.position.set(P, y);
    this._content.addChild(likesHdr);

    const dislikesHdr = new Text({
      text:  '✕ DISLIKES',
      style: { fill: 0xf87171, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    dislikesHdr.position.set(col2X, y);
    this._content.addChild(dislikesHdr);
    y += 16;

    for (const [xOff] of [[0], [col2X - P]]) {
      const todo = new Text({
        text:  '/TODO',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
      });
      todo.position.set(P + xOff, y);
      this._content.addChild(todo);
    }
    y += 22;

    this._addLeftDivider(y);
    y += 10;

    return y;
  }

  /**
   * Mute / Unmute logs button spanning the left column.
   * @returns {number} updated y cursor
   */
  _appendMuteButton(emp, company, y) {
    const btnW    = L_W;
    const btnH    = 24;
    const muted   = emp.logsMuted;
    const bgColor = muted ? 0x2a2000 : 0x0d1526;
    const clr     = muted ? 0xfbbf24 : 0x4a5a7a;

    const btnBg = new Graphics()
      .roundRect(P, y, btnW, btnH, 5)
      .fill({ color: bgColor })
      .stroke({ color: clr, width: 1, alpha: 0.8 });
    btnBg.eventMode = 'static';
    btnBg.cursor    = 'pointer';

    const label = new Text({
      text:  muted ? '🔕 Unmute logs' : '🔔 Mute logs',
      style: { fill: clr, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(P + btnW / 2, y + btnH / 2);
    label.eventMode = 'none';

    btnBg.on('pointerup',   () => { emp.logsMuted = !emp.logsMuted; this._draw(emp, company); });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

    this._content.addChild(btnBg);
    this._content.addChild(label);

    return y + btnH + P;
  }

  // ── Right column sections ───────────────────────────────────────────────────

  /**
   * Archetype wheel + centre text + legend.
   * @returns {number} updated y cursor
   */
  _drawArchetypeWheel(emp, company, y) {
    const archetypes = emp.archetypes ?? {};
    const sorted     = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
    const primaryId   = sorted[0]?.[0] ?? null;
    const secondaryId = sorted[1]?.[0] ?? null;
    const tertiaryId  = sorted[2]?.[0] ?? null;

    // Section header
    const header = new Text({
      text:  'ARCHETYPE PROFILE',
      style: { fill: SECTION_HDR_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    header.position.set(R_X + 4, y);
    this._content.addChild(header);

    const helpText = new Text({
      text:  '[?]',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
    });
    helpText.position.set(R_X + 4 + 125, y);
    this._content.addChild(helpText);
    y += 20;

    // Wheel geometry
    const cx = R_X + Math.floor(R_W / 2);
    const cy = y + WHEEL_LABEL_R + 20;

    // Draw 12 arc segments
    for (let i = 0; i < 12; i++) {
      const archId   = WHEEL_ORDER[i];
      const def      = ARCHETYPES[archId];
      const category = def?.category ?? 'structure';

      const isPrimary   = archId === primaryId;
      const isSecondary = archId === secondaryId;
      const isTertiary  = archId === tertiaryId;

      let segColor, segAlpha, outerR;
      if (isPrimary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 1.0; outerR = WHEEL_R_PRI;
      } else if (isSecondary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.7; outerR = WHEEL_R_SEC;
      } else if (isTertiary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.45; outerR = WHEEL_R_BASE;
      } else {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.12; outerR = WHEEL_R_BASE - 5;
      }

      const startDeg = -90 - 15 + i * 30 + WHEEL_SEG_GAP;
      const endDeg   = -90 - 15 + (i + 1) * 30 - WHEEL_SEG_GAP;
      const startRad = startDeg * (Math.PI / 180);
      const endRad   = endDeg   * (Math.PI / 180);
      const innerR   = WHEEL_R_INNER;

      const seg = new Graphics();
      seg
        .moveTo(cx + innerR * Math.cos(startRad), cy + innerR * Math.sin(startRad))
        .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
        .arc(cx, cy, outerR, startRad, endRad, false)
        .lineTo(cx + innerR * Math.cos(endRad), cy + innerR * Math.sin(endRad))
        .arc(cx, cy, innerR, endRad, startRad, true)
        .closePath()
        .fill({ color: segColor, alpha: segAlpha });
      this._content.addChild(seg);

      const isHighlighted = isPrimary || isSecondary || isTertiary;

      // Icon inside the segment (mid-radius)
      const midDeg = -90 + i * 30;
      const midRad = midDeg * (Math.PI / 180);
      const iconR  = (innerR + outerR) / 2;
      const icon   = new Text({
        text:  WHEEL_ICONS[archId] ?? '',
        style: { fontSize: 13 },
      });
      icon.anchor.set(0.5, 0.5);
      icon.position.set(cx + iconR * Math.cos(midRad), cy + iconR * Math.sin(midRad));
      icon.alpha = isHighlighted ? 1.0 : 0.3;
      this._content.addChild(icon);

      // Label outside the segment
      const lx = cx + WHEEL_LABEL_R * Math.cos(midRad);
      const ly = cy + WHEEL_LABEL_R * Math.sin(midRad);
      const labelText = new Text({
        text:  def?.label ?? archId,
        style: {
          fill:       isHighlighted ? (CATEGORY_COLORS[category] ?? TEXT_BRIGHT) : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          fontWeight: isHighlighted ? '700' : '400',
        },
      });
      labelText.anchor.set(0.5, 0.5);
      labelText.position.set(lx, ly);
      this._content.addChild(labelText);
    }

    // Centre circle background
    this._content.addChild(
      new Graphics().circle(cx, cy, WHEEL_R_INNER - 3).fill({ color: 0x0d1526 }),
    );

    // Centre: display name
    const displayName = getDisplayName(archetypes);
    const dnText = new Text({
      text:  displayName,
      style: { fill: 0xc4b5fd, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700', align: 'center' },
    });
    dnText.anchor.set(0.5, 0.5);
    dnText.position.set(cx, cy - 10);
    this._content.addChild(dnText);

    // Centre: Team Fit label
    const teamFitLbl = new Text({
      text:  'Team Fit',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
    });
    teamFitLbl.anchor.set(0.5, 0.5);
    teamFitLbl.position.set(cx, cy + 4);
    this._content.addChild(teamFitLbl);

    // Centre: fit score (convert [-100,100] → [0%,100%])
    const teamSystem = this.game?.sim?.teamSystem;
    const team       = teamSystem?.getTeamForEmployee(company, emp.id);
    const rawScore   = (team && teamSystem) ? teamSystem.teamCompatibility(company, team) : null;
    const fitPct     = rawScore !== null ? Math.round((rawScore + 100) / 2) : null;
    const fitColor   = fitPct === null ? TEXT_DIM : fitPct >= 60 ? 0x4ade80 : fitPct >= 40 ? SALARY_COLOR : 0xf87171;

    const fitText = new Text({
      text:  fitPct !== null ? `${fitPct}%` : '—',
      style: { fill: fitColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    fitText.anchor.set(0.5, 0.5);
    fitText.position.set(cx, cy + 17);
    this._content.addChild(fitText);

    // Legend row (no "Low Influence")
    y = cy + WHEEL_R_PRI + 18;
    const RANK_LABELS   = ['Primary', 'Secondary', 'Tertiary'];
    const RANK_WEIGHTS  = [60, 25, 15];
    const RANK_ALPHAS   = [1.0, 0.7, 0.45];
    const legendItemW   = Math.floor(R_W / 3);

    sorted.slice(0, 3).forEach(([archId, weight], i) => {
      const def   = ARCHETYPES[archId];
      const color = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const lx    = R_X + 4 + i * legendItemW;

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

    y += 20;
    return y;
  }

  /**
   * BEST WORK ENVIRONMENT section — empty placeholder.
   * @returns {number} updated y cursor
   */
  _drawBestWorkEnvironment(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(R_X, y)
        .lineTo(POPUP_W - P, y)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );
    y += 10;

    this._content.addChild((() => {
      const t = new Text({
        text:  'BEST WORK ENVIRONMENT',
        style: { fill: SECTION_HDR_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
      });
      t.position.set(R_X + 4, y);
      return t;
    })());
    y += 40;

    return y;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _addSectionHeader(text, y) {
    const t = new Text({
      text,
      style: { fill: SECTION_HDR_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    t.position.set(P, y);
    this._content.addChild(t);
  }

  _addLeftDivider(y) {
    this._content.addChild(
      new Graphics()
        .moveTo(P, y)
        .lineTo(DIVIDER_X - 4, y)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );
  }
}

export { POPUP_W as STATS_POPUP_W };
