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

import { TopBarHUD, TOP_BAR_HEIGHT } from '../ui/TopBarHUD.js';
import { LeftSidebar, LEFT_SIDEBAR_WIDTH } from '../ui/LeftSidebar.js';
import { RightWidgetBar, RIGHT_SIDEBAR_WIDTH } from '../ui/RightWidgetBar.js';
import { ModalHost } from '../ui/screens/ModalHost.js';
import { EmployeeStatsPopup } from '../ui/EmployeeStatsPopup.js';
import { SchedulePopup } from '../ui/SchedulePopup.js';
import { WeatherPopup } from '../ui/WeatherPopup.js';
import { DayReportPopup } from '../ui/DayReportPopup.js';
import { SaveSlotPopup } from '../ui/SaveSlotPopup.js';
import { TeamInfoPopup } from '../ui/TeamInfoPopup.js';
import { Toast } from '../ui/Toast.js';
import { BuildOverlay } from '../ui/BuildOverlay.js';
import { BuildPanel } from '../ui/BuildPanel.js';
import { BuildToggleButton } from '../ui/BuildToggleButton.js';

import { ProjectsPanel } from '../ui/panels/ProjectsPanel.js';
import { EmployeesPanel } from '../ui/panels/EmployeesPanel.js';
import { HiringPanel } from '../ui/panels/HiringPanel.js';
import { ResearchPanel } from '../ui/panels/ResearchPanel.js';
import { AssignmentPanel } from '../ui/panels/AssignmentPanel.js';
import { TeamsPanel } from '../ui/panels/TeamsPanel.js';

import { DeskEntity, DESK_W, DESK_H } from '../entities/DeskEntity.js';
import { EmployeeEntity } from '../entities/EmployeeEntity.js';
import { FurnitureEntity } from '../entities/FurnitureEntity.js';
import { isProgrammer } from '../state/Employee.js';
import { getFurnitureType } from '../data/furnitureTypes.js';
import { GameConfig } from '../config.js';

const TILE = 64;
const FLOOR_COLOR = 0x0f172a;
const GRID_COLOR  = 0x141e35;

