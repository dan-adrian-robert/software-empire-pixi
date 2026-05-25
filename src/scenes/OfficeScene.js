/**
 * OfficeScene
 *
 * The core gameplay screen. Hosts:
 *   - TopBarHUD (fixed top, includes speed controls)
 *   - LeftSidebar (fixed left nav)
 *   - RightWidgetBar (fixed right, toggleable Activity + Projects widgets)
 *   - World view (office floor, desks, employee entities) — always visible
 *   - Modal popups for Projects / Staff / Hiring (float over the world)
 *   - Toast notifications layer
 */
import { Container, Graphics } from 'pixi.js';

import { BaseScene } from './BaseScene.js';
import { recordSpPeriod } from '../state/Company.js';

import { TopBarHUD, TOP_BAR_HEIGHT } from '../ui/TopBarHUD.js';
import { LeftSidebar, LEFT_SIDEBAR_WIDTH } from '../ui/LeftSidebar.js';
import { RightWidgetBar, RIGHT_SIDEBAR_WIDTH } from '../ui/RightWidgetBar.js';
import { Modal } from '../ui/Modal.js';
import { EmployeeStatsPopup } from '../ui/EmployeeStatsPopup.js';
import { SchedulePopup } from '../ui/SchedulePopup.js';
import { WeatherPopup } from '../ui/WeatherPopup.js';
import { DayReportPopup } from '../ui/DayReportPopup.js';
import { SaveSlotPopup } from '../ui/SaveSlotPopup.js';
import { Toast } from '../ui/Toast.js';

import { ProjectsPanel } from '../ui/panels/ProjectsPanel.js';
import { EmployeesPanel } from '../ui/panels/EmployeesPanel.js';
import { HiringPanel } from '../ui/panels/HiringPanel.js';
import { ResearchPanel } from '../ui/panels/ResearchPanel.js';
import { AssignmentPanel } from '../ui/panels/AssignmentPanel.js';

import { DeskEntity, DESK_W, DESK_H } from '../entities/DeskEntity.js';
import { EmployeeEntity } from '../entities/EmployeeEntity.js';
import { BuyDeskEntity } from '../entities/BuyDeskEntity.js';
import { SCHEDULE_CYCLE } from '../state/Employee.js';

const TILE = 64;
const FLOOR_COLOR = 0x0f172a;
const GRID_COLOR = 0x141e35;
const DESK_COLS = 4;
const DESK_PAD_X = 32;
const DESK_PAD_Y = 28;

const PANEL_TITLES = {
  projects: 'Projects',
  employees: 'Staff',
  hiring: 'Hiring',
  assignment: 'Project Assignments',
  research: 'Research Tree',
};

export class OfficeScene extends BaseScene {
  constructor(game) {
    super(game);

    // Layered containers.
    this._world = new Container();
    this._world.label = 'world';

    this._popupLayer = new Container();
    this._popupLayer.label = 'popup';

    this._modalLayer = new Container();
    this._modalLayer.label = 'modal';

    this._hudLayer = new Container();
    this._hudLayer.label = 'hud';

    this._toastLayer = new Container();
    this._toastLayer.label = 'toasts';

    // World graphics.
    this._floor = new Graphics();
    this._grid = new Graphics();

    // Office desk/employee entities.
    /** @type {DeskEntity[]} */
    this._desks = [];
    /** @type {EmployeeEntity[]} */
    this._employeeEntities = [];
    /** @type {BuyDeskEntity|null} */
    this._buyDeskEntity = null;

    // HUD widgets.
    this._topBar = new TopBarHUD(game);
    this._leftSidebar = new LeftSidebar(
      (id) => this._navigate(id),
      ()   => this._openSaveNamePopup(),
    );
    this._widgetBar = new RightWidgetBar(game);

    // Modal popup (shared, reused for all panel types).
    this._modal = new Modal(() => this._onModalClosed());

    // Employee stats popup (click on world employee to open).
    this._statsPopup = new EmployeeStatsPopup(this.game);

    // Work schedule popup (toggled via Schedule sidebar button).
    this._schedulePopup = new SchedulePopup((startHour, workHours) => {
      this.game.sim.setSchedule(startHour, workHours);
    });

    // Weather info popup (click on weather chip in top bar row 2).
    this._weatherPopup = new WeatherPopup();

    // End-of-day report popup.
    this._dayReportPopup = new DayReportPopup(() => {
      this._dayReportPopup.close();
      this.game.sim.setSpeed(1);
    });

    // Save-slot popup — shown when the player clicks the Save sidebar button.
    this._saveSlotPopup = new SaveSlotPopup();

    // Active nav view id ('office' | 'projects' | 'employees' | 'hiring').
    this._activeView = 'office';

    // Toasts.
    /** @type {Toast[]} */
    this._toasts = [];

    // HUD refresh accumulator.
    this._hudRefreshAcc = 0;

    // Last known 15-minute slot index — used to detect WORK period end.
    this._prevSlot = -1;
  }

