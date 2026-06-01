/**
 * TeamInfoPopup
 *
 * Detail view for a single team. Opens when the player clicks a team row
 * in TeamsPanel (with no employee chip selected).
 *
 * Usage:
 *   popup.open(team, company, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *   popup.refresh(company)
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import {
  ARCHETYPES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '../data/archetypes.js';
import { getCharacterAvatarTex } from '../utils/characterSprite.js';
import { getDisplayName } from '../data/archetypeDisplayNames.js';

// ── Layout ────────────────────────────────────────────────────────────────────
const POPUP_W  = 860;
const POPUP_H  = 580;
const HEADER_H = 68;
const P        = 12;

const LEFT_X   = P;
const LEFT_W   = 244;
const CENTER_X = LEFT_X + LEFT_W + P;        // 268
const CENTER_W = 294;
const RIGHT_X  = CENTER_X + CENTER_W + P;    // 574
const RIGHT_W  = POPUP_W - RIGHT_X - P;      // 274

// ── Palette ───────────────────────────────────────────────────────────────────
const BG          = 0x080f1f;
const BG_HEADER   = 0x0b1830;
const BG_CARD     = 0x0d1a2e;
const BORDER      = 0x2a4a8a;
const DIVIDER_CLR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;
const TEXT_MUTED  = 0x2a3a5a;
const EXP_CLR     = 0x818cf8;
const TAB_ACTIVE  = 0x4a9eff;

// ── Archetype wheel ───────────────────────────────────────────────────────────
const WHEEL_ICONS = {
  creator: '✏️', ruler: '👑', caregiver: '🤲',
  innocent: '☀️', sage: '📖', explorer: '🧭',
  outlaw: '⚡', magician: '🎩', hero: '🛡️',
  everyman: '🧠', jester: '😄', lover: '❤️',
};

const WHEEL_ORDER = [
  'creator', 'ruler', 'caregiver',
  'innocent', 'sage', 'explorer',
  'outlaw', 'magician', 'hero',
  'everyman', 'jester', 'lover',
];

const WHEEL_R_OUTER = 150;
const WHEEL_R_INNER = 87;
const WHEEL_GAP_RAD = 0.025;

// ─────────────────────────────────────────────────────────────────────────────

export class TeamInfoPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game     = game;
    this.visible  = false;
    this._team    = null;
    this._screenW = 0;
    this._screenH = 0;

    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.on('pointerup', () => this.close());

    this._winBg   = new Graphics();
    this._content = new Container();

    this.addChild(this._backdrop);
    this.addChild(this._winBg);
    this.addChild(this._content);
  }

  get currentTeam() { return this._team; }

  // ── Public API ──────────────────────────────────────────────────────────────

  open(team, company, screenW, screenH) {
    this._team    = team;
    this._screenW = screenW;
    this._screenH = screenH;
    this._placeWindow(screenW, screenH);
    this._draw(team, company);
    this.visible  = true;
  }

  close() {
    this._team   = null;
    this.visible = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (!this.visible || !this._team) return;
    this._placeWindow(screenW, screenH);
    const company = this.game.sim?.company;
    if (company) this._draw(this._team, company);
  }

  refresh(company) {
    if (!this.visible || !this._team) return;
    this._draw(this._team, company);
  }

  // ── Placement ───────────────────────────────────────────────────────────────

  _placeWindow(screenW, screenH) {
    const x = Math.max(0, Math.round((screenW - POPUP_W) / 2));
    const y = Math.max(0, Math.round((screenH - POPUP_H) / 2));
    this.position.set(x, y);
  }

  // ── Root draw ───────────────────────────────────────────────────────────────

  _draw(team, company) {
    this._content.removeChildren();

    const px = this.position.x;
    const py = this.position.y;

    // Full-screen backdrop (relative to popup container origin)
    this._backdrop
      .clear()
      .rect(-px, -py, this._screenW, this._screenH)
      .fill({ color: 0x000000, alpha: 0.55 });

    // Window background
    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, POPUP_H, 12)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });

    const stats = this._computeStats(company, team);

    this._drawHeader(team, company, stats);
    this._drawColumnDividers();
    this._drawLeftColumn(stats);
    this._drawCenterColumn(team, company, stats);
    this._drawRightColumn(team, company, stats);
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  _drawHeader(team, company, stats) {
    const { lead } = stats;

    // Header background (flat rect + top-rounded overlay trick)
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

    // Team icon
    const iconT = new Text({ text: '👥', style: { fontSize: 22 } });
    iconT.position.set(P + 2, 10);
    this._content.addChild(iconT);

    // Team name
    const nameT = new Text({
      text:  team.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15, fontWeight: '700' },
    });
    nameT.position.set(P + 36, 10);
    this._content.addChild(nameT);

    // Lead subtitle
    const leadName = lead ? lead.name : 'No Lead';
    const leadArch = lead ? getDisplayName(lead.archetypes ?? {}) : '';
    const leadT = new Text({
      text:  `Team Lead: ${leadName}${leadArch ? `  (${leadArch})` : ''}`,
      style: { fill: EXP_CLR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
    });
    leadT.position.set(P + 36, 30);
    this._content.addChild(leadT);

    // Tab row (ARCHETYPES is active; others are stubs — TODO 3)
    const TABS = ['OVERVIEW', 'ARCHETYPES', 'MEMBERS', 'EFFECTS'];
    let tabX = P + 36;
    for (const tab of TABS) {
      const isActive = tab === 'ARCHETYPES';
      const tabT = new Text({
        text:  tab,
        style: {
          fill:       isActive ? TAB_ACTIVE : TEXT_MUTED,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   10,
          fontWeight: isActive ? '700' : '400',
        },
      });
      tabT.position.set(tabX, 49);
      this._content.addChild(tabT);

      if (isActive) {
        this._content.addChild(
          new Graphics()
            .rect(tabX - 2, HEADER_H - 4, tabT.width + 4, 2)
            .fill({ color: TAB_ACTIVE }),
        );
      }
      tabX += tabT.width + 22;
    }

    // Close button
    const closeT = new Text({
      text:  '✕',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    closeT.anchor.set(1, 0.5);
    closeT.position.set(POPUP_W - P, HEADER_H / 2);
    closeT.eventMode = 'static';
    closeT.cursor    = 'pointer';
    closeT.on('pointerup',   () => this.close());
    closeT.on('pointerover', () => { closeT.alpha = 0.6; });
    closeT.on('pointerout',  () => { closeT.alpha = 1; });
    this._content.addChild(closeT);

    // Header bottom divider
    this._content.addChild(
      new Graphics()
        .moveTo(0, HEADER_H)
        .lineTo(POPUP_W, HEADER_H)
        .stroke({ color: BORDER, width: 1 }),
    );
  }

  // ── Left column ─────────────────────────────────────────────────────────────

  _drawLeftColumn(stats) {
    const { compatScore, stressScore, stressInfo, categoryPcts, dominant } = stats;
    const bx = LEFT_X;
    let y    = HEADER_H + P;

    // ── Compatibility ────────────────────────────────────────────────────────
    const cInfo = this._compatInfo(compatScore);
    this._addSectionLabel('Team Compatibility', bx, y);
    y += 18;

    const scoreT = new Text({
      text:  String(compatScore),
      style: { fill: cInfo.color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 26, fontWeight: '700' },
    });
    scoreT.position.set(bx, y);
    this._content.addChild(scoreT);

    const ofT = new Text({
      text:  '/ 100',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    ofT.position.set(bx + scoreT.width + 5, y + 12);
    this._content.addChild(ofT);

    const cLabelT = new Text({
      text:  cInfo.label,
      style: { fill: cInfo.color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    cLabelT.position.set(bx, y + 34);
    this._content.addChild(cLabelT);
    y += 48;

    this._drawBar(bx, y, LEFT_W, compatScore / 100, cInfo.color);
    y += 16;

    // ── Stress ────────────────────────────────────────────────────────────────
    y += 10;
    const sColor = stressScore < 30 ? 0x4ade80 : stressScore < 60 ? 0xfbbf24 : 0xf87171;
    this._addSectionLabel('Team Stress', bx, y);
    y += 18;

    const stressT = new Text({
      text:  String(stressScore),
      style: { fill: sColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 26, fontWeight: '700' },
    });
    stressT.position.set(bx, y);
    this._content.addChild(stressT);

    const ofT2 = new Text({
      text:  '/ 100',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    ofT2.position.set(bx + stressT.width + 5, y + 12);
    this._content.addChild(ofT2);

    const sLabelT = new Text({
      text:  stressInfo.label,
      style: { fill: sColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    sLabelT.position.set(bx, y + 34);
    this._content.addChild(sLabelT);
    y += 48;

    this._drawBar(bx, y, LEFT_W, stressScore / 100, sColor);
    y += 16;

    // ── Category Distribution ─────────────────────────────────────────────────
    y += 12;
    this._addSectionLabel('Team Archetype Distribution', bx, y);
    y += 16;

    for (const cat of ['structure', 'paradise', 'mark', 'connection']) {
      const pct   = categoryPcts[cat] ?? 0;
      const color = CATEGORY_COLORS[cat];
      const label = CATEGORY_LABELS[cat];

      const catT = new Text({
        text:  label,
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      catT.position.set(bx, y);
      this._content.addChild(catT);

      const pctT = new Text({
        text:  `${pct}%`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
      });
      pctT.anchor.set(1, 0);
      pctT.position.set(bx + LEFT_W, y);
      this._content.addChild(pctT);
      y += 14;

      this._drawBar(bx, y, LEFT_W, pct / 100, color);
      y += 13;
    }

    // ── Dominant Archetypes ───────────────────────────────────────────────────
    y += 10;
    this._addSectionLabel('Dominant Archetypes', bx, y);
    y += 16;

    const cardW = Math.floor((LEFT_W - 8) / 3);
    dominant.slice(0, 3).forEach(([archId, pct], i) => {
      const def   = ARCHETYPES[archId];
      const color = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const cx    = bx + i * (cardW + 4);

      this._content.addChild(
        new Graphics()
          .roundRect(cx, y, cardW, 54, 6)
          .fill({ color: BG_CARD })
          .stroke({ color, width: 1, alpha: 0.55 }),
      );

      const iconT = new Text({ text: WHEEL_ICONS[archId] ?? '?', style: { fontSize: 15 } });
      iconT.anchor.set(0.5, 0);
      iconT.position.set(cx + cardW / 2, y + 4);
      this._content.addChild(iconT);

      const archT = new Text({
        text:  def?.label ?? archId,
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
      });
      archT.anchor.set(0.5, 0);
      archT.position.set(cx + cardW / 2, y + 24);
      this._content.addChild(archT);

      const pctT = new Text({
        text:  `${Math.round(pct)}%`,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '700' },
      });
      pctT.anchor.set(0.5, 0);
      pctT.position.set(cx + cardW / 2, y + 37);
      this._content.addChild(pctT);
    });
  }

  // ── Center column ───────────────────────────────────────────────────────────

  _drawCenterColumn(team, company, stats) {
    const { archetypePcts, effectLabel } = stats;
    const bx = CENTER_X;
    let y    = HEADER_H + P;

    // Section header
    this._addSectionLabel('Team Archetype Wheel', bx, y);
    y += 18;

    // Wheel
    const wheelCX = bx + Math.floor(CENTER_W / 2);
    const wheelCY = y + WHEEL_R_OUTER + 14;
    this._drawTeamWheel(archetypePcts, wheelCX, wheelCY);

    y = wheelCY + WHEEL_R_OUTER + 20;

    // ── Team Effects (Active) ─────────────────────────────────────────────────
    this._addSectionLabel('Team Effects (Active)', bx, y);
    y += 16;

    // TODO 1: individual numeric bonuses per effect type
    const effectColorMap = {
      'Leadership Team': CATEGORY_COLORS.structure,
      'Research Team':   CATEGORY_COLORS.paradise,
      'High Risk Team':  CATEGORY_COLORS.mark,
      'Social Team':     CATEGORY_COLORS.connection,
      'Balanced Team':   0x7a86a3,
    };
    const eColor = effectColorMap[effectLabel] ?? 0x7a86a3;

    this._content.addChild(
      new Graphics()
        .roundRect(bx, y, CENTER_W, 38, 6)
        .fill({ color: BG_CARD })
        .stroke({ color: eColor, width: 1, alpha: 0.65 }),
    );

    const effT = new Text({
      text:  effectLabel ?? 'Balanced Team',
      style: { fill: eColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '700' },
    });
    effT.anchor.set(0, 0.5);
    effT.position.set(bx + 10, y + 19);
    this._content.addChild(effT);

    // TODO 1 placeholder label
    const todoT = new Text({
      text:  '// TODO 1: effect bonuses',
      style: { fill: TEXT_MUTED, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontStyle: 'italic' },
    });
    todoT.anchor.set(1, 0.5);
    todoT.position.set(bx + CENTER_W - 6, y + 19);
    this._content.addChild(todoT);
  }

  // ── Right column ────────────────────────────────────────────────────────────

  _drawRightColumn(team, company, stats) {
    const { lead } = stats;
    const bx = RIGHT_X;
    let y    = HEADER_H + P;

    this._addSectionLabel('Team Members', bx, y);
    y += 18;

    // Lead first, then members
    const rows = [
      ...(lead ? [{ emp: lead, isLead: true }] : []),
      ...team.memberIds
        .map((id) => company.employees.find((e) => e.id === id))
        .filter(Boolean)
        .map((emp) => ({ emp, isLead: false })),
    ];

    for (const { emp, isLead } of rows) {
      if (y + 56 > POPUP_H - 80) break;  // leave room for "How it works"
      this._drawMemberRow(emp, isLead, bx, y);
      y += 58;
    }

    if (rows.length === 0) {
      const emptyT = new Text({
        text:  'No members yet.',
        style: { fill: TEXT_MUTED, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      emptyT.position.set(bx, y);
      this._content.addChild(emptyT);
      y += 20;
    }

    // ── How it works ─────────────────────────────────────────────────────────
    const howY = POPUP_H - P - 62;
    this._content.addChild(
      new Graphics()
        .moveTo(bx, howY)
        .lineTo(bx + RIGHT_W, howY)
        .stroke({ color: DIVIDER_CLR, width: 1 }),
    );
    this._addSectionLabel('How it works', bx, howY + 8);
    // TODO 2: step-by-step explanation of archetype compatibility
    const howT = new Text({
      text:  '// TODO 2: explanation content',
      style: { fill: TEXT_MUTED, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontStyle: 'italic' },
    });
    howT.position.set(bx, howY + 22);
    this._content.addChild(howT);
  }

  // ── Member row ──────────────────────────────────────────────────────────────

  _drawMemberRow(emp, isLead, bx, y) {
    const tex    = getCharacterAvatarTex(emp.characterIndex ?? 1);
    const avatar = new Sprite(tex);
    avatar.width  = 36;
    avatar.height = 36;
    avatar.position.set(bx, y + 2);
    this._content.addChild(avatar);

    const tx = bx + 44;

    const nameT = new Text({
      text:  emp.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
    });
    nameT.position.set(tx, y + 2);
    this._content.addChild(nameT);

    if (isLead) {
      const badgeT = new Text({
        text:  'Team Lead',
        style: { fill: 0x4ade80, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8, fontWeight: '700' },
      });
      badgeT.position.set(tx + nameT.width + 6, y + 3);
      this._content.addChild(badgeT);
    }

    // Archetype pills
    const sorted  = Object.entries(emp.archetypes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const PILL_H  = 13;
    const PILL_R  = 3;
    const maxPillW = Math.floor((RIGHT_W - 44 - 32) / 3) - 2;
    let pillX = tx;

    for (const [archId] of sorted) {
      const def   = ARCHETYPES[archId];
      const color = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const label = def?.label ?? archId;
      const pillW = Math.max(28, Math.min(maxPillW, label.length * 5 + 6));

      this._content.addChild(
        new Graphics()
          .roundRect(pillX, y + 20, pillW, PILL_H, PILL_R)
          .fill({ color, alpha: 0.18 })
          .stroke({ color, width: 1 }),
      );
      const pillT = new Text({
        text:  label,
        style: { fill: color, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 7, fontWeight: '700' },
      });
      pillT.anchor.set(0.5, 0.5);
      pillT.position.set(pillX + pillW / 2, y + 20 + PILL_H / 2);
      this._content.addChild(pillT);

      pillX += pillW + 3;
    }

    // Mini donut (right-aligned in row)
    const donutCX = bx + RIGHT_W - 16;
    const donutCY = y + 20;
    this._drawMiniDonut(donutCX, donutCY, 14, 9, emp.archetypes ?? {});
  }

  // ── Archetype wheel ─────────────────────────────────────────────────────────

  _drawTeamWheel(archetypePcts, cx, cy) {
    // All 12 archetypes shown as equal 30° slices.
    // Fill opacity scales with the archetype's % share so dominant ones pop.
    // Each slice contains: emoji icon (top half) + numeric % (bottom half).
    const SLICE_ANGLE = (2 * Math.PI) / 12;   // 30° per slice
    const GAP         = WHEEL_GAP_RAD;
    const midR        = (WHEEL_R_INNER + WHEEL_R_OUTER) / 2;

    const maxPct = Math.max(...WHEEL_ORDER.map((id) => archetypePcts[id] ?? 0), 1);

    let startRad = -Math.PI / 2;

    for (const archId of WHEEL_ORDER) {
      const pct      = archetypePcts[archId] ?? 0;
      const isActive = pct > 0;
      const def      = ARCHETYPES[archId];
      const category = def?.category ?? 'structure';
      const color    = CATEGORY_COLORS[category];

      // Active slices: opacity proportional to their share (min 0.45, max 1.0).
      // Inactive slices: very dim.
      const fillAlpha = isActive
        ? Math.max(0.45, pct / maxPct)
        : 0.10;

      const sRad   = startRad + GAP;
      const eRad   = startRad + SLICE_ANGLE - GAP;
      const midRad = startRad + SLICE_ANGLE / 2;

      // Segment fill
      const g = new Graphics();
      this._fillAnnularArc(g, cx, cy, WHEEL_R_OUTER, WHEEL_R_INNER, sRad, eRad, color, fillAlpha);
      this._content.addChild(g);

      // Mid-point in the slice
      const ix = cx + midR * Math.cos(midRad);
      const iy = cy + midR * Math.sin(midRad);

      // Emoji icon — upper half of the slice
      const iconT = new Text({
        text:  WHEEL_ICONS[archId] ?? '',
        style: { fontSize: 19 },
      });
      iconT.anchor.set(0.5, 0.5);
      iconT.alpha = isActive ? 1.0 : 0.3;
      iconT.position.set(ix, iy - 12);
      this._content.addChild(iconT);

      // Numeric percentage — lower half of the slice
      const pctT = new Text({
        text:  `${Math.round(pct)}%`,
        style: {
          fill:       0xffffff,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   13,
          fontWeight: '700',
          align:      'center',
        },
      });
      pctT.anchor.set(0.5, 0.5);
      pctT.alpha = isActive ? 0.95 : 0.28;
      pctT.position.set(ix, iy + 12);
      this._content.addChild(pctT);

      startRad += SLICE_ANGLE;
    }

    // Centre hole
    this._content.addChild(
      new Graphics().circle(cx, cy, WHEEL_R_INNER - 3).fill({ color: 0x080f1f }),
    );

    // Centre text
    const represented = WHEEL_ORDER.filter((id) => (archetypePcts[id] ?? 0) > 0).length;

    const countT = new Text({
      text:  String(represented),
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 30, fontWeight: '700' },
    });
    countT.anchor.set(0.5, 0.5);
    countT.position.set(cx, cy - 16);
    this._content.addChild(countT);

    const archetypeT = new Text({
      text:  'Archetypes',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    archetypeT.anchor.set(0.5, 0.5);
    archetypeT.position.set(cx, cy + 6);
    this._content.addChild(archetypeT);

    const repT = new Text({
      text:  'Represented',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    repT.anchor.set(0.5, 0.5);
    repT.position.set(cx, cy + 22);
    this._content.addChild(repT);
  }

  // ── Mini donut ──────────────────────────────────────────────────────────────

  _drawMiniDonut(cx, cy, outerR, innerR, archetypes) {
    const sorted   = Object.entries(archetypes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const total    = sorted.reduce((s, [, w]) => s + w, 0) || 1;
    let startRad   = -Math.PI / 2;

    for (const [archId, weight] of sorted) {
      const angle  = (weight / total) * (2 * Math.PI);
      const endRad = startRad + angle;
      const def    = ARCHETYPES[archId];
      const color  = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;

      const g = new Graphics();
      this._fillAnnularArc(g, cx, cy, outerR, innerR, startRad, endRad, color, 1.0);
      this._content.addChild(g);

      startRad = endRad;
    }

    this._content.addChild(
      new Graphics().circle(cx, cy, innerR - 1).fill({ color: 0x080f1f }),
    );
  }

  // ── Shared drawing helpers ──────────────────────────────────────────────────

  /**
   * Draws a filled annular arc segment onto a Graphics object.
   */
  _fillAnnularArc(g, cx, cy, outerR, innerR, startRad, endRad, color, alpha) {
    g.moveTo(cx + innerR * Math.cos(startRad), cy + innerR * Math.sin(startRad))
      .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
      .arc(cx, cy, outerR, startRad, endRad, false)
      .lineTo(cx + innerR * Math.cos(endRad), cy + innerR * Math.sin(endRad))
      .arc(cx, cy, innerR, endRad, startRad, true)
      .closePath()
      .fill({ color, alpha });
  }

  _drawBar(x, y, width, frac, color) {
    this._content.addChild(
      new Graphics().roundRect(x, y, width, 8, 2).fill({ color: 0x1a2a44 }),
    );
    const fill = Math.max(0, Math.min(1, frac));
    if (fill > 0) {
      this._content.addChild(
        new Graphics().roundRect(x, y, Math.max(4, width * fill), 8, 2).fill({ color, alpha: 0.9 }),
      );
    }
  }

  _addSectionLabel(text, x, y) {
    const t = new Text({
      text,
      style: { fill: 0x4a5a7a, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    t.position.set(x, y);
    this._content.addChild(t);
  }

  _drawColumnDividers() {
    const top    = HEADER_H + P;
    const bottom = POPUP_H - P;
    for (const divX of [LEFT_X + LEFT_W + 6, CENTER_X + CENTER_W + 6]) {
      this._content.addChild(
        new Graphics()
          .moveTo(divX, top)
          .lineTo(divX, bottom)
          .stroke({ color: DIVIDER_CLR, width: 1 }),
      );
    }
  }

  // ── Score helpers ───────────────────────────────────────────────────────────

  _compatInfo(score) {
    if (score >= 75) return { label: 'Good',       color: 0x4ade80 };
    if (score >= 50) return { label: 'Okay',       color: 0xfbbf24 };
    if (score >= 25) return { label: 'Struggling', color: 0xf97316 };
    return                  { label: 'Very Poor',  color: 0xf87171 };
  }

  // ── Stats computation ───────────────────────────────────────────────────────

  _computeStats(company, team) {
    const ts      = this.game.sim.teamSystem;
    const lead    = ts.getTeamLead(company, team);
    const members = team.memberIds
      .map((id) => company.employees.find((e) => e.id === id))
      .filter(Boolean);
    const everyone = lead ? [lead, ...members] : members;

    // Aggregate archetype weights across all team members
    const totals = {};
    for (const emp of everyone) {
      for (const [archId, weight] of Object.entries(emp.archetypes ?? {})) {
        totals[archId] = (totals[archId] ?? 0) + weight;
      }
    }

    const grandTotal = Object.values(totals).reduce((s, w) => s + w, 0) || 1;

    // Per-archetype % of team aggregate
    const archetypePcts = {};
    for (const [archId, w] of Object.entries(totals)) {
      archetypePcts[archId] = (w / grandTotal) * 100;
    }

    // Per-category %
    const catTotals = {};
    for (const [archId, w] of Object.entries(totals)) {
      const cat = ARCHETYPES[archId]?.category;
      if (cat) catTotals[cat] = (catTotals[cat] ?? 0) + w;
    }
    const catGrand = Object.values(catTotals).reduce((s, w) => s + w, 0) || 1;
    const categoryPcts = {};
    for (const cat of Object.keys(CATEGORY_COLORS)) {
      categoryPcts[cat] = Math.round(((catTotals[cat] ?? 0) / catGrand) * 100);
    }

    // Dominant archetypes (top 3 by % share)
    const dominant = Object.entries(archetypePcts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Compatibility & stress scores
    const rawScore    = everyone.length >= 2 ? ts.teamCompatibility(company, team) : 0;
    const compatScore = Math.round((rawScore + 100) / 2);
    const stressScore = 100 - compatScore;
    const stressInfo  = ts.teamStressLabel(rawScore);
    const effectLabel = ts.teamEffect(company, team);

    return {
      lead, everyone, archetypePcts, categoryPcts, dominant,
      rawScore, compatScore, stressScore, stressInfo, effectLabel,
    };
  }
}
