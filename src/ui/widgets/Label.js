/**
 * Label
 *
 * Text widget with semantic variants derived from Theme.typography.variants.
 * Wraps a Pixi Text node and exposes it via setProps/setState.
 *
 * Props:
 *   text     {string}   text content
 *   variant  {'hero'|'title'|'subtitle'|'body'|'label'|'caption'|'muted'|'sectionHeader'}
 *            semantic style preset (default 'body')
 *   color    {number}   override color for this instance
 *   fontSize {number}   override font size for this instance
 *   fontWeight {string} override weight for this instance
 *   align    {'left'|'center'|'right'}  text alignment (default 'left')
 *   wordWrap {boolean}  enable word wrapping
 *   wordWrapWidth {number}  wrap width in pixels
 *   width    {number}   if set, label reports this as measured width
 */
import { Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

export class Label extends Component {
  constructor(props = {}) {
    super({ variant: 'body', ...props });

    this._text = new Text({ text: '', style: {} });
    this.addChild(this._text);

    this.render();
  }

  render() {
    const {
      text = '',
      variant = 'body',
      color,
      fontSize,
      fontWeight,
      align,
      wordWrap,
      wordWrapWidth,
    } = this.props;
    const tv = Theme.typography.variants[variant] ?? Theme.typography.variants.body;

    this._text.text = String(text);
    this._text.style = {
      fill: color ?? tv.color,
      fontFamily: Theme.typography.fontFamily,
      fontSize: fontSize ?? tv.size,
      fontWeight: fontWeight ?? tv.weight,
      align: align ?? 'left',
      wordWrap: wordWrap ?? false,
      wordWrapWidth: wordWrapWidth ?? 0,
    };
    this._text.dirty = true;

    // Update measured size from the Pixi text's intrinsic bounds
    this._measuredWidth = this.props.width ?? this._text.width;
    this._measuredHeight = this.props.height ?? this._text.height;
  }

  measure() {
    return {
      width: this.props.width ?? this._text.width,
      height: this.props.height ?? this._text.height,
    };
  }
}