  async preload() {}

  async enter() {
    this.root.addChild(this._world);
    this._world.addChild(this._floor);
    this._world.addChild(this._grid);

    // Popup layer (employee stats + schedule + weather) — above world, below modal and HUD.
    this.root.addChild(this._popupLayer);
    this._popupLayer.addChild(this._schedulePopup);
    this._popupLayer.addChild(this._statsPopup);
    this._popupLayer.addChild(this._weatherPopup);
    this._popupLayer.addChild(this._dayReportPopup);
    this._popupLayer.addChild(this._saveSlotPopup);

    // Modal layer sits between world and HUD so HUD elements stay interactive.
    this.root.addChild(this._modalLayer);
    this._modalLayer.addChild(this._modal);

    this.root.addChild(this._hudLayer);
    this.root.addChild(this._toastLayer);

    // HUD.
    this._hudLayer.addChild(this._topBar);
    this._hudLayer.addChild(this._leftSidebar);
    this._hudLayer.addChild(this._widgetBar);

    // World background click closes any open floating popup.
    // Employee entities and the schedule popup stop propagation so they don't trigger this.
    this._world.eventMode = 'static';
    this._world.on('pointerdown', () => {
      this._closeStatsPopup();
      this._closeSchedulePopup();
      this._weatherPopup.close();
    });

    // Scroll wheel forwarded to modal.
    this.root.eventMode = 'static';
    this._onWheel = (e) => this._handleWheel(e);
    this.game.app.canvas.addEventListener('wheel', this._onWheel, { passive: true });

    // Subscribe to events.
    this.listen('day:began', () => this._onDayBegan());
    this.listen('employee:hired', () => this._rebuildOffice());
    this.listen('employee:fired', () => this._rebuildOffice());
    this.listen('desk:bought', () => this._rebuildOffice());
    this.listen('project:completed', () => {
      if (this._activeView === 'projects') this._modal.refresh();
      this._widgetBar.refresh(true);
    });
    this.listen('project:accepted', () => {
      if (this._activeView === 'projects') this._modal.refresh();
      this._widgetBar.refresh(true);
    });
    this.listen('project:failed', () => {
      if (this._activeView === 'projects') this._modal.refresh();
      this._widgetBar.refresh(true);
    });
    this.listen('employee:levelup', ({ employee }) => {
      if (this._statsPopup?.currentEmp?.id === employee.id) {
        this._statsPopup.refresh(this.game.sim?.company);
      }
      if (this._activeView === 'staff') this._modal.refresh();
    });
    this.listen('notification:add', ({ text, type }) => {
      this._spawnToast(text, type);
      this._widgetBar.refresh(true);
    });
    this.listen('research:unlocked', () => {
      if (this._activeView === 'research') this._modal.refresh();
      this._topBar.refresh();
    });
    this.listen('day:report', (snapshot) => {
      const { width, height } = this.game.screen;
      this._dayReportPopup.open(snapshot, width, height);
    });
    this.listen('simulation:reset', () => {
      this._rebuildOffice();
      this._navigate('office');
    });
  }

