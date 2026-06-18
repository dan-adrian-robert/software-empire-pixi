/**
 * ArchetypeWheel components
 *
 * Two reusable archetype wheel variants extracted from TeamInfoPopup and
 * EmployeeStatsPopup. Both extend Component and draw via Pixi Graphics/Text
 * rather than the layout system — the visual output requires arc math.
 *
 *   TeamArchetypeWheel  — 12 equal slices, opacity proportional to team-aggregate %.
 *   EmployeeArchetypeWheel — 3-ring profile (primary / secondary / tertiary / rest)
 *                            plus outer label ring.
 */
import { Graphics, Sprite, Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { ARCHETYPES, CATEGORY_COLORS } from '../../data/archetypes.js';
import { Theme } from '../foundation/Theme.js';
import { getUiLogoTex } from '../../utils/uiLogoSprite.js';

// ── Shared constants ──────────────────────────────────────────────────────────

const WHEEL_ORDER = [
  'creator', 'ruler', 'caregiver',
  'innocent', 'sage', 'explorer',
  'outlaw', 'magician', 'hero',
  'everyman', 'jester', 'lover',
];

/** Spritesheet frame id per archetype (logos.json). Exported for reuse. */
export const WHEEL_LOGO_FRAMES = {
  creator:  'artist',
  ruler:    'ruler',
  caregiver:'caregiver',
  innocent: 'innocent',
  sage:     'sage',
  explorer: 'explorer',
  outlaw:   'outlaw',
  magician: 'magician',
  hero:     'hero',
  everyman: 'everyman',
  jester:   'jester',
  lover:    'lover',
};

/** Creates a centered archetype icon sprite of the given pixel height, or null. */
function makeArchSprite(archId, size) {
  const tex = getUiLogoTex(WHEEL_LOGO_FRAMES[archId]);
  if (!tex) return null;
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  sprite.scale.set(size / tex.height);
  return sprite;
}

/** Fill a single annular arc segment onto a Graphics object. */
function fillAnnularArc(g, cx, cy, outerR, innerR, startRad, endRad, color, alpha) {
  g.moveTo(cx + innerR * Math.cos(startRad), cy + innerR * Math.sin(startRad))
    .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
    .arc(cx, cy, outerR, startRad, endRad, false)
    .lineTo(cx + innerR * Math.cos(endRad), cy + innerR * Math.sin(endRad))
    .arc(cx, cy, innerR, endRad, startRad, true)
    .closePath()
    .fill({ color, alpha });
}

// ── TeamArchetypeWheel ────────────────────────────────────────────────────────

const TEAM_R_OUTER = 150;
const TEAM_R_INNER = 87;
const TEAM_GAP_RAD = 0.025;
const TEAM_W = 294;
const TEAM_H = 354;

export class TeamArchetypeWheel extends Component {
  /**
   * @param {object} props
   * @param {{ [archId: string]: number }} props.archetypePcts  archId → 0–100
   * @param {number} [props.width]
   * @param {number} [props.height]
   */
  constructor(props = {}) {
    super({ width: TEAM_W, height: TEAM_H, archetypePcts: {}, ...props });
    this.render();
  }

  render() {
    this.removeChildren();

    const { archetypePcts, width, height } = this.props;
    const cx = Math.round(width / 2);
    const cy = TEAM_R_OUTER + 14;

    const SLICE = (2 * Math.PI) / 12;
    const GAP   = TEAM_GAP_RAD;
    const midR  = (TEAM_R_INNER + TEAM_R_OUTER) / 2;
    const maxPct = Math.max(...WHEEL_ORDER.map((id) => archetypePcts[id] ?? 0), 1);

    let startRad = -Math.PI / 2;

    for (const archId of WHEEL_ORDER) {
      const pct      = archetypePcts[archId] ?? 0;
      const isActive = pct > 0;
      const def      = ARCHETYPES[archId];
      const color    = CATEGORY_COLORS[def?.category ?? 'structure'];
      const fillAlpha = isActive ? Math.max(0.45, pct / maxPct) : 0.10;

      const sRad   = startRad + GAP;
      const eRad   = startRad + SLICE - GAP;
      const midRad = startRad + SLICE / 2;

      const seg = new Graphics();
      fillAnnularArc(seg, cx, cy, TEAM_R_OUTER, TEAM_R_INNER, sRad, eRad, color, fillAlpha);
      this.addChild(seg);

      const ix = cx + midR * Math.cos(midRad);
      const iy = cy + midR * Math.sin(midRad);

      const iconT = makeArchSprite(archId, 19) ?? new Text({ text: '', style: { fontSize: 19 } });
      iconT.anchor.set(0.5, 0.5);
      iconT.alpha = isActive ? 1.0 : 0.3;
      iconT.position.set(ix, iy - 12);
      this.addChild(iconT);

      const pctT = new Text({
        text: `${Math.round(pct)}%`,
        style: {
          fill: 0xffffff,
          fontFamily: Theme.typography.fontFamily,
          fontSize: 13,
          fontWeight: '700',
          align: 'center',
        },
      });
      pctT.anchor.set(0.5, 0.5);
      pctT.alpha = isActive ? 0.95 : 0.28;
      pctT.position.set(ix, iy + 12);
      this.addChild(pctT);

      startRad += SLICE;
    }

    // Centre hole
    this.addChild(new Graphics().circle(cx, cy, TEAM_R_INNER - 3).fill({ color: Theme.colors.bg }));

    // Centre: count + labels
    const represented = WHEEL_ORDER.filter((id) => (archetypePcts[id] ?? 0) > 0).length;

    const countT = new Text({
      text: String(represented),
      style: { fill: Theme.colors.textBright, fontFamily: Theme.typography.fontFamily, fontSize: 30, fontWeight: '700' },
    });
    countT.anchor.set(0.5, 0.5);
    countT.position.set(cx, cy - 16);
    this.addChild(countT);

    for (const [offset, label] of [[6, 'Archetypes'], [22, 'Represented']]) {
      const t = new Text({
        text: label,
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
      });
      t.anchor.set(0.5, 0.5);
      t.position.set(cx, cy + offset);
      this.addChild(t);
    }

    void height;
  }

  measure() {
    return { width: this.props.width ?? TEAM_W, height: this.props.height ?? TEAM_H };
  }
}

// ── EmployeeArchetypeWheel ────────────────────────────────────────────────────

const EMP_R_INNER = 48;
const EMP_R_BASE  = 85;
const EMP_R_SEC   = 90;
const EMP_R_PRI   = 96;
const EMP_LABEL_R = EMP_R_PRI + 17;  // 113
const EMP_SEG_GAP = 1.5;
const EMP_W       = 640;
const EMP_H       = 290;

export class EmployeeArchetypeWheel extends Component {
  /**
   * @param {object} props
   * @param {{ [archId: string]: number }} props.archetypes  archId → weight (60/25/15)
   * @param {string}       props.displayName  pre-computed display name for centre
   * @param {number|null}  props.fitPct       team-fit %, or null
   * @param {number}       props.fitColor     color for fitPct text
   * @param {number}       [props.width]
   * @param {number}       [props.height]
   */
  constructor(props = {}) {
    super({ width: EMP_W, height: EMP_H, archetypes: {}, displayName: '—', fitPct: null, fitColor: Theme.colors.textDim, ...props });
    this.render();
  }

  render() {
    this.removeChildren();

    const { archetypes, displayName, fitPct, fitColor, width } = this.props;
    const sorted      = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
    const primaryId   = sorted[0]?.[0] ?? null;
    const secondaryId = sorted[1]?.[0] ?? null;
    const tertiaryId  = sorted[2]?.[0] ?? null;

    const cx = Math.round(width / 2);
    const cy = EMP_LABEL_R + 20;

    for (let i = 0; i < 12; i++) {
      const archId   = WHEEL_ORDER[i];
      const def      = ARCHETYPES[archId];
      const category = def?.category ?? 'structure';

      const isPrimary   = archId === primaryId;
      const isSecondary = archId === secondaryId;
      const isTertiary  = archId === tertiaryId;

      let segColor, segAlpha, outerR;
      if (isPrimary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 1.0; outerR = EMP_R_PRI;
      } else if (isSecondary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.7; outerR = EMP_R_SEC;
      } else if (isTertiary) {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.45; outerR = EMP_R_BASE;
      } else {
        segColor = CATEGORY_COLORS[category]; segAlpha = 0.12; outerR = EMP_R_BASE - 5;
      }

      const startDeg = -90 - 15 + i * 30 + EMP_SEG_GAP;
      const endDeg   = -90 - 15 + (i + 1) * 30 - EMP_SEG_GAP;
      const startRad = startDeg * (Math.PI / 180);
      const endRad   = endDeg   * (Math.PI / 180);

      const seg = new Graphics();
      seg
        .moveTo(cx + EMP_R_INNER * Math.cos(startRad), cy + EMP_R_INNER * Math.sin(startRad))
        .lineTo(cx + outerR * Math.cos(startRad), cy + outerR * Math.sin(startRad))
        .arc(cx, cy, outerR, startRad, endRad, false)
        .lineTo(cx + EMP_R_INNER * Math.cos(endRad), cy + EMP_R_INNER * Math.sin(endRad))
        .arc(cx, cy, EMP_R_INNER, endRad, startRad, true)
        .closePath()
        .fill({ color: segColor, alpha: segAlpha });
      this.addChild(seg);

      const isHighlighted = isPrimary || isSecondary || isTertiary;
      const midDeg  = -90 + i * 30;
      const midRad  = midDeg * (Math.PI / 180);
      const iconR   = (EMP_R_INNER + outerR) / 2;

      const icon = makeArchSprite(archId, 13) ?? new Text({ text: '', style: { fontSize: 13 } });
      icon.anchor.set(0.5, 0.5);
      icon.position.set(cx + iconR * Math.cos(midRad), cy + iconR * Math.sin(midRad));
      icon.alpha = isHighlighted ? 1.0 : 0.3;
      this.addChild(icon);

      const lx = cx + EMP_LABEL_R * Math.cos(midRad);
      const ly = cy + EMP_LABEL_R * Math.sin(midRad);
      const labelText = new Text({
        text: def?.label ?? archId,
        style: {
          fill: isHighlighted ? (CATEGORY_COLORS[category] ?? Theme.colors.textBright) : Theme.colors.textDim,
          fontFamily: Theme.typography.fontFamily,
          fontSize: 9,
          fontWeight: isHighlighted ? '700' : '400',
        },
      });
      labelText.anchor.set(0.5, 0.5);
      labelText.position.set(lx, ly);
      this.addChild(labelText);
    }

    // Centre circle
    this.addChild(new Graphics().circle(cx, cy, EMP_R_INNER - 3).fill({ color: Theme.colors.bgCard }));

    // Centre text: display name, "Team Fit", fit %
    const dnText = new Text({
      text: displayName,
      style: { fill: Theme.colors.purple, fontFamily: Theme.typography.fontFamily, fontSize: 10, fontWeight: '700', align: 'center' },
    });
    dnText.anchor.set(0.5, 0.5);
    dnText.position.set(cx, cy - 10);
    this.addChild(dnText);

    const fitLbl = new Text({
      text: 'Team Fit',
      style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 8 },
    });
    fitLbl.anchor.set(0.5, 0.5);
    fitLbl.position.set(cx, cy + 4);
    this.addChild(fitLbl);

    const fitText = new Text({
      text: fitPct !== null ? `${fitPct}%` : '—',
      style: { fill: fitColor, fontFamily: Theme.typography.fontFamily, fontSize: 14, fontWeight: '700' },
    });
    fitText.anchor.set(0.5, 0.5);
    fitText.position.set(cx, cy + 17);
    this.addChild(fitText);

    // Legend row below wheel
    const legendY  = cy + EMP_R_PRI + 18;
    const RANK_LABELS  = ['Primary', 'Secondary', 'Tertiary'];
    const RANK_WEIGHTS = [60, 25, 15];
    const RANK_ALPHAS  = [1.0, 0.7, 0.45];
    const legendItemW  = Math.floor(width / 3);

    sorted.slice(0, 3).forEach(([archId, _weight], i) => {
      const def   = ARCHETYPES[archId];
      const color = CATEGORY_COLORS[def?.category] ?? 0x4a7aff;
      const lx    = i * legendItemW;

      this.addChild(new Graphics().circle(lx + 5, legendY + 7, 4).fill({ color, alpha: RANK_ALPHAS[i] }));

      const legendTxt = new Text({
        text: `${RANK_LABELS[i]} (${RANK_WEIGHTS[i]}%)`,
        style: { fill: Theme.colors.textDim, fontFamily: Theme.typography.fontFamily, fontSize: 9 },
      });
      legendTxt.position.set(lx + 12, legendY + 1);
      this.addChild(legendTxt);
    });
  }

  measure() {
    return { width: this.props.width ?? EMP_W, height: this.props.height ?? EMP_H };
  }
}
