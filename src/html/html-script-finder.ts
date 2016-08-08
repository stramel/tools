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

import * as dom5 from 'dom5';
import {ASTNode, ElementLocationInfo, LocationInfo} from 'parse5';
import {resolve as resolveUrl} from 'url';
import * as util from 'util';

import {Descriptor, ImportDescriptor, InlineDocumentDescriptor,getLocationOffsetOfStartOfTextContent,  LocationOffset, getAttachedCommentText} from '../ast/ast';

import {HtmlDocument, HtmlVisitor} from './html-document';
import {HtmlEntityFinder} from './html-entity-finder';

const p = dom5.predicates;

const isJsScriptNode = p.AND(
    p.hasTagName('script'),
    p.OR(
        p.NOT(p.hasAttr('type')), p.hasAttrValue('type', 'text/javascript'),
        p.hasAttrValue('type', 'application/javascript'),
        p.hasAttrValue('type', 'module')));

export class HtmlScriptFinder implements HtmlEntityFinder {
  async findEntities(
      document: HtmlDocument,
      visit: (visitor: HtmlVisitor) => Promise<void>): Promise<Descriptor[]> {
    let entities:
        (ImportDescriptor<ASTNode>| InlineDocumentDescriptor<ASTNode>)[] = [];

    await visit((node) => {
      if (isJsScriptNode(node)) {
        let src = dom5.getAttribute(node, 'src');
        if (src) {
          let importUrl = resolveUrl(document.url, src);
          entities.push(
              new ImportDescriptor<ASTNode>('html-script', importUrl, node));
        } else {
          const locationOffset = getLocationOffsetOfStartOfTextContent(node);
          const attachedCommentText = getAttachedCommentText(node);
          let contents = dom5.getTextContent(node);

          entities.push(new InlineDocumentDescriptor<ASTNode>(
              'js', contents, node, locationOffset, attachedCommentText));
        }
      }
    });

    return entities;
  }
}
