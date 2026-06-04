/**
 * Spacer
 *
 * An invisible component that occupies space in a Row or Column.
 *
 * Usage:
 *   // Fixed gap of 16px in the main axis:
 *   row.add(new Spacer({ size: 16 }));
 *
 *   // Flex spacer — absorbs all remaining space:
 *   row.add(new Spacer({ flex: 1 }));
 *   // Result: pushes subsequent siblings to the end of the row.
 *
 * Props:
 *   size   {number}  fixed width/height in the main axis (used when flex=0)
 *   flex   {0|1}     if 1, the parent Layout will allocate remaining space
 */
import { Component } from '../foundation/Component.js';

export class Spacer extends Component {
  constructor(props = {}) {
    super({ size: 0, ...props });
  }

  measure() {
    const s = this.props.size ?? 0;
    return { width: s, height: s };
  }
}
