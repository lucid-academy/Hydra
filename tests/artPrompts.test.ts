import { describe, expect, it } from 'vitest';
import prompts from '../docs/ART_PROMPTS.md?raw';
import manifest from '../src/assets/manifest.json';

/** The fenced ```text blocks of the file, in order. */
function textBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]!);
}

describe('docs/ART_PROMPTS.md', () => {
  const blocks = textBlocks(prompts);
  const style = blocks[0]!;

  it('starts with the style block and has prompts after it', () => {
    expect(prompts).toContain('## Stały blok stylu');
    expect(style).toContain('#FF00FF');
    expect(blocks.length).toBeGreaterThan(1);
  });

  it('every prompt starts with the same style block, word for word', () => {
    blocks.slice(1).forEach((block, i) => expect(block.startsWith(style), `prompt ${i + 1}`).toBe(true));
  });

  it('every prompt is named after an image the game knows', () => {
    const files = [...prompts.matchAll(/^###.*`([A-Za-z0-9_]+)\.png`/gm)].map((m) => m[1]!);
    expect(files.length).toBe(blocks.length - 1);
    for (const key of files) expect(Object.keys(manifest.images), key).toContain(key);
  });
});
