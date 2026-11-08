import { expect, type Locator, type Page } from '@playwright/test';

/** Drags with real mouse moves in small steps, so pointer-sensor drags (dnd-kit) activate and track the pointer. */
export async function drag(page: Page, from: Locator, to: { x: number; y: number } | Locator, opts: { dy?: number; dx?: number } = {}) {
  const a = await from.boundingBox();
  if (!a) throw new Error('drag source is not visible');
  const b = 'x' in to ? to : await to.boundingBox().then(r => (r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null));
  if (!b) throw new Error('drag target is not visible');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2 + 8, { steps: 4 });
  await page.mouse.move(b.x + (opts.dx ?? 0), b.y + (opts.dy ?? 0), { steps: 16 });
  await page.mouse.up();
}

/** A keyboard drag on the focused handle: Space picks up, the keys move, Space drops. dnd-kit marks the picked-up handle pressed and
    measures the drag overlay over the next frames, so each move waits a moment, as a person would. */
export async function keyboardDrag(page: Page, keys: string[]) {
  const handle = page.locator(':focus');
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  for (const k of keys) {
    await page.waitForTimeout(150);
    await page.keyboard.press(k);
  }
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
}

/** The task titles of the board cards inside `scope`, top to bottom. */
export const cardTitles = (scope: Locator) =>
  scope
    .locator('[data-drag-card]')
    .evaluateAll(cards => cards.map(c => [...c.querySelectorAll('button')].find(b => !b.hasAttribute('aria-label'))?.textContent ?? ''));
