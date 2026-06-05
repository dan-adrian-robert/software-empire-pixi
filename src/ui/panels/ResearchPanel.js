/**
 * ResearchPanel
 *
 * Renders the research technology tree as a top-to-bottom DAG.
 * Nodes are grouped by their dependency depth (column = depth level).
 * Each row contains all nodes of the same depth, centred horizontally.
 * Connection lines are drawn behind nodes.
 *
 * Node states:
 *   locked    – dependencies not yet met (dark, muted text)
 *   available – deps met but cannot afford (dim blue border)
 *   ready     – deps met AND can afford (bright blue, clickable)
 *   unlocked  – already researched (green border + checkmark)
 */
import { Container, Graphics, Text } from 'pixi.js';
import { RESEARCH_NODES } from '../../data/researchNodes.js';

const NODE_W = 158;
const NODE_H = 60;
const ROW_GAP = 56;
const COL_GAP = 14;
const PADDING = 12;

const ROW_H = NODE_H + ROW_GAP;

// Node fill / border colours by state
const C_LOCKED_BG = 0x0d1222;
const C_LOCKED_BORDER = 0x1a2236;
const C_LOCKED_NAME = 0x3d4d64;
const C_LOCKED_COST = 0x2a3a50;

const C_AVAIL_BG = 0x0d1a2e;
const C_AVAIL_BORDER = 0x1e3a60;
const C_AVAIL_NAME = 0x8090b0;
const C_AVAIL_COST = 0x4a6a90;

const C_READY_BG = 0x0d2a4a;
const C_READY_BORDER = 0x2a6aaa;
const C_READY_NAME = 0xe6e8ef;
const C_READY_COST = 0x4a9eff;
const C_READY_HOVER_BG = 0x153a6a;
const C_READY_HOVER_BORDER = 0x4a8acc;

const C_DONE_BG = 0x0a2a1a;
const C_DONE_BORDER = 0x2ade80;
const C_DONE_NAME = 0xe6e8ef;
const C_DONE_COST = 0x4ade80;

// Connection line colours
const C_LINE_DEFAULT = 0x1e2d47;
const C_LINE_AVAIL = 0x1e3a60;
const C_LINE_DONE = 0x1a6a3a;

export class ResearchPanel extends Container {
  /** @param {import('../../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._mask = new Graphics();
    this._scroll = new Container();
    this._scroll.mask = this._mask;
    this.addChild(this._mask);
    this.addChild(this._scroll);

    this._scrollX = 0;
    this._contentWidth = 0;
    this._contentHeight = 0;

    this._width = 600;
    this._height = 500;
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

  /**
   * Returns the current horizontal scroll state for ModalHost to drive the
   * scrollbar widget, or null when the tree fits within the viewport width.
   * @returns {{ contentWidth: number, viewportWidth: number, scrollX: number, setScrollX: (x: number) => void } | null}
   */
  getHorizontalScrollState() {
    if (this._contentWidth <= this._width) return null;
    return {
      contentWidth:  this._contentWidth,
      viewportWidth: this._width,
      scrollX:       -this._scrollX,
      setScrollX:    (x) => this._setScrollX(x),
    };
  }

  /** @param {number} x  scroll offset, 0 = left edge */
  _setScrollX(x) {
    const maxScroll = Math.max(0, this._contentWidth - this._width);
    this._scrollX   = -Math.max(0, Math.min(maxScroll, x));
    this._scroll.x  = this._scrollX;
  }

  refresh() {
    this._scroll.removeChildren();
    const company = this.game.sim?.company;
    if (!company) return;

    const unlocked = new Set(company.unlockedResearch);
    const depths = this._computeDepths();

    // Group nodes by depth
    const byDepth = new Map();
    for (const node of RESEARCH_NODES) {
      const d = depths.get(node.id);
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(node);
    }

    // Compute pixel position (top-left corner) for every node
    const nodePos = new Map(); // id → { x, y }
    const maxDepth = Math.max(...depths.values());
    let maxRowW = 0;

    for (let d = 0; d <= maxDepth; d++) {
      const row = byDepth.get(d) ?? [];
      const rowW = row.length * NODE_W + (row.length - 1) * COL_GAP;
      maxRowW = Math.max(maxRowW, rowW);
    }

    this._contentWidth = Math.max(this._width, maxRowW + PADDING * 2);
    this._contentHeight = PADDING + (maxDepth + 1) * ROW_H;
    this._updateMask();
    this._clampScrollX();

    for (let d = 0; d <= maxDepth; d++) {
      const row = byDepth.get(d) ?? [];
      const rowW = row.length * NODE_W + (row.length - 1) * COL_GAP;
      const startX = PADDING + Math.floor((this._contentWidth - rowW) / 2);
      const rowY = PADDING + d * ROW_H;

      row.forEach((node, i) => {
        nodePos.set(node.id, { x: startX + i * (NODE_W + COL_GAP), y: rowY });
      });
    }

    this._scroll.x = this._scrollX;

    // Draw connection lines first (so nodes render on top)
    const lines = new Graphics();
    this._scroll.addChild(lines);

    for (const node of RESEARCH_NODES) {
      const childP = nodePos.get(node.id);
      if (!childP) continue;

      const childUnlocked = unlocked.has(node.id);
      const depsReady = node.dependencies.every((d) => unlocked.has(d));

      for (const depId of node.dependencies) {
        const parentP = nodePos.get(depId);
        if (!parentP) continue;

        let lineColor = C_LINE_DEFAULT;
        if (childUnlocked && unlocked.has(depId)) lineColor = C_LINE_DONE;
        else if (depsReady) lineColor = C_LINE_AVAIL;

        const x1 = parentP.x + NODE_W / 2;
        const y1 = parentP.y + NODE_H;
        const x2 = childP.x + NODE_W / 2;
        const y2 = childP.y;

        // Straight line with a small bezier feel via midpoint
        const midY = (y1 + y2) / 2;
        lines
          .moveTo(x1, y1)
          .bezierCurveTo(x1, midY, x2, midY, x2, y2)
          .stroke({ color: lineColor, width: 1.5, alpha: 0.7 });
      }
    }

    // Draw nodes
    for (const node of RESEARCH_NODES) {
      const pos = nodePos.get(node.id);
      if (!pos) continue;

      const isUnlocked = unlocked.has(node.id);
      const depsReady = node.dependencies.every((d) => unlocked.has(d));
      const canAfford = company.rdPoints >= node.cost;

      this._drawNode(node, pos.x, pos.y, isUnlocked, depsReady, canAfford);
    }
  }