  update(dt) {
    // Keep speed-button highlight in sync with current game speed.
    this._topBar.update();

    // Entities.
    const company = this.game.sim?.company;
    if (company) {
      const speed = this.game.sim.time.gameSpeed;
      const working = speed > 0;

      // Compute current schedule state from the 15-min clock slot.
      const { dayProgress } = this.game.sim.time;
      const totalMinutes = dayProgress * company.schedule.workHours * 60;
      const slot = Math.floor(totalMinutes / 15);
      const scheduleState = SCHEDULE_CYCLE[slot % SCHEDULE_CYCLE.length];
      company.employees.forEach((emp) => { emp.scheduleState = scheduleState; });

      // Detect WORK period end: slot changed and the outgoing slot was WORK.
      if (slot !== this._prevSlot && this._prevSlot >= 0) {
        const prevState = SCHEDULE_CYCLE[this._prevSlot % SCHEDULE_CYCLE.length];
        if (prevState === 'WORK') {
          const totals = this.game.sim.projects.flushWorkPeriod(company);
          let periodTotal = 0;
          totals.forEach((pts, empIdx) => {
            if (pts > 0) {
              this._employeeEntities[empIdx]?.showPoints(pts);
              periodTotal += pts;
            }
          });
          recordSpPeriod(company, periodTotal);
        }
      }
      this._prevSlot = slot;

      this._employeeEntities.forEach((ee, idx) => {
        const emp = company.employees[idx];
        if (!emp) return;
        const state = working
          ? emp.activeProjectId !== null
            ? 'typing'
            : 'idle'
          : 'idle';
        ee.setState(state);
        ee.setHasProject(emp.pinnedProjectId !== null);
        ee.setScheduleState(emp.scheduleState);
        ee.update(dt);
      });

      // Update desk active glow.
      this._desks.forEach((desk, idx) => {
        const emp = company.employees[idx];
        const active = working && emp?.activeProjectId !== null;
        desk.setActive(active ?? false);
      });
    }

    // HUD refresh (every 0.2s is plenty).
    this._hudRefreshAcc += dt;
    if (this._hudRefreshAcc >= 0.2) {
      this._hudRefreshAcc = 0;
      this._topBar.refresh();
      this._widgetBar.refresh();
      this._modal.refresh();
      this._statsPopup.refresh(this.game.sim?.company);
      this._schedulePopup.refresh(this.game.sim?.company);
      this._weatherPopup.refresh(this.game.sim?.company);
      this._refreshBuyDesk();
    }

    // Toasts.
    this._tickToasts(dt);
  }

  resize(width, height) {
    this._drawFloor(width, height);
    this._drawGrid(width, height);
    this._positionDesks(width, height);

    this._topBar.resize(width);
    this._leftSidebar.resize(width, height);
    this._widgetBar.resize(width, height);
    this._modal.resize(width, height);
    this._statsPopup.resize(width, height);
    this._weatherPopup.resize(width, height);
    this._dayReportPopup.resize(width, height);
    this._saveSlotPopup.resize(width, height);
    if (this._schedulePopup.visible) {
      this._schedulePopup.open(this.game.sim?.company, width, height);
    }
    this._repositionToasts(width);

    // First-time initialisation guard.
    if (!this._initialized) {
      this._topBar.init(width);
      this._topBar.setWeatherClickHandler((ax, ay) => this._toggleWeatherPopup(ax, ay));
      this._leftSidebar.init(height);
      this._widgetBar.init(width, height);
      this._initialized = true;
      this._rebuildOffice();
    }
  }

  async exit() {
    if (this._onWheel) {
      this.game.app.canvas.removeEventListener('wheel', this._onWheel);
      this._onWheel = null;
    }
    this._desks = [];
    this._employeeEntities = [];
    this._buyDeskEntity = null;
    this._toasts = [];
    this._initialized = false;
    this._activeView = 'office';
    this._prevSlot = -1;
    this._statsPopup.close();
    this._schedulePopup.close();
    this._weatherPopup.close();
    this._saveSlotPopup.close();
  }

  // -----------------------------------------------------------------------
  // Save name popup
  // -----------------------------------------------------------------------

  _openSaveNamePopup() {
    if (!this.game.sim.company) return;
    const { width, height } = this.game.screen;
    this._saveSlotPopup.open(
      width,
      height,
      (slotIndex, name) => this.game.saveGame({ slot: slotIndex, name }),
    );
  }

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  _closeSchedulePopup() {
    if (!this._schedulePopup.visible) return;
    this._schedulePopup.close();
    this._leftSidebar.setActive(this._activeView);
  }

