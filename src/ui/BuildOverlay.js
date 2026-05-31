/**
 * BuildOverlay
 *
 * Shown over the office floor when build mode is active.
 * Draws a full-floor tile grid tinted green and highlights
 * the tile(s) currently hovered during a drag operation.
 *
 * Lives in the world layer (below desk entities).
 */
import { Container, Graphics } from 'pixi.js';
import { LEFT_SIDEBAR_WIDTH } from './LeftSidebar.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

const TILE = 64;

const GRID_COLOR    = 0x22c55e;
const GRID_ALPHA    = 0.08;
const VALID_COLOR   = 0x22c55e;
const VALID_ALPHA   = 0.35;
const INVALID_COLOR = 0xf87171;
const INVALID_ALPHA = 0.35;

export class BuildOverlay extends Container {
  constructor() {
    super();
    this.visible = false;

    this._screenW = 800;
    this._screenH = 600;

    this._grid      = new Graphics();
    this._highlight = new Graphics();

    this.addChild(this._grid);
    this.addChild(this._highlight);

    // Current highlighted tile — null when no drag is active.
    this._hoverTile = null;
    this._hoverValid = true;
  }

  // ---------------------------------------------------------------------------

  show() {
    this.visible = true;
    this._drawGrid();
    this._highlight.clear();
  }

  hide() {
    this.visible = false;
    this._highlight.clear();
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._drawGrid();
  }

  /**
   * Highlight the tile(s) under the cursor during a drag.
   * @param {number|null} tileX  null to clear highlight.
   * @param {number|null} tileY
   * @param {number} w  Width in tiles of the item being dragged.
   * @param {number} h  Height in tiles.
   * @param {boolean} valid  Whether the position is valid for placement.
   */
  setHoverTile(tileX, tileY, w = 1, h = 1, valid = true) {
    this._highlight.clear();
    if (tileX === null || tileY === null) return;

    const px = LEFT_SIDEBAR_WIDTH + tileX * TILE;
    const py = TOP_BAR_HEIGHT     + tileY * TILE;

    this._highlight
      .roundRect(px + 2, py + 2, w * TILE - 4, h * TILE - 4, 4)
      .fill({ color: valid ? VALID_COLOR : INVALID_COLOR, alpha: valid ? VALID_ALPHA : INVALID_ALPHA })
      .stroke({ color: valid ? VALID_COLOR : INVALID_COLOR, width: 2, alpha: 0.9 });
  }

  // ---------------------------------------------------------------------------

  _drawGrid() {
    const floorX = LEFT_SIDEBAR_WIDTH;
    const floorY = TOP_BAR_HEIGHT;
    const floorW = this._screenW - LEFT_SIDEBAR_WIDTH;
    const floorH = this._screenH - TOP_BAR_HEIGHT;

    const cols = Math.ceil(floorW / TILE) + 1;
    const rows = Math.ceil(floorH / TILE) + 1;

    this._grid.clear();

    // Fill background tint
    this._grid
      .rect(floorX, floorY, floorW, floorH)
      .fill({ color: GRID_COLOR, alpha: GRID_ALPHA });

    // Grid lines
    for (let i = 0; i <= cols; i++) {
      const x = floorX + i * TILE;
      this._grid.moveTo(x, floorY).lineTo(x, floorY + rows * TILE);
    }
    for (let j = 0; j <= rows; j++) {
      const y = floorY + j * TILE;
      this._grid.moveTo(floorX, y).lineTo(floorX + cols * TILE, y);
    }
    this._grid.stroke({ color: GRID_COLOR, width: 1, alpha: 0.3 });
  }
}
