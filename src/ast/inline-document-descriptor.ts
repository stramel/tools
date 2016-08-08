/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ASTNode} from 'parse5';
import {ElementLocationInfo, LocationInfo} from 'parse5';
import * as util from 'util';

import {SourceLocation} from '../elements-format';

import {Descriptor} from './descriptor';

export interface LocationOffset {
  /** Zero based line index. */
  line: number;
  /** Zero based column index. */
  col: number;
  /**
   * The url of the source file.
   */
  filename?: string;
}

/**
 * Represents an inline document, usually a <script> or <style> tag in an HTML
 * document.
 *
 * @template N The AST node type
 */
export class InlineDocumentDescriptor<N> implements Descriptor {
  type: 'html'|'javascript'|'css'|/* etc */ string;

  contents: string;

  /** The location offset of this document within the containing document. */
  locationOffset: LocationOffset;
  attachedComment?: string;

  /**
   * The AST node associated with this descriptor. This is required for correct
   * ordering of descriptors generated by different finders.
   */
  node: N;

  constructor(
      type: string, contents: string, node: N, locationOffset: LocationOffset,
      attachedComment: string) {
    this.type = type;
    this.contents = contents;
    this.node = node;
    this.locationOffset = locationOffset;
    this.attachedComment = attachedComment;
  }
}

export function correctSourceLocation(
    sourceLocation: SourceLocation,
    locationOffset?: LocationOffset): SourceLocation|undefined {
  if (!locationOffset || !sourceLocation) {
    return sourceLocation;
  }
  const result: SourceLocation = {
    line: sourceLocation.line + locationOffset.line,
    // The location offset column only matters for the first line.
    column: sourceLocation.column +
        (sourceLocation.line === 0 ? locationOffset.col : 0),
  };
  if (locationOffset.filename != null || sourceLocation.file != null) {
    result.file = locationOffset.filename || sourceLocation.file;
  }
  return result;
}

export function getAttachedCommentText(node: ASTNode): string|undefined {
  let ancestor = node.parentNode;
  let current = node;
  let previousNodeIndex: number;
  while (true) {
    previousNodeIndex = ancestor.childNodes.indexOf(current) - 1;
    if (previousNodeIndex < 0) {
      if (ancestor.__location == null) {
        // ancestor is a virtual node, keep looking up for our previous node.
        ancestor = ancestor.parentNode;
        current = current.parentNode;
        if (ancestor == null) {
          return;  // We reached the top and never found anything, stop.
        }
        continue;
      }
      return;  // There is none, just stop
    }
    break;
  }
  const previousNode = ancestor.childNodes[previousNodeIndex];
  if (previousNode.nodeName === '#comment') {
    return previousNode['data'].trim();
  }
}

function isLocationInfo(loc: (LocationInfo | ElementLocationInfo)):
    loc is LocationInfo {
  return 'line' in loc;
}

export function getLocationOffsetOfStartOfTextContent(node: ASTNode):
    LocationOffset {
  let firstChildNodeWithLocation = node.childNodes.find(n => !!n.__location);
  let bestLocation = firstChildNodeWithLocation ?
      firstChildNodeWithLocation.__location :
      node.__location;
  if (!bestLocation) {
    throw new Error(
        `Couldn't extract a location offset from HTML node: ` +
        `${util.inspect(node)}`);
  }
  if (isLocationInfo(bestLocation)) {
    return {line: bestLocation.line - 1, col: bestLocation.col};
  } else {
    return {
      line: bestLocation.startTag.line - 1,
      col: bestLocation.startTag.endOffset,
    };
  }
}