const PANEL_TITLES = {
  projects: 'Projects',
  employees: 'Staff',
  hiring: 'Hiring',
  assignment: 'Project Assignments',
  research: 'Research Tree',
  teams: 'Teams',
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

    // HUD widgets.
    this._topBar = new TopBarHUD(game);
    this._leftSidebar = new LeftSidebar(
      (id) => this._navigate(id),
      ()   => this._openSaveNamePopup(),
    );
    this._widgetBar = new RightWidgetBar(game);

    // Modal popup (shared, reused for all panel types).
    this._modal = new ModalHost(() => this._onModalClosed());

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

    // Team info popup — opened from a team row click in TeamsPanel.
    this._teamInfoPopup = new TeamInfoPopup(this.game);

    // Build mode.
    this._buildOverlay    = new BuildOverlay();
    this._buildPanel      = new BuildPanel();
    this._buildToggleBtn  = new BuildToggleButton();
    this._buildMode       = false;
    /** @type {{ typeId: string, ghost: Container, type: object } | null} */
    this._buildDrag       = null;
    /** @type {FurnitureEntity[]} */
    this._furnitureEntities = [];

    // Bound drag handlers (stored for removal).
    this._onBuildPointerMove = (e) => this._handleBuildDragMove(e);
    this._onBuildPointerUp   = (e) => this._handleBuildDragDrop(e);

    // Active nav view id ('office' | 'projects' | 'employees' | 'hiring').
    this._activeView = 'office';

    // Toasts.
    /** @type {Toast[]} */
    this._toasts = [];

    // HUD refresh accumulator.
    this._hudRefreshAcc = 0;


    // Last dimensions used for layout — used to detect stale layout.
    this._layoutWidth = 0;
    this._layoutHeight = 0;
  }

  async preload() {
    await this.game.assets.loadBundle('office');
  }

  async enter() {
    this.root.addChild(this._world);
    this._world.addChild(this._floor);
    this._world.addChild(this._grid);
    // Build overlay sits above floor/grid but below desk entities.
    this._world.addChild(this._buildOverlay);

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
    // TeamInfoPopup added after the modal so it renders on top of it.
    this._modalLayer.addChild(this._teamInfoPopup);

    this.root.addChild(this._hudLayer);
    this.root.addChild(this._toastLayer);

    // HUD.
    this._hudLayer.addChild(this._topBar);
    this._hudLayer.addChild(this._leftSidebar);
    this._hudLayer.addChild(this._widgetBar);

    // Build UI — floating over HUD layer.
    this._hudLayer.addChild(this._buildToggleBtn);
    this._hudLayer.addChild(this._buildPanel);

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
    this.listen('desk:placed',   () => this._rebuildOffice());
    this.listen('desk:removed',  () => this._rebuildOffice());
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
    this.listen('project:pool_refreshed', () => {
      if (this._activeView === 'projects') this._modal.refresh();
      this._widgetBar.refresh(true);
    });
    this.listen('hiring:pool_refreshed', () => {
      if (this._activeView === 'hiring') this._modal.refresh();
      this._widgetBar.refresh(true);
    });
    this.listen('employee:levelup', ({ employee }) => {
      if (this._statsPopup?.currentEmp?.id === employee.id) {
        this._statsPopup.refresh(this.game.sim?.company);
      }
      if (this._activeView === 'staff') this._modal.refresh();
    });
    this.listen('notification:add', ({ text, type, silent, suppress }) => {
      if (!silent && !suppress) this._spawnToast(text, type);
      this._widgetBar.refresh(true);
    });
    this.listen('research:unlocked', () => {
      if (this._activeView === 'research') this._modal.refresh();
      this._topBar.refresh();
    });
    this.listen('team:open-detail', (teamId) => {
      const company = this.game.sim?.company;
      if (!company) return;
      const team = company.teams.find((t) => t.id === teamId);
      if (!team) return;
      const { width, height } = this.game.screen;
      this._teamInfoPopup.open(team, company, width, height);
    });
    this.listen('day:report', (snapshot) => {
      const { width, height } = this.game.screen;
      this._dayReportPopup.open(snapshot, width, height);
    });
    this.listen('simulation:reset', () => {
      this._rebuildOffice();
      this._rebuildFurniture();
      this._navigate('office');
      // Restore Teams nav button if already researched in the loaded save.
      const company = this.game.sim?.company;
      if (company?.unlockedResearch?.includes('team_management')) {
        this._leftSidebar.addNavItem({ id: 'teams', emoji: '👥', label: 'Teams' });
      }
      // Restore Schedule nav button if already researched in the loaded save.
      if (company?.unlockedResearch?.includes(GameConfig.schedule.researchNodeId)) {
        this._leftSidebar.addNavItem({ id: 'schedule', emoji: '🕐', label: 'Schedule' });
      }
    });

    // Unlock Teams nav button when team_management is researched.
    // Unlock Schedule nav button when work_schedule is researched.
    this.listen('research:unlocked', ({ nodeId }) => {
      if (nodeId === 'team_management') {
        this._leftSidebar.addNavItem({ id: 'teams', emoji: '👥', label: 'Teams' });
      }
      if (nodeId === GameConfig.schedule.researchNodeId) {
        this._leftSidebar.addNavItem({ id: 'schedule', emoji: '🕐', label: 'Schedule' });
      }
    });

    // Build panel drag start → scene handles the drag.
    this._buildPanel.setOnDragStart((typeId, e) => this._onBuildDragStart(typeId, e));

    // Toggle button.
    this._buildToggleBtn.setOnToggle(() => {
      if (this._buildMode) this._exitBuildMode();
      else this._enterBuildMode();
    });
  }

  update(dt) {
    // Safety net: re-layout if the canvas size has changed since the last
    // resize() call (guards against race conditions between Pixi's renderer
    // resize and our own _onResize handler).
    const { width: sw, height: sh } = this.game.screen;
    if (Math.abs(sw - this._layoutWidth) > 1 || Math.abs(sh - this._layoutHeight) > 1) {
      this.resize(sw, sh);
    }

    // Keep speed-button highlight in sync with current game speed.
    this._topBar.update();

    // Entities.
    const company = this.game.sim?.company;
    if (company) {
      const speed = this.game.sim.time.gameSpeed;
      const working = speed > 0;

      // Advance the 15-minute slot cycle; handlers fire on slot transitions.
      const { dayProgress } = this.game.sim.time;
      const { flushTotals } = this.game.sim.schedule.tick(company, dayProgress, this.game.sim);

      // Show floating "+pts" labels when WORK period SP were flushed.
      if (flushTotals) {
        flushTotals.forEach((pts, empIdx) => {
          if (pts > 0) this._employeeEntities[empIdx]?.showPoints(pts);
        });
      }

      this._employeeEntities.forEach((ee, idx) => {
        const emp = company.employees[idx];
        if (!emp) return;
        const state = working
          ? emp.activeProjectId !== null
            ? 'typing'
            : 'idle'
          : 'idle';
        ee.setState(state);
        ee.setHasProject(!isProgrammer(emp) || emp.pinnedProjectId !== null);
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
      // Modal panels refresh via _onDayBegan and event listeners; polling
      // here would destroy buttons mid-click (pointerdown → rebuild → pointerup miss).
      this._statsPopup.refresh(this.game.sim?.company);
      this._schedulePopup.refresh(this.game.sim?.company);
      this._weatherPopup.refresh(this.game.sim?.company);
    }

    // Toasts.
    this._tickToasts(dt);
  }

  resize(width, height) {
    this._drawFloor(width, height);
    this._drawGrid(width, height);

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

    this._buildOverlay.resize(width, height);
    this._buildPanel.resize(width, height);
    this._buildToggleBtn.resize(width, height);

    // First-time initialisation guard.
    if (!this._initialized) {
      this._topBar.init(width);
      this._topBar.setWeatherClickHandler((ax, ay) => this._toggleWeatherPopup(ax, ay));
      this._leftSidebar.init(height);
      this._widgetBar.init(width, height);
      this._buildToggleBtn.init(width, height);
      this._buildPanel.init(width, height);
      this._initialized = true;
      this._rebuildOffice();
      this._rebuildFurniture();
    }

    this._layoutWidth = width;
    this._layoutHeight = height;
  }

  async exit() {
    if (this._onWheel) {
      this.game.app.canvas.removeEventListener('wheel', this._onWheel);
      this._onWheel = null;
    }
    this._exitBuildMode();
    this._desks = [];
    this._employeeEntities = [];
    this._furnitureEntities = [];
    this._toasts = [];
    this._initialized = false;
    this._activeView = 'office';
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
    if (this._buildMode) return;
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
    const company = this.game.sim?.company;
    if (!company?.unlockedResearch?.includes(GameConfig.schedule.researchNodeId)) return;
    const { width, height } = this.game.screen;
    if (this._schedulePopup.visible) {
      this._closeSchedulePopup();
    } else {
      this._schedulePopup.open(company, width, height);
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
    } else if (viewId === 'teams') {
      panel = new TeamsPanel(this.game);
    } else {
      return;
    }

    this._modal.open(
      PANEL_TITLES[viewId],
      panel,
      width,
      height,
      viewId === 'hiring' ? { layout: 'hiring' } : undefined,
    );
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
    this._desks = [];
    this._employeeEntities = [];

    const company = this.game.sim?.company;
    if (!company) return;

    const deskTiles = company.office.deskTiles ?? [];
    const employees = company.employees;

    for (let i = 0; i < deskTiles.length; i++) {
      const { tileX, tileY } = deskTiles[i];
      const { px, py } = this._tileToPixel(tileX, tileY);
      const emp = employees[i] ?? null;

      const desk = new DeskEntity(emp !== null);
      desk.view.position.set(px, py);

      // Build-mode: make desk draggable / deletable via the same mechanism as FurnitureEntity
      // We store tile coords on the view so _onFurnitureDragStart can use them.
      desk.view._deskTileX = tileX;
      desk.view._deskTileY = tileY;
      desk.view._isDeskEntity = true;

      this._desks.push(desk);
      this._world.addChild(desk.view);

      if (emp) {
        // Sprite center = entity_y + 21.5 (spriteH≈77, anchor bottom at local y=60)
        // Monitor center = py+74 (MON_Y=38, MON_H=72) → entity_y = py+52
        const ee = new EmployeeEntity(px + DESK_W / 2 - 32, py + 20, emp.name, emp.characterIndex);
        const popupX = px + DESK_W + 10;
        ee.setOnClick(() => this._onEmployeeClick(emp, popupX, py - 20));
        this._employeeEntities.push(ee);
        this._world.addChild(ee.view);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Build mode
  // -----------------------------------------------------------------------

  _enterBuildMode() {
    this._buildMode = true;
    // Close any open popups so they don't linger during build mode.
    this._closeStatsPopup();
    this._closeSchedulePopup();
    this._weatherPopup.close();
    // Swap right sidebar: hide widgets, show build panel in its place.
    this._widgetBar.visible = false;
    this._buildOverlay.show();
    this._buildPanel.show();
    this._buildToggleBtn.setActive(true);
    // Make existing furniture interactive.
    for (const fe of this._furnitureEntities) fe.setBuildMode(true);
    // Make desk tiles interactive: show a ✕ button to remove, drag to move.
    this._attachDeskBuildHandlers();
    // Prevent world click from closing popups while in build mode.
    this._world.off('pointerdown');
  }

  _exitBuildMode() {
    this._buildMode = false;
    this._buildDragCancel();
    this._buildOverlay.hide();
    this._buildPanel.hide();
    // Restore the normal right sidebar.
    this._widgetBar.visible = true;
    this._buildToggleBtn.setActive(false);
    // Restore furniture to decorative.
    for (const fe of this._furnitureEntities) fe.setBuildMode(false);
    // Remove desk build-mode overlays.
    this._detachDeskBuildHandlers();
    // Re-attach world background click handler.
    this._world.removeAllListeners();
    this._world.on('pointerdown', () => {
      this._closeStatsPopup();
      this._closeSchedulePopup();
      this._weatherPopup.close();
    });
  }

  /** Attach interactive delete/drag overlays to each DeskEntity when in build mode. */
  _attachDeskBuildHandlers() {
    const company = this.game.sim?.company;
    if (!company) return;
    const deskTiles = company.office.deskTiles ?? [];
    for (let i = 0; i < this._desks.length; i++) {
      const desk = this._desks[i];
      const { tileX, tileY } = deskTiles[i] ?? {};
      const isOccupied = !!(company.employees[i]);
      desk.view.eventMode = 'static';
      desk.view.cursor = 'grab';
      // Drag-to-move: pointerdown on the desk body starts a move drag.
      const srcTileX = tileX;
      const srcTileY = tileY;
      desk.view.on('pointerdown', (ev) => {
        ev.stopPropagation();
        this._onDeskDragStart(srcTileX, srcTileY, ev);
      });
      // ✕ delete button overlay.
      this._addDeskDeleteButton(desk, tileX, tileY, isOccupied);
    }
  }

  /**
   * Start a move-drag for an existing desk tile.
   * Stores the source tile in _buildDrag so _handleBuildDragDrop routes to moveDeskAtTile.
   * @param {number} srcTileX
   * @param {number} srcTileY
   * @param {PointerEvent} e
   */
  _onDeskDragStart(srcTileX, srcTileY, e) {
    if (this._buildDrag) this._buildDragCancel();
    const type = getFurnitureType('desk');
    const ghost = this._makeDragGhost(type);
    this.root.addChild(ghost);

    this._buildDrag = { typeId: 'desk', type, ghost, moveSrcTileX: srcTileX, moveSrcTileY: srcTileY };

    this.game.app.canvas.addEventListener('pointermove', this._onBuildPointerMove);
    this.game.app.canvas.addEventListener('pointerup',   this._onBuildPointerUp);

    this._moveDragGhost(e.clientX, e.clientY);
  }

  _detachDeskBuildHandlers() {
    for (const desk of this._desks) {
      desk.view.eventMode = 'none';
      desk.view.cursor = 'default';
      desk.view.removeAllListeners('pointerdown');
      if (desk.view._buildDeleteBtn) {
        desk.view._buildDeleteBtn.destroy({ children: true });
        desk.view._buildDeleteBtn = null;
      }
    }
  }

  _addDeskDeleteButton(desk, tileX, tileY, isOccupied) {
    const SIZE = 22;
    const BX   = DESK_W - SIZE - 4;
    const BY   = 4;

    const btn = new Graphics();
    btn
      .roundRect(BX, BY, SIZE, SIZE, 5)
      .fill({ color: isOccupied ? 0x555555 : 0xdc2626 })
      .stroke({ color: 0xffffff, width: 1.5 })
      .moveTo(BX + 6, BY + 6)
      .lineTo(BX + SIZE - 6, BY + SIZE - 6)
      .stroke({ color: 0xffffff, width: 2 })
      .moveTo(BX + SIZE - 6, BY + 6)
      .lineTo(BX + 6, BY + SIZE - 6)
      .stroke({ color: 0xffffff, width: 2 });

    btn.eventMode = 'static';
    btn.cursor = isOccupied ? 'not-allowed' : 'pointer';
    btn.hitArea = { contains: (x, y) => x >= BX && x <= BX + SIZE && y >= BY && y <= BY + SIZE };

    btn.on('pointerdown', (ev) => {
      ev.stopPropagation();
      if (isOccupied) {
        this.game.events.emit('notification:add', { text: 'Cannot remove a desk with an employee seated.', type: 'warning' });
        return;
      }
      this.game.sim.removeDeskAtTile(tileX, tileY);
      this._rebuildOffice();
      this._attachDeskBuildHandlers();
    });

    desk.view.addChild(btn);
    desk.view._buildDeleteBtn = btn;
  }

  /**
   * Called by BuildPanel when the player starts dragging a furniture card.
   * @param {string} typeId
   * @param {PointerEvent} e
   */
  _onBuildDragStart(typeId, e) {
    if (this._buildDrag) this._buildDragCancel();

    const type = getFurnitureType(typeId);
    const ghost = this._makeDragGhost(type);
    this.root.addChild(ghost);

    this._buildDrag = { typeId, type, ghost };

    this.game.app.canvas.addEventListener('pointermove', this._onBuildPointerMove);
    this.game.app.canvas.addEventListener('pointerup',   this._onBuildPointerUp);

    // Position ghost immediately at cursor.
    this._moveDragGhost(e.clientX, e.clientY);
  }

  _handleBuildDragMove(e) {
    if (!this._buildDrag) return;
    this._moveDragGhost(e.clientX, e.clientY);

    const { tileX, tileY } = this._screenToTile(e.clientX, e.clientY);
    const { type, moveSrcTileX, moveSrcTileY } = this._buildDrag;
    const excludeDeskTile = moveSrcTileX !== undefined
      ? { tileX: moveSrcTileX, tileY: moveSrcTileY }
      : null;
    const valid = this._isTileValid(tileX, tileY, type.w, type.h, null, excludeDeskTile);
    this._buildOverlay.setHoverTile(tileX, tileY, type.w, type.h, valid);
  }

  _handleBuildDragDrop(e) {
    if (!this._buildDrag) return;
    const { typeId, type, moveSrcTileX, moveSrcTileY } = this._buildDrag;
    const { tileX, tileY } = this._screenToTile(e.clientX, e.clientY);

    const excludeDeskTile = moveSrcTileX !== undefined
      ? { tileX: moveSrcTileX, tileY: moveSrcTileY }
      : null;

    if (this._isTileValid(tileX, tileY, type.w, type.h, null, excludeDeskTile)) {
      if (typeId === 'desk') {
        if (moveSrcTileX !== undefined) {
          this.game.sim.moveDeskAtTile(moveSrcTileX, moveSrcTileY, tileX, tileY);
        } else {
          this.game.sim.placeDeskAtTile(tileX, tileY);
        }
        this._rebuildOffice();
        if (this._buildMode) this._attachDeskBuildHandlers();
      } else {
        this.game.sim.placeFurniture(typeId, tileX, tileY);
        this._rebuildFurniture();
      }
    }

    this._buildDragCancel();
  }

  _buildDragCancel() {
    if (!this._buildDrag) return;
    this._buildDrag.ghost.destroy({ children: true });
    this._buildDrag = null;
    this._buildOverlay.setHoverTile(null, null);
    this.game.app.canvas.removeEventListener('pointermove', this._onBuildPointerMove);
    this.game.app.canvas.removeEventListener('pointerup',   this._onBuildPointerUp);
  }

  /** Rebuild all FurnitureEntity views from company.furniture[]. */
  _rebuildFurniture() {
    for (const fe of this._furnitureEntities) fe.destroy();
    this._furnitureEntities = [];

    const company = this.game.sim?.company;
    if (!company) return;

    for (const item of (company.furniture ?? [])) {
      const fe = new FurnitureEntity(
        item,
        (it) => {
          this.game.sim.removeFurniture(it.id);
          this._rebuildFurniture();
        },
        (it, ev) => this._onFurnitureDragStart(it, ev),
      );
      const { px, py } = this._tileToPixel(item.tileX, item.tileY);
      fe.setPosition(px, py);
      if (this._buildMode) fe.setBuildMode(true);
      this._world.addChild(fe.view);
      this._furnitureEntities.push(fe);
    }
  }

  /**
   * Move-drag for already-placed furniture: remove from state, then start a
   * new drag that will re-place it on drop.
   */
  _onFurnitureDragStart(item, e) {
    const { typeId } = item;
    this.game.sim.removeFurniture(item.id);
    this._rebuildFurniture();
    this._onBuildDragStart(typeId, e);
  }

  // -----------------------------------------------------------------------
  // Build mode helpers
  // -----------------------------------------------------------------------

  /** Convert a screen pixel (from PointerEvent) to tile coordinates. */
  _screenToTile(screenX, screenY) {
    const rect   = this.game.app.canvas.getBoundingClientRect();
    const scaleX = this.game.screen.width  / rect.width;
    const scaleY = this.game.screen.height / rect.height;
    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top)  * scaleY;
    return {
      tileX: Math.floor((canvasX - LEFT_SIDEBAR_WIDTH) / TILE),
      tileY: Math.floor((canvasY - TOP_BAR_HEIGHT)     / TILE),
    };
  }

  /** Convert tile coords to top-left canvas pixel position. */
  _tileToPixel(tileX, tileY) {
    return {
      px: LEFT_SIDEBAR_WIDTH + tileX * TILE,
      py: TOP_BAR_HEIGHT     + tileY * TILE,
    };
  }

  /**
   * Returns true if the tile region is within the floor and not occupied by
   * a desk or another furniture item.
   * @param {number} tileX
   * @param {number} tileY
   * @param {number} w  Width in tiles.
   * @param {number} h  Height in tiles.
   * @param {number|null} excludeId  Furniture id to ignore (used when moving).
   */
  /**
   * @param {number} tileX
   * @param {number} tileY
   * @param {number} w
   * @param {number} h
   * @param {number|null} excludeId  Furniture id to ignore (used when moving furniture).
   * @param {{ tileX: number, tileY: number }|null} excludeDeskTile  Desk tile to ignore (used when moving a desk).
   */
  _isTileValid(tileX, tileY, w, h, excludeId, excludeDeskTile = null) {
    const floorTilesW = Math.floor((this._layoutWidth  - LEFT_SIDEBAR_WIDTH) / TILE);
    const floorTilesH = Math.floor((this._layoutHeight - TOP_BAR_HEIGHT)     / TILE);

    // Must be within floor bounds.
    if (tileX < 0 || tileY < 0 || tileX + w > floorTilesW || tileY + h > floorTilesH) return false;

    const company = this.game.sim?.company;
    if (!company) return true;

    // Check overlap with desks (each desk is exactly 2×2 tiles).
    for (const dt of (company.office.deskTiles ?? [])) {
      if (excludeDeskTile && dt.tileX === excludeDeskTile.tileX && dt.tileY === excludeDeskTile.tileY) continue;
      if (this._tilesOverlap(tileX, tileY, w, h, dt.tileX, dt.tileY, 2, 2)) return false;
    }

    // Check overlap with other furniture.
    for (const it of company.furniture) {
      if (it.id === excludeId) continue;
      const ft = getFurnitureType(it.typeId);
      if (this._tilesOverlap(tileX, tileY, w, h, it.tileX, it.tileY, ft.w, ft.h)) return false;
    }

    return true;
  }

  _tilesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /** Move drag ghost to follow cursor (canvas-relative pixel position). */
  _moveDragGhost(screenX, screenY) {
    if (!this._buildDrag) return;
    const rect   = this.game.app.canvas.getBoundingClientRect();
    const scaleX = this.game.screen.width  / rect.width;
    const scaleY = this.game.screen.height / rect.height;
    const cx = (screenX - rect.left) * scaleX;
    const cy = (screenY - rect.top)  * scaleY;
    const { type } = this._buildDrag;
    this._buildDrag.ghost.position.set(
      cx - (type.w * TILE) / 2,
      cy - (type.h * TILE) / 2,
    );
  }

  /** Create a semi-transparent ghost container for the item being dragged. */
  _makeDragGhost(type) {
    const ghost = new Container();
    ghost.alpha = 0.65;
    ghost.eventMode = 'none';

    const pw = type.w * TILE;
    const ph = type.h * TILE;

    const g = new Graphics()
      .roundRect(2, 2, pw - 4, ph - 4, 6)
      .fill({ color: type.color, alpha: 0.7 })
      .stroke({ color: type.color, width: 2, alpha: 0.9 });
    ghost.addChild(g);

    return ghost;
  }

  // -----------------------------------------------------------------------
  // End of day
  // -----------------------------------------------------------------------

  _onDayBegan() {
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
    this._modal.handleWheel(e.deltaY, e.deltaX, e.shiftKey);
  }
}
