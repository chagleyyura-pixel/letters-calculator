// Серверная обёртка над общим модулем расчёта цены.
// Тарифы и формула лежат в ОДНОМ месте — /pricing-core.js в корне проекта.
// Их же использует калькулятор на сайте, поэтому расхождения между ними невозможны.
// Чтобы поменять цены — правьте только pricing-core.js.

import core from "../../pricing-core.js";

export const PRICING = core.PRICING;
export const normalizeText = core.normalizeText;
export const countLetters = core.countLetters;

// Возвращает { total, mountIsCustom, letterCount, heightCm } или null, если какой-то из параметров
// не удалось распознать (например, название не совпадает ни с одним известным вариантом).
export function recalcPrice({ signText, height, type, font, place, cls, backing, mount, thinElements }) {
  const heightCm = parseFloat(String(height).replace(/[^\d.]/g, ""));
  if (!heightCm || heightCm <= 0) return null;

  const r = core.calcPrice({ signText, heightCm, type, font, place, cls, backing, mount, thin: !!thinElements });
  if (!r) return null;

  return {
    total: Math.round(r.total),
    mountIsCustom: r.mountIsCustom,
    letterCount: r.letterCount,
    heightCm: r.heightCm,
  };
}