  _toggleWeatherPopup(anchorX, anchorY) {
    if (this._weatherPopup.visible) {
      this._weatherPopup.close();
      return;
    }
    const { width, height } = this.game.screen;
    this._weatherPopup.open(this.game.sim?.company, anchorX, anchorY, width, height);
  }

  _closeStatsPopup() {
    if (!this._statsPopup.visible) return;
    const prev = this._statsPopup.currentEmp;
    this._statsPopup.close();
    // Deselect the previously selected entity.
    const idx = this.game.sim?.company?.employees.indexOf(prev) ?? -1;
    if (idx !== -1) this._employeeEntities[idx]?.setSelected(false);
  }

  _onEmployeeClick(emp, deskX, deskY) {
    const company = this.game.sim?.company;
    if (!company) return;

    // Deselect previous
    const prevEmp = this._statsPopup.currentEmp;
    if (prevEmp) {
      const prevIdx = company.employees.indexOf(prevEmp);
      if (prevIdx !== -1) this._employeeEntities[prevIdx]?.setSelected(false);
    }

    // Toggle off if same employee clicked again
    if (prevEmp === emp) {
      this._statsPopup.close();
      return;
    }

    // Select new
    const idx = company.employees.indexOf(emp);
    if (idx !== -1) this._employeeEntities[idx]?.setSelected(true);

    const { width, height } = this.game.screen;
    this._statsPopup.open(emp, company, deskX, deskY, width, height);
  }

  _toggleSchedule() {
    const { width, height } = this.game.screen;
    if (this._schedulePopup.visible) {
      this._closeSchedulePopup();
    } else {
      this._schedulePopup.open(this.game.sim?.company, width, height);
      this._leftSidebar.setActive('schedule');
    }
  }

  _navigate(viewId) {
    this._closeStatsPopup();
    if (viewId === 'schedule') {
      this._toggleSchedule();
      return;
    }
    // Opening a main modal closes the schedule popup.
    if (viewId !== 'office') this._schedulePopup.close();
    if (viewId === 'office') {
      this._activeView = 'office';
      this._leftSidebar.setActive('office');
      this._modal.close();
      return;
    }

    // If the same panel is already open, close it (toggle).
    if (viewId === this._activeView && this._modal.visible) {
      this._navigate('office');
      return;
    }

    this._activeView = viewId;
    this._leftSidebar.setActive(viewId);

    const { width, height } = this.game.screen;
    let panel;
    if (viewId === 'projects') {
      panel = new ProjectsPanel(this.game);
    } else if (viewId === 'employees') {
      panel = new EmployeesPanel(this.game);
    } else if (viewId === 'hiring') {
      panel = new HiringPanel(this.game);
    } else if (viewId === 'assignment') {
      panel = new AssignmentPanel(this.game);
    } else if (viewId === 'research') {
      panel = new ResearchPanel(this.game);
    } else {
      return;
    }

    this._modal.open(PANEL_TITLES[viewId], panel, width, height);
    this.game.sound.play('ui_modal_open');
  }

  /** Called by Modal when it closes itself (X button or backdrop click). */
  _onModalClosed() {
    this._activeView = 'office';
    this._leftSidebar.setActive('office');
    // Restore schedule button highlight if popup is still open.
    if (this._schedulePopup.visible) this._leftSidebar.setActive('schedule');
  }

  // -----------------------------------------------------------------------
  // Office rendering
  // -----------------------------------------------------------------------

  _drawFloor(width, height) {
    this._floor.clear().rect(0, 0, width, height).fill({ color: FLOOR_COLOR });
  }

  _drawGrid(width, height) {
    this._grid.clear();
    const cols = Math.ceil(width / TILE) + 1;
    const rows = Math.ceil(height / TILE) + 1;
    for (let i = 0; i <= cols; i++) {
      const x = i * TILE;
      this._grid.moveTo(x, 0).lineTo(x, rows * TILE);
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * TILE;
      this._grid.moveTo(0, y).lineTo(cols * TILE, y);
    }
    this._grid.stroke({ color: GRID_COLOR, width: 1 });
  }

