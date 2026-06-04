/**
 * ProgressBar (framework version)
 *
 * A horizontal progress indicator with an optional text label above it.
 * Separate from the legacy src/ui/ProgressBar.js.
 *
 * Props:
 *   width        {number}  bar width in pixels (default 200)
 *   height       {number}  bar track height in pixels (default 6)
 *   value        {number}  progress 0–1 (default 0)
 *   fillColor    {number}  fill color (default Theme.colors.primary)
 *   trackColor   {number}  track background color (default Theme.colors.divider)
 *   radius       {number}  corner radius (default Theme.radius.sm)
 *   label        {string}  optional label shown above bar
 *   labelColor   {number}  label text color
 *   showValue    {boolean} append percentage text to label
 *
 * Use setState({ value }) to update without reconstructing.
 */
import { Graphics, Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

export class ProgressBar extends Component {
  constructor(props = {}) {
    super({
      width: 200,
      height: 6,
      value: 0,
      fillColor: Theme.colors.primary,
      trackColor: Theme.colors.divider,
      radius: Theme.radius.sm,
      ...props,
    });

    this._track = new Graphics();
    this._fill = new Graphics();

    this.addChild(this._track);
    this.addChild(this._fill);

    if (this.props.label !== undefined || this.props.showValue) {
      this._labelText = new Text({ text: '', style: {} });
      this.addChild(this._labelText);
    }

    this.render();
  }

  render() {
    const {
      width = 200,
      height = 6,
      value = 0,
      fillColor,
      trackColor,
      radius,
      label,
      labelColor,
      showValue,
    } = this.props;
    const clampedValue = Math.max(0, Math.min(1, value));

    // Track
    this._track
      .clear()
      .roundRect(0, 0, width, height, radius ?? Theme.radius.sm)
      .fill({ color: trackColor ?? Theme.colors.divider });

    // Fill
    this._fill.clear();
    const fillW = Math.max(0, Math.round(width * clampedValue));
    if (fillW > 0) {
      this._fill
        .roundRect(0, 0, fillW, height, radius ?? Theme.radius.sm)
        .fill({ color: fillColor ?? Theme.colors.primary });
    }

    // Optional label
    if (this._labelText) {
      const pct = Math.round(clampedValue * 100);
      const text =
        showValue && label ? `${label} ${pct}%` : showValue ? `${pct}%` : label ? label : '';
      this._labelText.text = text;
      this._labelText.style = {
        fill: labelColor ?? Theme.colors.textDim,
        fontFamily: Theme.typography.fontFamily,
        fontSize: Theme.typography.sizes.xs,
        fontWeight: Theme.typography.weights.regular,
      };
      this._labelText.position.set(0, -(this._labelText.height + 2));
    }

    const labelH = this._labelText ? this._labelText.height + 2 : 0;
    this._measuredWidth = width;
    this._measuredHeight = height + labelH;

    if (this._labelText) this._track.position.set(0, labelH);
    if (this._labelText) this._fill.position.set(0, labelH);
  }

  measure() {
    const { width = 200, height = 6 } = this.props;
    const labelH = this._labelText ? this._labelText.height + 2 : 0;
    return { width, height: height + labelH };
  }
}