  // -------------------------------------------------------------------------

  /**
   * Compute DAG depth for every node (memoised DFS).
   * @returns {Map<string, number>}
   */
  _computeDepths() {
    const depths = new Map();
    const nodeMap = new Map(RESEARCH_NODES.map((n) => [n.id, n]));

    const getDepth = (id) => {
      if (depths.has(id)) return depths.get(id);
      const node = nodeMap.get(id);
      if (!node || node.dependencies.length === 0) {
        depths.set(id, 0);
        return 0;
      }
      const d = 1 + Math.max(...node.dependencies.map((dep) => getDepth(dep)));
      depths.set(id, d);
      return d;
    };

    for (const node of RESEARCH_NODES) getDepth(node.id);
    return depths;
  }

  _drawNode(node, x, y, isUnlocked, depsReady, canAfford) {
    let bgColor, borderColor, nameColor, costColor, borderW;

    if (isUnlocked) {
      bgColor = C_DONE_BG;
      borderColor = C_DONE_BORDER;
      nameColor = C_DONE_NAME;
      costColor = C_DONE_COST;
      borderW = 1.5;
    } else if (depsReady && canAfford) {
      bgColor = C_READY_BG;
      borderColor = C_READY_BORDER;
      nameColor = C_READY_NAME;
      costColor = C_READY_COST;
      borderW = 1.5;
    } else if (depsReady) {
      bgColor = C_AVAIL_BG;
      borderColor = C_AVAIL_BORDER;
      nameColor = C_AVAIL_NAME;
      costColor = C_AVAIL_COST;
      borderW = 1;
    } else {
      bgColor = C_LOCKED_BG;
      borderColor = C_LOCKED_BORDER;
      nameColor = C_LOCKED_NAME;
      costColor = C_LOCKED_COST;
      borderW = 1;
    }

    const container = new Container();
    container.position.set(x, y);

    const bg = new Graphics()
      .roundRect(0, 0, NODE_W, NODE_H, 6)
      .fill({ color: bgColor })
      .stroke({ color: borderColor, width: borderW });
    container.addChild(bg);

    // Icon (top-right)
    const iconText = new Text({
      text: node.icon ?? '',
      style: { fontSize: 16 },
    });
    iconText.anchor.set(1, 0);
    iconText.position.set(NODE_W - 7, 5);
    container.addChild(iconText);

    // Checkmark overlaid on icon when unlocked
    if (isUnlocked) {
      const check = new Text({
        text: '✓',
        style: {
          fill: C_DONE_COST,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fontWeight: '700',
        },
      });
      check.anchor.set(1, 1);
      check.position.set(NODE_W - 6, NODE_H - 6);
      container.addChild(check);
    }

    const name = new Text({
      text: node.name,
      style: {
        fill: nameColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        wordWrap: true,
        wordWrapWidth: NODE_W - 34,
      },
    });
    name.position.set(8, 7);
    container.addChild(name);

    const costStr = isUnlocked ? 'Researched' : `${node.cost} R&D`;
    const cost = new Text({
      text: costStr,
      style: {
        fill: costColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '600',
      },
    });
    cost.anchor.set(0, 1);
    cost.position.set(8, NODE_H - 7);
    container.addChild(cost);

    // Clickable only when ready (deps met + can afford + not yet unlocked)
    if (depsReady && canAfford && !isUnlocked) {
      container.eventMode = 'static';
      container.cursor = 'pointer';

      container.on('pointerover', () => {
        bg
          .clear()
          .roundRect(0, 0, NODE_W, NODE_H, 6)
          .fill({ color: C_READY_HOVER_BG })
          .stroke({ color: C_READY_HOVER_BORDER, width: 1.5 });
      });
      container.on('pointerout', () => {
        bg
          .clear()
          .roundRect(0, 0, NODE_W, NODE_H, 6)
          .fill({ color: bgColor })
          .stroke({ color: borderColor, width: borderW });
      });
      container.on('pointerup', () => {
        const success = this.game.sim.unlockResearch(node.id);
        if (success) this.refresh();
      });
    }

    this._scroll.addChild(container);
  }

  _updateMask() {
    const h = Math.max(this._contentHeight, this._height);
    this._mask.clear().rect(0, 0, this._width, h).fill({ color: 0xffffff });
  }

  _clampScrollX() {
    const maxScroll = Math.max(0, this._contentWidth - this._width);
    this._scrollX = Math.max(-maxScroll, Math.min(0, this._scrollX));
  }
}
