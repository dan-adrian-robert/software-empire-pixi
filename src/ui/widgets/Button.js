/**
 * Button (framework version)
 *
 * Interactive button with hover/press/disabled visual states.
 * Completely separate from the legacy src/ui/Button.js — do not mix imports.
 *
 * Props:
 *   label       {string}   button text
 *   onClick     {Function} fired on confirmed pointer-up
 *   variant     {'primary'|'secondary'|'danger'|'ghost'}  visual preset
 *   width       {number}   explicit width (default 160)
 *   height      {number}   explicit height (default 36)
 *   disabled    {boolean}  suppresses click and dims appearance
 *   fontSize    {number}   override font size
 *
 * Variants:
 *   primary   — blue accent fill, used for main actions
 *   secondary — dark fill with border, used for auxiliary actions
 *   danger    — red fill, used for destructive actions
 *   ghost     — transparent fill, text only with subtle hover
 */
import { Graphics, Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

const VARIANT_STYLES = {
  primary: {
    bg: 0x1a3a6a,
    bgHover: 0x2a4a8a,
    bgPress: 0x0f2240,
    border: Theme.colors.primary,
    text: Theme.colors.textBright,
  },
  secondary: {
    bg: Theme.colors.bgCard,
    bgHover: 0x1a2a44,
    bgPress: 0x0d1526,
    border: Theme.colors.border,
    text: Theme.colors.textDim,
  },
  success: {
    bg: 0x0a1f10,
    bgHover: 0x163020,
    bgPress: 0x061308,
    border: Theme.colors.success,
    text: Theme.colors.success,
  },
  warning: {
    bg: 0x1e1400,
    bgHover: 0x2e1e00,
    bgPress: 0x140e00,
    border: Theme.colors.salary,
    text: Theme.colors.salary,
  },
  danger: {
    bg: 0x3a1010,
    bgHover: 0x5a1a1a,
    bgPress: 0x280a0a,
    border: Theme.colors.danger,
    text: Theme.colors.dangerLight,
  },
  ghost: {
    bg: 0x00000000,
    bgHover: 0x1a2a44,
    bgPress: 0x0d1526,
    border: 0x00000000,
    text: Theme.colors.textDim,
  },
};

export class Button extends Component {
  constructor(props = {}) {
    super({
      label: '',
      variant: 'secondary',
      width: 160,
      height: 36,
      ...props,
    });

    this._bg = new Graphics();
    this._label = new Text({ text: '', style: {} });

    this.addChild(this._bg);
    this.addChild(this._label);

    this._hover = false;
    this._pressed = false;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      this._hover = true;
      this._redrawBg();
    });
    this.on('pointerout', () => {
      this._hover = false;
      this._pressed = false;
      this._redrawBg();
    });
    this.on('pointerdown', () => {
      this._pressed = true;
      this._redrawBg();
    });
    this.on('pointerup', () => {
      const wasPressed = this._pressed;
      this._pressed = false;
      this._redrawBg();
      if (wasPressed && !this.props.disabled && this.props.onClick) {
        this.props.onClick();
      }
    });
    this.on('pointerupoutside', () => {
      this._pressed = false;
      this._redrawBg();
    });

    this.render();
  }

  render() {
    const { width, height, label, variant = 'secondary', disabled, fontSize } = this.props;
    const vs = VARIANT_STYLES[variant] ?? VARIANT_STYLES.secondary;

    this._label.text = String(label ?? '');
    this._label.style = {
      fill: disabled ? Theme.colors.textMuted : vs.text,
      fontFamily: Theme.typography.fontFamily,
      fontSize: fontSize ?? Theme.typography.sizes.md,
      fontWeight: Theme.typography.weights.semibold,
      align: 'center',
    };
    this._label.anchor.set(0.5, 0.5);
    this._label.position.set(Math.round(width / 2), Math.round(height / 2));

    this.alpha = disabled ? 0.5 : 1;
    this.cursor = disabled ? 'default' : 'pointer';

    this._redrawBg();

    this._measuredWidth = width;
    this._measuredHeight = height;
  }

  _redrawBg() {
    const { width, height, variant = 'secondary', disabled } = this.props;
    const vs = VARIANT_STYLES[variant] ?? VARIANT_STYLES.secondary;
    const fill = disabled ? vs.bg : this._pressed ? vs.bgPress : this._hover ? vs.bgHover : vs.bg;

    this._bg
      .clear()
      .roundRect(0, 0, width, height, Theme.radius.md)
      .fill({ color: fill })
      .stroke({ color: vs.border, width: 1 });
  }

  measure() {
    return { width: this.props.width ?? 0, height: this.props.height ?? 0 };
  }
}
