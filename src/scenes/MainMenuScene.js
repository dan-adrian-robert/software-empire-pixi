/**
 * MainMenuScene
 *
 * Title screen. "New Game" resets the simulation and enters the OfficeScene.
 * Continue and Settings are stubbed (no save/load this build).
 */
import { Container, Graphics, Text } from 'pixi.js';

import { BaseScene } from './BaseScene.js';
import { Button } from '../ui/Button.js';
import { GameConfig } from '../config.js';

export class MainMenuScene extends BaseScene {
  constructor(game) {
    super(game);

    this._bg = new Graphics();
    this._content = new Container();
    this._content.label = 'menu-content';

    this._title = null;
    this._subtitle = null;
    this._version = null;
    this._buttons = [];
  }

  async preload() {}

  async enter() {
    this.root.addChild(this._bg);
    this.root.addChild(this._content);

    this._title = new Text({
      text: GameConfig.meta.name,
      style: {
        fill: 0xffffff,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 84,
        fontWeight: '800',
        letterSpacing: 2,
      },
    });
    this._title.anchor.set(0.5, 1);
    this._content.addChild(this._title);

    this._subtitle = new Text({
      text: 'Build your tech empire from the ground up',
      style: {
        fill: 0x7a86a3,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 22,
        fontStyle: 'italic',
      },
    });
    this._subtitle.anchor.set(0.5, 0);
    this._content.addChild(this._subtitle);

    const actions = [
      {
        label: 'New Game',
        handler: () => {
          this.game.sim.reset();
          this.game.scenes.changeTo(GameConfig.scenes.OFFICE);
        },
      },
      {
        label: 'Continue',
        handler: () => {
          // No save/load in this build.
          this.game.events.emit('notification:add', {
            text: 'No saved game found.',
            type: 'warning',
          });
        },
        disabled: true,
      },
      {
        label: 'Settings',
        handler: () => {},
        disabled: true,
      },
    ];

    for (const { label, handler, disabled } of actions) {
      const btn = new Button(label, handler, disabled ? { bg: 0x111622, textColor: 0x4a5a7a, border: 0x1a2336 } : {});
      if (disabled) btn.eventMode = 'none';
      this._content.addChild(btn);
      this._buttons.push(btn);
    }

    this._version = new Text({
      text: `v${GameConfig.meta.version}`,
      style: {
        fill: 0x3a4a6b,
        fontFamily: 'monospace',
        fontSize: 12,
      },
    });
    this._content.addChild(this._version);
  }

  resize(width, height) {
    if (!this._title) return;

    this._bg.clear().rect(0, 0, width, height).fill({ color: 0x0b0f1a });

    // Animated grid lines for the background.
    const gridColor = 0x0f172a;
    for (let i = 0; i < width; i += 80) {
      this._bg.moveTo(i, 0).lineTo(i, height);
    }
    for (let j = 0; j < height; j += 80) {
      this._bg.moveTo(0, j).lineTo(width, j);
    }
    this._bg.stroke({ color: gridColor, width: 1 });

    const cx = width / 2;

    this._title.position.set(cx, height * 0.35);
    this._subtitle.position.set(cx, height * 0.35 + 16);

    const buttonGap = 18;
    const buttonHeight = this._buttons[0]?.style.height ?? 64;
    const buttonWidth = this._buttons[0]?.style.width ?? 280;
    const startY = height * 0.5;

    this._buttons.forEach((btn, i) => {
      btn.position.set(cx - buttonWidth / 2, startY + i * (buttonHeight + buttonGap));
    });

    if (this._version) {
      this._version.position.set(width - 80, height - 24);
    }
  }

  update(_dt) {}

  async exit() {
    this._buttons.length = 0;
    this._title = null;
    this._subtitle = null;
    this._version = null;
  }
}
