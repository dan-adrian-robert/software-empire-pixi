/**
 * SaveSlotPopup
 *
 * Full-screen popup for choosing and naming a save slot.
 * Three internal views:
 *
 *   'slots'   — list of 5 slots; click empty → 'name', click occupied → 'confirm'
 *   'confirm' — "Overwrite this save?" with Yes / No
 *   'name'    — HTML <input> for the save name + Save / Back buttons
 *
 * Usage:
 *   popup.open(screenW, screenH, onSave)
 *     onSave(slotIndex: number, name: string) is called after the player confirms.
 *   popup.close()
 *   popup.resize(screenW, screenH)
 */
import { Container, Graphics, Text } from 'pixi.js';
import { getSlotMeta } from '../systems/SaveManager.js';
import { GameConfig } from '../config.js';

const { SLOT_COUNT } = GameConfig.save;

// ── Layout ──────────────────────────────────────────────────────────────────
const DIALOG_W   = 540;
const ROW_W      = DIALOG_W - 40;
const ROW_H      = 68;
const ROW_GAP    = 10;
const PAD        = 20;
const TITLE_H    = 54;
const RADIUS     = 12;

// ── Palette ──────────────────────────────────────────────────────────────────
const BG_DIALOG    = 0x0d1526;
const BORDER_DLG   = 0x2a4a8a;
const COL_WHITE    = 0xe6e8ef;
const COL_MUTED    = 0x7a86a3;
const COL_DIM      = 0x3a4a6b;
const COL_BLUE     = 0x4a7aff;
const ROW_FILLED   = 0x1a2740;
const ROW_FILL_HOV = 0x223660;
const ROW_FILL_PRE = 0x152030;
const ROW_BDR      = 0x3a5a9a;
const ROW_BDR_HOV  = 0x4a7aff;
const ROW_EMPTY    = 0x131929;
const ROW_EMPTY_BDR = 0x1e2d47;
const ROW_EMPTY_HOV = 0x1c2d48;
const BTN_CONFIRM  = 0x1e4a9a;
const BTN_CONF_HOV = 0x2a5ab8;
const BTN_CANCEL   = 0x1a2336;
const BTN_CANC_HOV = 0x253352;
const BTN_DANGER   = 0x7a1a1a;
const BTN_DANGER_HOV = 0x9a2222;
const BTN_TEXT_COL = 0xe6e8ef;

const FONT = 'Inter, system-ui, sans-serif';
const MONO = 'monospace';

// Computed dialog heights per view.
const SLOTS_H   = TITLE_H + PAD + SLOT_COUNT * ROW_H + (SLOT_COUNT - 1) * ROW_GAP + PAD + 48 + PAD;
const CONFIRM_H = 200;
const NAME_H    = 200;

export class SaveSlotPopup extends Container {
  constructor() {
    super();
    this.visible = false;

    this._screenW   = 0;
    this._screenH   = 0;
    this._onSave    = null;

    // Pending slot while navigating to 'confirm' or 'name' view.
    this._pendingSlot = -1;
    this._pendingMeta = null;

    // Current view: 'slots' | 'confirm' | 'name'
    this._view = 'slots';

    // Backdrop.
    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.on('pointerdown', () => this.close());
    this.addChild(this._backdrop);

    // Dialog (stops backdrop from firing on interior clicks).
    this._dialog = new Container();
    this._dialog.eventMode = 'static';
    this._dialog.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._dialog);

    this._dialogBg = new Graphics();
    this._dialog.addChild(this._dialogBg);

    // Content layers — one per view, swapped in/out.
    this._slotsLayer   = new Container();
    this._confirmLayer = new Container();
    this._nameLayer    = new Container();

    this._dialog.addChild(this._slotsLayer);
    this._dialog.addChild(this._confirmLayer);
    this._dialog.addChild(this._nameLayer);

    // HTML input (created on open of 'name' view, removed on exit).
    this._input = null;

