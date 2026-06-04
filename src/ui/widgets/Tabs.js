/**
 * Tabs
 *
 * A horizontal tab row with an active underline indicator. The Tabs widget
 * owns only the tab labels and the active indicator — it does NOT manage
 * tab content panels. The parent screen listens to the `onChange` prop
 * callback (or the shared uiEvents bus) and swaps content.
 *
 * Props:
 *   tabs        {string[]}  ordered list of tab labels (required)
 *   active      {string}    currently active tab label
 *   onChange    {Function}  (tabLabel) => void — called on tab click
 *   width       {number}    total width; tabs distribute evenly if provided
 *   gap         {number}    spacing between tab labels (default Theme.spacing.lg)
 *   emit        {boolean}   if true, also emit 'tabChanged' on uiEvents (default false)
 *
 * The widget re-renders (no full rebuild) when active tab changes, which keeps
 * the indicator position in sync without recreating Text objects.
 */
import { Graphics, Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';
import { uiEvents } from '../foundation/Events.js';

export class Tabs extends Component {
  constructor(props = {}) {
    super({ gap: Theme.spacing.lg, emit: false, ...props });

    this._tabTexts = [];
    this._indicator = new Graphics();
    this.addChild(this._indicator);

    this.render();
  }

  render() {
    const { tabs = [], active, gap = Theme.spacing.lg, width, onChange, emit } = this.props;

    // Remove old tab labels
    for (const t of this._tabTexts) {
      if (t.parent) t.parent.removeChild(t);
    }
    this._tabTexts = [];

    let curX = 0;
    let maxH = 0;
    let activeX = 0;
    let activeW = 0;

    for (const tab of tabs) {
      const isActive = tab === active;
      const t = new Text({
        text: tab,
        style: {
          fill: isActive ? Theme.colors.primary : Theme.colors.textMuted,
          fontFamily: Theme.typography.fontFamily,
          fontSize: Theme.typography.sizes.md,
          fontWeight: isActive ? Theme.typography.weights.bold : Theme.typography.weights.regular,
        },
      });
      t.position.set(curX, 0);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointerup', () => {
        if (tab === this.props.active) return;
        this.setProps({ active: tab });
        if (onChange) onChange(tab);
        if (emit) uiEvents.emit('tabChanged', { tab });
      });
      this.addChild(t);
      this._tabTexts.push(t);

      if (isActive) {
        activeX = curX;
        activeW = t.width;
      }

      curX += t.width + gap;
      maxH = Math.max(maxH, t.height);
    }

    // Active indicator bar
    this._indicator.clear();
    if (activeW > 0) {
      this._indicator.rect(activeX, maxH + 2, activeW, 2).fill({ color: Theme.colors.primary });
    }

    this._measuredWidth = width ?? Math.max(0, curX - gap);
    this._measuredHeight = maxH + 4;
  }

  measure() {
    return { width: this._measuredWidth, height: this._measuredHeight };
  }
}
