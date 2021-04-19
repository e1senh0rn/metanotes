// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* attributes *
 * id: 01F3JWKAJRFYYYX0AX5YQ25TAX
 * content-type: application/vnd.metanotes.component-jsmodule
 * title: $:core/parser/BlockContent
 * tags: ['$:core/parser']
 * parser: BlockContent
 */

const { alt } = Parsimmon;

/**
 * Joins the adjascent paragraphs together.
 *
 * @param blocks Array of BlockContent blocks.
 * @returns Array of BlockContent blocks.
 */
function collapseParagraphs(blocks) {
  return blocks.reduce((acc, curr) => {
    const last = acc.length > 0 ? acc[acc.length - 1] : { type: undefined };
    const lastIsParagraph = last.type === 'paragraph';
    const lastIsEmptyNewline = lastIsParagraph && last.children?.length === 0;
    const currIsParagraph = curr.type === 'paragraph';
    const currIsEmptyNewline = currIsParagraph && curr.children.length === 0;

    if (lastIsParagraph && currIsParagraph && !currIsEmptyNewline && !lastIsEmptyNewline) {
      last.children = [...last.children, { type: 'text', value: '\n' }, ...curr.children];
      return acc;
    }
    return [...acc, curr];
  }, []);
}

function removeParagraphTrailingBreak(block) {
  const lastIdx = block.children.length - 1;
  if (block.children[lastIdx].type === 'break') {
    const breakEl = block.children.pop();
    // https://spec.commonmark.org/0.29/#example-641
    if (breakEl.isBackslash) {
      block.children[lastIdx - 1].value += '\\';
    }
  }
}

const balanceEmphasisChildren = requireScribble('$:core/parser-helpers/balanceEmphasisChildren');
const collapseText = requireScribble('$:core/parser-helpers/collapseText');

function finalizeParagraphs(blocks) {
  for (const block of blocks) {
    if (block.type !== 'paragraph') { continue; }
    if (block.children.length === 0) {
      block.type = undefined;
      continue;
    }
    removeParagraphTrailingBreak(block);
    balanceEmphasisChildren(block);
    collapseText(block);
  }
  return blocks;
}

function BlockContent(r) {
  return alt(
    r.AtxHeading,
    r.Paragraph,
  ).many().map((blocks) => finalizeParagraphs(collapseParagraphs(blocks))
    .filter((block) => block.type));
}

export default BlockContent;