  _rebuildOffice() {
    // Destroy old entities.
    for (const d of this._desks) d.destroy();
    for (const e of this._employeeEntities) e.destroy();
    this._buyDeskEntity?.destroy();
    this._desks = [];
    this._employeeEntities = [];
    this._buyDeskEntity = null;

    const company = this.game.sim?.company;
    if (!company) return;

    const { desks } = company.office;
    const employees = company.employees;

    const cols = DESK_COLS;
    const offsetX = LEFT_SIDEBAR_WIDTH + 32;
    const offsetY = TOP_BAR_HEIGHT + 80;

    const deskPos = (i) => ({
      x: offsetX + (i % cols) * (DESK_W + DESK_PAD_X),
      y: offsetY + Math.floor(i / cols) * (DESK_H + DESK_PAD_Y + 30),
    });

    // Existing desks
    for (let i = 0; i < desks; i++) {
      const { x, y } = deskPos(i);
      const emp = employees[i] ?? null;
      const desk = new DeskEntity(x, y, emp !== null);
      this._desks.push(desk);
      this._world.addChild(desk.view);

      if (emp) {
        const ee = new EmployeeEntity(x + DESK_W / 2 - 24, y - 40, emp.name);
        const popupX = x + DESK_W + 10;
        ee.setOnClick(() => this._onEmployeeClick(emp, popupX, y - 20));
        this._employeeEntities.push(ee);
        this._world.addChild(ee.view);
      }
    }

    // Buy-desk slot — only shown when every existing desk is occupied.
    const hasEmptyDesk = employees.length < desks;
    const { x: bx, y: by } = deskPos(desks);
    const canAfford = company.money >= 1000;
    this._buyDeskEntity = new BuyDeskEntity(bx, by, canAfford, () => {
      this.game.sim.buyDesk();
    });
    this._buyDeskEntity.view.visible = !hasEmptyDesk;
    this._world.addChild(this._buyDeskEntity.view);
  }

  _positionDesks(width, height) {
    void width;
    void height;
  }

  /** Update the buy-desk slot visibility/affordability without rebuilding the whole office. */
  _refreshBuyDesk() {
    const company = this.game.sim?.company;
    if (!company || !this._buyDeskEntity) return;
    const canAfford = company.money >= 1000;
    const hasEmptyDesk = company.employees.length < company.office.desks;
    // Rebuild only when affordability changes (visibility is updated cheaply below).
    if (this._buyDeskEntity._canAfford !== canAfford) {
      this._rebuildOffice();
      return;
    }
    this._buyDeskEntity.view.visible = !hasEmptyDesk;
  }

  // -----------------------------------------------------------------------
  // End of day
  // -----------------------------------------------------------------------

  _onDayBegan() {
    this._prevSlot = -1;
    this._topBar.refresh();
    this._modal.refresh();
    this._statsPopup.close();
    this._weatherPopup.close();
    this._widgetBar.refresh(true);
  }

  // -----------------------------------------------------------------------
  // Toasts
  // -----------------------------------------------------------------------

  _spawnToast(message, type) {
    const toast = new Toast(message, type);
    this._toasts.push(toast);
    this._toastLayer.addChild(toast);
    this._repositionToasts(this.game.screen.width);
  }

  _tickToasts(dt) {
    for (const t of this._toasts) t.update(dt);

    const dismissed = this._toasts.filter((t) => t.dismissed);
    for (const t of dismissed) {
      this._toastLayer.removeChild(t);
      t.destroy();
    }
    this._toasts = this._toasts.filter((t) => !t.dismissed);
    if (dismissed.length > 0) {
      this._repositionToasts(this.game.screen.width);
    }
  }

  _repositionToasts(screenWidth) {
    const TOAST_W = 340;
    const GAP = 6;
    const RIGHT_MARGIN = RIGHT_SIDEBAR_WIDTH + 8;
    const startX = screenWidth - TOAST_W - RIGHT_MARGIN;
    let y = TOP_BAR_HEIGHT + 8;
    for (const t of this._toasts) {
      t.position.set(startX, y);
      y += 54 + GAP;
    }
  }

  // -----------------------------------------------------------------------
  // Scroll
  // -----------------------------------------------------------------------

  _handleWheel(e) {
    this._modal.handleWheel(e.deltaY);
  }
}
