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
import { PopupShell } from './screens/PopupShell.js';
import { Tabs } from './widgets/Tabs.js';
import { Label } from './widgets/Label.js';
import { ProgressBar } from './widgets/ProgressBar.js';
import { TeamArchetypeWheel, WHEEL_LOGO_FRAMES } from './components/ArchetypeWheel.js';
import { Theme } from './foundation/Theme.js';
import { getUiLogoTex } from '../utils/uiLogoSprite.js';

// ── Layout ────────────────────────────────────────────────────────────────────
const POPUP_W  = 860;
const POPUP_H  = 580;
const HEADER_H = 68;
const P        = 12;

const LEFT_X   = P;
const LEFT_W   = 244;
const CENTER_X = LEFT_X + LEFT_W + P;     // 268
const CENTER_W = 294;
const RIGHT_X  = CENTER_X + CENTER_W + P; // 574
const RIGHT_W  = POPUP_W - RIGHT_X - P;   // 274


// ─────────────────────────────────────────────────────────────────────────────

export class TeamInfoPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game    = game;
    this.visible = false;
    this._team   = null;

    // PopupShell provides backdrop + rounded window + close button.
    // noHeader:true means we draw custom header content inside this._content.
    this._shell = new PopupShell({
      width: POPUP_W,
      height: POPUP_H,
      noHeader: true,
      onClose: () => {
        this._team   = null;
        this.visible = false;
      },
    });
    this.addChild(this._shell);

    // Content drawn at window-local coordinates (same as before).
    this._content = new Container();
    this._shell.window.addChild(this._content);
  }

  get currentTeam() { return this._team; }

  // ── Public API ──────────────────────────────────────────────────────────────

  open(team, company, screenW, screenH) {
    this._team = team;
    this._shell.open(screenW, screenH);
    this._draw(team, company);
    this.visible = true;
  }

  close() {
    this._team   = null;
    this.visible = false;
    this._shell.visible = false;
  }

  resize(screenW, screenH) {
    this._shell.resize(screenW, screenH);
    if (!this.visible || !this._team) return;
    const company = this.game.sim?.company;
    if (company) this._draw(this._team, company);
  }

  refresh(company) {
    if (!this.visible || !this._team) return;
    this._draw(this._team, company);
  }

  // ── Root draw ───────────────────────────────────────────────────────────────

  _draw(team, company) {
    this._content.removeChildren();

    // Window background — shell provides the rounded panel + backdrop.
    // We still draw the header band and divider here.
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

    const stats = this._computeStats(company, team);

    this._drawHeader(team, stats);
    this._drawColumnDividers();
    this._drawLeftColumn(stats);
    this._drawCenterColumn(stats);
    this._drawRightColumn(team, company, stats);
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  _drawHeader(team, stats) {
    const { lead } = stats;

    // Team icon
    const iconT = new Text({ text: '👥', style: { fontSize: 22 } });
    iconT.position.set(P + 2, 10);
    this._content.addChild(iconT);

    // Team name
    const nameLabel = new Label({ text: team.name, variant: 'title' });
    nameLabel.position.set(P + 36, 10);
    this._content.addChild(nameLabel);

    // Lead subtitle
    const leadName = lead ? lead.name : 'No Lead';
    const leadArch = lead ? getDisplayName(lead.archetypes ?? {}) : '';
    const leadLabel = new Label({
      text: `Team Lead: ${leadName}${leadArch ? `  (${leadArch})` : ''}`,
      style: { fill: Theme.colors.xp, fontFamily: Theme.typography.fontFamily, fontSize: 10 },
    });
    leadLabel.position.set(P + 36, 30);
    this._content.addChild(leadLabel);

    // Tabs — only ARCHETYPES renders content; others are stubs
    const tabs = new Tabs({
      tabs: ['OVERVIEW', 'ARCHETYPES', 'MEMBERS', 'EFFECTS'],
      active: 'ARCHETYPES',
      gap: 22,
    });
    tabs.position.set(P + 36, 49);
    this._content.addChild(tabs);

    // Close button (handled by PopupShell backdrop, but custom close text matches original)
    const closeT = new Text({
      text: '✕',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
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
        .stroke({ color: Theme.colors.border, width: 1 }),
    );
  }

  // ── Left column ─────────────────────────────────────────────────────────────

  _drawLeftColumn(stats) {
    const { compatScore, stressScore, stressInfo, categoryPcts, dominant } = stats;
    const bx = LEFT_X;
    let y    = HEADER_H + P;

    // Compatibility
    const cInfo = this._compatInfo(compatScore);
    const cLabel = new Label({ text: 'Team Compatibility', variant: 'sectionHeader' });
    cLabel.position.set(bx, y);
    this._content.addChild(cLabel);
    y += 18;

    const scoreT = new Text({
      text: String(compatScore),
      style: { fill: cInfo.color, fontFamily: Theme.typography.fontFamily, fontSize: 26, fontWeight: '700' },
    });
    scoreT.position.set(bx, y);
    this._content.addChild(scoreT);

    const ofT = new Text({
      text: '/ 100',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
    });
    ofT.position.set(bx + scoreT.width + 5, y + 12);
    this._content.addChild(ofT);

    const cLabelT = new Label({
      text: cInfo.label,
      style: { fill: cInfo.color, fontFamily: Theme.typography.fontFamily, fontSize: 10, fontWeight: '600' },
    });
    cLabelT.position.set(bx, y + 34);
    this._content.addChild(cLabelT);
    y += 48;

    const compatBar = new ProgressBar({ width: LEFT_W, height: 8, value: compatScore / 100, fillColor: cInfo.color, trackColor: Theme.colors.divider, radius: 2 });
    compatBar.position.set(bx, y);
    this._content.addChild(compatBar);
    y += 16;

    // Stress
    y += 10;
    const sColor = stressScore < 30 ? Theme.colors.success : stressScore < 60 ? Theme.colors.salary : Theme.colors.dangerLight;
    const sLabel = new Label({ text: 'Team Stress', variant: 'sectionHeader' });
    sLabel.position.set(bx, y);
    this._content.addChild(sLabel);
    y += 18;

    const stressT = new Text({
      text: String(stressScore),
      style: { fill: sColor, fontFamily: Theme.typography.fontFamily, fontSize: 26, fontWeight: '700' },
    });
    stressT.position.set(bx, y);
    this._content.addChild(stressT);

    const ofT2 = new Text({
      text: '/ 100',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
    });
    ofT2.position.set(bx + stressT.width + 5, y + 12);
    this._content.addChild(ofT2);

    const sLabelT = new Label({
      text: stressInfo.label,
      style: { fill: sColor, fontFamily: Theme.typography.fontFamily, fontSize: 10, fontWeight: '600' },
    });
    sLabelT.position.set(bx, y + 34);
    this._content.addChild(sLabelT);
    y += 48;

    const stressBar = new ProgressBar({ width: LEFT_W, height: 8, value: stressScore / 100, fillColor: sColor, trackColor: Theme.colors.divider, radius: 2 });
    stressBar.position.set(bx, y);
    this._content.addChild(stressBar);
    y += 16;

    // Category Distribution
    y += 12;
    const distLabel = new Label({ text: 'Team Archetype Distribution', variant: 'sectionHeader' });
    distLabel.position.set(bx, y);
    this._content.addChild(distLabel);
    y += 16;

    for (const cat of ['structure', 'paradise', 'mark', 'connection']) {
      const pct   = categoryPcts[cat] ?? 0;
      const color = CATEGORY_COLORS[cat];
      const label = CATEGORY_LABELS[cat];

      const catLabel = new Label({ text: label, style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 9 } });
      catLabel.position.set(bx, y);
      this._content.addChild(catLabel);

      const pctT = new Text({
        text: `${pct}%`,
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontWeight: '700' },
      });
      pctT.anchor.set(1, 0);
      pctT.position.set(bx + LEFT_W, y);
      this._content.addChild(pctT);
      y += 14;

      const catBar = new ProgressBar({ width: LEFT_W, height: 7, value: pct / 100, fillColor: color, trackColor: Theme.colors.divider, radius: 2 });
      catBar.position.set(bx, y);
      this._content.addChild(catBar);
      y += 13;
    }

    // Dominant Archetypes
    y += 10;
    const domLabel = new Label({ text: 'Dominant Archetypes', variant: 'sectionHeader' });
    domLabel.position.set(bx, y);
    this._content.addChild(domLabel);
    y += 16;

    const cardW = Math.floor((LEFT_W - 8) / 3);
    dominant.slice(0, 3).forEach(([archId, pct], i) => {
      const def   = ARCHETYPES[archId];
      const color = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const cx    = bx + i * (cardW + 4);

      this._content.addChild(
        new Graphics()
          .roundRect(cx, y, cardW, 54, 6)
          .fill({ color: Theme.colors.bgCard })
          .stroke({ color, width: 1, alpha: 0.55 }),
      );

      const iconTex = getUiLogoTex(WHEEL_LOGO_FRAMES[archId]);
      if (iconTex) {
        const iconS = new Sprite(iconTex);
        iconS.anchor.set(0.5, 0);
        iconS.scale.set(15 / iconTex.height);
        iconS.position.set(cx + cardW / 2, y + 4);
        this._content.addChild(iconS);
      }

      const archT = new Text({
        text: def?.label ?? archId,
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontWeight: '700' },
      });
      archT.anchor.set(0.5, 0);
      archT.position.set(cx + cardW / 2, y + 24);
      this._content.addChild(archT);

      const pctT = new Text({
        text: `${Math.round(pct)}%`,
        style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 11, fontWeight: '700' },
      });
      pctT.anchor.set(0.5, 0);
      pctT.position.set(cx + cardW / 2, y + 37);
      this._content.addChild(pctT);
    });
  }

  // ── Center column ───────────────────────────────────────────────────────────

  _drawCenterColumn(stats) {
    const { archetypePcts, effectLabel } = stats;
    const bx = CENTER_X;
    let y    = HEADER_H + P;

    const wheelLabel = new Label({ text: 'Team Archetype Wheel', variant: 'sectionHeader' });
    wheelLabel.position.set(bx, y);
    this._content.addChild(wheelLabel);
    y += 18;

    // TeamArchetypeWheel component (replaces ~100 lines of _drawTeamWheel)
    const wheel = new TeamArchetypeWheel({ archetypePcts, width: CENTER_W });
    wheel.position.set(bx, y);
    this._content.addChild(wheel);
    y += wheel.measure().height + 20;

    // Team Effects
    const effLabel = new Label({ text: 'Team Effects (Active)', variant: 'sectionHeader' });
    effLabel.position.set(bx, y);
    this._content.addChild(effLabel);
    y += 16;

    const effectColorMap = {
      'Leadership Team': CATEGORY_COLORS.structure,
      'Research Team':   CATEGORY_COLORS.paradise,
      'High Risk Team':  CATEGORY_COLORS.mark,
      'Social Team':     CATEGORY_COLORS.connection,
      'Balanced Team':   Theme.colors.textDim,
    };
    const eColor = effectColorMap[effectLabel] ?? Theme.colors.textDim;

    this._content.addChild(
      new Graphics()
        .roundRect(bx, y, CENTER_W, 38, 6)
        .fill({ color: Theme.colors.bgCard })
        .stroke({ color: eColor, width: 1, alpha: 0.65 }),
    );

    const effT = new Text({
      text: effectLabel ?? 'Balanced Team',
      style: { fill: eColor, fontFamily: Theme.typography.fontFamily, fontSize: 12, fontWeight: '700' },
    });
    effT.anchor.set(0, 0.5);
    effT.position.set(bx + 10, y + 19);
    this._content.addChild(effT);

    const todoT = new Label({
      text: '// TODO: effect bonuses',
      style: { fill: Theme.colors.textMuted, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontStyle: 'italic' },
    });
    todoT.position.set(bx + 10, y + 26);
    this._content.addChild(todoT);
  }

  // ── Right column ────────────────────────────────────────────────────────────

  _drawRightColumn(team, company, stats) {
    const { lead } = stats;
    const bx = RIGHT_X;
    let y    = HEADER_H + P;

    const membersLabel = new Label({ text: 'Team Members', variant: 'sectionHeader' });
    membersLabel.position.set(bx, y);
    this._content.addChild(membersLabel);
    y += 18;

    const rows = [
      ...(lead ? [{ emp: lead, isLead: true }] : []),
      ...team.memberIds
        .map((id) => company.employees.find((e) => e.id === id))
        .filter(Boolean)
        .map((emp) => ({ emp, isLead: false })),
    ];

    for (const { emp, isLead } of rows) {
      if (y + 56 > POPUP_H - 80) break;
      this._drawMemberRow(emp, isLead, bx, y);
      y += 58;
    }

    if (rows.length === 0) {
      const emptyLabel = new Label({ text: 'No members yet.', variant: 'muted' });
      emptyLabel.position.set(bx, y);
      this._content.addChild(emptyLabel);
      y += 20;
    }

    // How it works stub
    const howY = POPUP_H - P - 62;
    this._content.addChild(
      new Graphics()
        .moveTo(bx, howY)
        .lineTo(bx + RIGHT_W, howY)
        .stroke({ color: Theme.colors.divider, width: 1 }),
    );
    const howLabel = new Label({ text: 'How it works', variant: 'sectionHeader' });
    howLabel.position.set(bx, howY + 8);
    this._content.addChild(howLabel);

    const howBody = new Label({ text: '// TODO: explanation content', variant: 'muted', style: { fontStyle: 'italic' } });
    howBody.position.set(bx, howY + 22);
    this._content.addChild(howBody);
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
      text: emp.name,
      style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 10, fontWeight: '700' },
    });
    nameT.position.set(tx, y + 2);
    this._content.addChild(nameT);

    if (isLead) {
      const badgeT = new Text({
        text: 'Team Lead',
        style: { fill: Theme.colors.success, fontFamily: Theme.typography.fontFamily, fontSize: 8, fontWeight: '700' },
      });
      badgeT.position.set(tx + nameT.width + 6, y + 3);
      this._content.addChild(badgeT);
    }

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
        text: label,
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 7, fontWeight: '700' },
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
      new Graphics().circle(cx, cy, innerR - 1).fill({ color: Theme.colors.bg }),
    );
  }

  // ── Shared drawing helpers ──────────────────────────────────────────────────

  _fillAnnularArc(g, cx, cy, outerR, innerR, startRad, endRad, color, alpha) {
    g.moveTo(cx + innerR * Math.cos(startRad), cy + innerR * Math.sin(startRad))
      .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
      .arc(cx, cy, outerR, startRad, endRad, false)
      .lineTo(cx + innerR * Math.cos(endRad), cy + innerR * Math.sin(endRad))
      .arc(cx, cy, innerR, endRad, startRad, true)
      .closePath()
      .fill({ color, alpha });
  }

  _drawColumnDividers() {
    const top    = HEADER_H + P;
    const bottom = POPUP_H - P;
    for (const divX of [LEFT_X + LEFT_W + 6, CENTER_X + CENTER_W + 6]) {
      this._content.addChild(
        new Graphics()
          .moveTo(divX, top)
          .lineTo(divX, bottom)
          .stroke({ color: Theme.colors.divider, width: 1 }),
      );
    }
  }

  // ── Score helpers ───────────────────────────────────────────────────────────

  _compatInfo(score) {
    if (score >= 75) return { label: 'Good',       color: Theme.colors.success };
    if (score >= 50) return { label: 'Okay',       color: Theme.colors.salary };
    if (score >= 25) return { label: 'Struggling', color: 0xf97316 };
    return                  { label: 'Very Poor',  color: Theme.colors.dangerLight };
  }

  // ── Stats computation ───────────────────────────────────────────────────────

  _computeStats(company, team) {
    const ts      = this.game.sim.teamSystem;
    const lead    = ts.getTeamLead(company, team);
    const members = team.memberIds
      .map((id) => company.employees.find((e) => e.id === id))
      .filter(Boolean);
    const everyone = lead ? [lead, ...members] : members;

    const totals = {};
    for (const emp of everyone) {
      for (const [archId, weight] of Object.entries(emp.archetypes ?? {})) {
        totals[archId] = (totals[archId] ?? 0) + weight;
      }
    }
    const grandTotal = Object.values(totals).reduce((s, w) => s + w, 0) || 1;

    const archetypePcts = {};
    for (const [archId, w] of Object.entries(totals)) {
      archetypePcts[archId] = (w / grandTotal) * 100;
    }

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

    const dominant = Object.entries(archetypePcts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

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