    this._buildSlotsLayer();
    this._buildConfirmLayer();
    this._buildNameLayer();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * @param {number} screenW
   * @param {number} screenH
   * @param {(slotIndex: number, name: string) => void} onSave
   */
  open(screenW, screenH, onSave) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._onSave  = onSave;
    this._switchView('slots');
    this.visible = true;
  }

  close() {
    if (!this.visible) return;
    this._removeInput();
    this.visible = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (!this.visible) return;
    this._layout();
    this._repositionInput();
  }

  // ── View switching ─────────────────────────────────────────────────────────

  _switchView(view) {
    this._view = view;

    // Rebuild the slot rows each time we show the slots view so the data is
    // fresh (e.g. after an overwrite).
    if (view === 'slots') {
      this._removeInput();
      this._rebuildSlotRows();
    } else if (view === 'confirm') {
      this._removeInput();
      this._refreshConfirmLayer();
    }

    this._slotsLayer.visible   = view === 'slots';
    this._confirmLayer.visible = view === 'confirm';
    this._nameLayer.visible    = view === 'name';

    // Layout must run before the HTML input is created so the dialog position
    // reflects the correct view height when we calculate CSS fixed coordinates.
    this._layout();

    if (view === 'name') {
      const meta = this._pendingMeta;
      const defaultName = meta?.saveName
        ?? meta?.companyName
        ?? `Slot ${this._pendingSlot + 1}`;
      this._openNameInput(defaultName);
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  _layout() {
    const { _screenW: W, _screenH: H } = this;

    this._backdrop.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.65 });

    const dialogH = this._view === 'slots'   ? SLOTS_H
                  : this._view === 'confirm' ? CONFIRM_H
                  : NAME_H;

    const dx = Math.round((W - DIALOG_W) / 2);
    const dy = Math.round((H - dialogH) / 2);
    this._dialog.position.set(dx, dy);

    this._dialogBg
      .clear()
      .roundRect(0, 0, DIALOG_W, dialogH, RADIUS)
      .fill({ color: BG_DIALOG })
      .stroke({ color: BORDER_DLG, width: 1.5 });
  }

  // ── Slots layer ─────────────────────────────────────────────────────────────

  _buildSlotsLayer() {
    this._slotsTitle = _makeText('Save Game', 18, COL_WHITE, '700');
    this._slotsTitle.anchor.set(0.5, 0.5);
    this._slotsTitle.position.set(DIALOG_W / 2, TITLE_H / 2);
    this._slotsLayer.addChild(this._slotsTitle);

    this._slotRowsContainer = new Container();
    this._slotRowsContainer.position.set(PAD, TITLE_H + PAD);
    this._slotsLayer.addChild(this._slotRowsContainer);

    this._slotsCancelBtn = _makeBtn('Cancel', BTN_CANCEL, BTN_CANC_HOV, 120, 38, () => this.close());
    this._slotsLayer.addChild(this._slotsCancelBtn);

    this._rebuildSlotRows();
  }

  _rebuildSlotRows() {
    this._slotRowsContainer.removeChildren();

    for (let i = 0; i < SLOT_COUNT; i++) {
      const row = this._buildSlotRow(i);
      row.y = i * (ROW_H + ROW_GAP);
      this._slotRowsContainer.addChild(row);
    }

    // Reposition cancel button below the rows.
    const listH = SLOT_COUNT * ROW_H + (SLOT_COUNT - 1) * ROW_GAP;
    if (this._slotsCancelBtn) {
      this._slotsCancelBtn.position.set(
        (DIALOG_W - 120) / 2,
        TITLE_H + PAD + listH + PAD,
      );
    }
  }

  _buildSlotRow(index) {
    const meta      = getSlotMeta(index);
    const container = new Container();
    const bg        = new Graphics();
    const RAD       = 8;

    if (meta.occupied) {
      const drawNormal = () => bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: ROW_FILLED }).stroke({ color: ROW_BDR, width: 1.5, alignment: 1 });
      const drawHover  = () => bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: ROW_FILL_HOV }).stroke({ color: ROW_BDR_HOV, width: 1.5, alignment: 1 });
      const drawPress  = () => bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: ROW_FILL_PRE }).stroke({ color: ROW_BDR, width: 1.5, alignment: 1 });
      drawNormal();

      const slotLbl   = _makeText(`Slot ${index + 1}`, 12, COL_BLUE, '600');
      slotLbl.position.set(12, 8);

      const displayName = meta.saveName ?? meta.companyName;
      const nameTxt   = _makeText(displayName, 17, COL_WHITE, '700');
      nameTxt.position.set(12, 24);

      const infoTxt   = _makeText(
        `${meta.companyName}  ·  Day ${meta.day}  ·  $${(meta.money ?? 0).toLocaleString()}`,
        12, COL_MUTED,
      );
      infoTxt.position.set(12, 46);

      const dateStr = meta.savedAt
        ? new Date(meta.savedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : '';
      const dateTxt = _makeText(dateStr, 11, COL_DIM);
      dateTxt.anchor.set(1, 0);
      dateTxt.position.set(ROW_W - 12, 8);

      container.addChild(bg, slotLbl, nameTxt, infoTxt, dateTxt);
      container.eventMode = 'static';
      container.cursor    = 'pointer';
      container.on('pointerover',      drawHover);
      container.on('pointerout',       drawNormal);
      container.on('pointerdown',      drawPress);
      container.on('pointerupoutside', drawNormal);
      container.on('pointerup', () => {
        drawNormal();
        this._pendingSlot = index;
        this._pendingMeta = meta;
        this._switchView('confirm');
      });
    } else {
      const drawNormal = () => bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: ROW_EMPTY }).stroke({ color: ROW_EMPTY_BDR, width: 1, alignment: 1 });
      const drawHover  = () => bg.clear().roundRect(0, 0, ROW_W, ROW_H, RAD).fill({ color: ROW_EMPTY_HOV }).stroke({ color: ROW_BDR, width: 1, alignment: 1 });
      drawNormal();

      const slotLbl = _makeText(`Slot ${index + 1}`, 12, COL_BLUE, '600');
      slotLbl.position.set(12, 8);

      const emptyLbl = _makeText('Empty  —  click to save here', 15, COL_MUTED);
      emptyLbl.anchor.set(0, 0.5);
      emptyLbl.position.set(12, ROW_H / 2 + 4);

      container.addChild(bg, slotLbl, emptyLbl);
      container.eventMode = 'static';
      container.cursor    = 'pointer';
      container.on('pointerover',      drawHover);
      container.on('pointerout',       drawNormal);
      container.on('pointerupoutside', drawNormal);
      container.on('pointerup', () => {
        drawNormal();
        this._pendingSlot = index;
        this._pendingMeta = null;
        this._switchView('name');
      });
    }

    return container;
  }

  // ── Confirm layer ───────────────────────────────────────────────────────────

  _buildConfirmLayer() {
    this._confirmTitle = _makeText('Overwrite Save?', 17, COL_WHITE, '700');
    this._confirmTitle.anchor.set(0.5, 0.5);
    this._confirmTitle.position.set(DIALOG_W / 2, TITLE_H / 2);
    this._confirmLayer.addChild(this._confirmTitle);

    this._confirmInfo = _makeText('', 14, COL_MUTED);
    this._confirmInfo.anchor.set(0.5, 0.5);
    this._confirmInfo.position.set(DIALOG_W / 2, TITLE_H + 30);
    this._confirmLayer.addChild(this._confirmInfo);

    const BTN_Y  = TITLE_H + 80;
    const BTN_CX = DIALOG_W / 2;

    this._confirmYesBtn = _makeBtn('Overwrite', BTN_DANGER, BTN_DANGER_HOV, 130, 40, () => {
      this._switchView('name');
    });
    this._confirmYesBtn.position.set(BTN_CX - 130 - 6, BTN_Y);
    this._confirmLayer.addChild(this._confirmYesBtn);

    this._confirmNoBtn = _makeBtn('Cancel', BTN_CANCEL, BTN_CANC_HOV, 100, 40, () => {
      this._switchView('slots');
    });
    this._confirmNoBtn.position.set(BTN_CX + 6, BTN_Y);
    this._confirmLayer.addChild(this._confirmNoBtn);
  }

  _refreshConfirmLayer() {
    if (!this._pendingMeta) return;
    const m = this._pendingMeta;
    const label = m.saveName ?? m.companyName;
    this._confirmInfo.text = `"${label}" — Day ${m.day}  ·  $${(m.money ?? 0).toLocaleString()}`;
  }

  // ── Name layer ──────────────────────────────────────────────────────────────

  _buildNameLayer() {
    this._nameTitle = _makeText('Name Your Save', 17, COL_WHITE, '700');
    this._nameTitle.anchor.set(0.5, 0.5);
    this._nameTitle.position.set(DIALOG_W / 2, TITLE_H / 2);
    this._nameLayer.addChild(this._nameTitle);

    // Placeholder shown behind where the HTML input will float.
    this._namePlaceholderBg = new Graphics();
    this._namePlaceholderBg.position.set(PAD, TITLE_H + 14);
    this._nameLayer.addChild(this._namePlaceholderBg);

    const BTN_Y = TITLE_H + 14 + 40 + 16;
    const CX    = DIALOG_W / 2;

    this._nameSaveBtn = _makeBtn('Save', BTN_CONFIRM, BTN_CONF_HOV, 120, 38, () => this._doSave());
    this._nameSaveBtn.position.set(CX - 120 - 6, BTN_Y);
    this._nameLayer.addChild(this._nameSaveBtn);

    this._nameBackBtn = _makeBtn('Back', BTN_CANCEL, BTN_CANC_HOV, 90, 38, () => {
      this._pendingMeta
        ? this._switchView('confirm')
        : this._switchView('slots');
    });
    this._nameBackBtn.position.set(CX + 6, BTN_Y);
    this._nameLayer.addChild(this._nameBackBtn);
  }

  _openNameInput(defaultName) {
    this._removeInput();

    // Draw the input placeholder box so it looks like part of the dialog.
    this._namePlaceholderBg
      .clear()
      .roundRect(0, 0, DIALOG_W - PAD * 2, 40, 8)
      .fill({ color: 0x0f1929 })
      .stroke({ color: BORDER_DLG, width: 1.5 });

    const input = document.createElement('input');
    input.type        = 'text';
    input.value       = defaultName;
    input.maxLength   = 48;
    input.placeholder = 'Enter a save name…';

    Object.assign(input.style, {
      position:     'fixed',
      width:        `${DIALOG_W - PAD * 2}px`,
      height:       '40px',
      padding:      '0 12px',
      background:   'transparent',
      color:        '#e6e8ef',
      border:       '0',
      outline:      'none',
      fontFamily:   FONT,
      fontSize:     '15px',
      zIndex:       '1000',
      boxSizing:    'border-box',
    });

    this._positionInput(input);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); this._doSave(); }
      if (e.key === 'Escape') { e.preventDefault(); this.close();   }
    });

    document.body.appendChild(input);
    this._input = input;
    requestAnimationFrame(() => {
      this._input?.focus();
      this._input?.select();
    });
  }

  _positionInput(el) {
    const inp = el ?? this._input;
    if (!inp) return;
    const { x: dx, y: dy } = this._dialog.position;
    const inputLeft = Math.round(dx + PAD);
    const inputTop  = Math.round(dy + TITLE_H + 14);
    inp.style.left = `${inputLeft}px`;
    inp.style.top  = `${inputTop}px`;
  }

  _repositionInput() {
    this._positionInput(this._input);
  }

  _removeInput() {
    if (this._input) {
      this._input.remove();
      this._input = null;
    }
  }

  _doSave() {
    const name = this._input?.value.trim() || `Slot ${this._pendingSlot + 1}`;
    const slot = this._pendingSlot;
    this.close();
    this._onSave?.(slot, name);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function _makeText(str, size, color, weight = '400') {
  return new Text({
    text: str,
    style: { fill: color, fontFamily: FONT, fontSize: size, fontWeight: weight },
  });
}

function _makeBtn(label, bgNormal, bgHover, w, h, onClick) {
  const container = new Container();
  container.eventMode = 'static';
  container.cursor    = 'pointer';

  const bg = new Graphics();
  container.addChild(bg);

  const txt = new Text({
    text: label,
    style: { fill: BTN_TEXT_COL, fontFamily: FONT, fontSize: 14, fontWeight: '600' },
  });
  txt.anchor.set(0.5);
  txt.position.set(w / 2, h / 2);
  container.addChild(txt);

  const draw = (hover) => bg.clear().roundRect(0, 0, w, h, 8).fill({ color: hover ? bgHover : bgNormal }).stroke({ color: 0x3a5a9a, width: 1 });
  draw(false);

  container.on('pointerover',      () => draw(true));
  container.on('pointerout',       () => draw(false));
  container.on('pointerup',        () => { draw(false); onClick(); });
  container.on('pointerupoutside', () => draw(false));

  return container;
}
