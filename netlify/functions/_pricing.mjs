// Серверное зеркало формулы расчёта цены из letters-calculator.html.
// Если поменяете цены/тарифы в калькуляторе — обязательно продублируйте изменения и тут,
// иначе сервер начнёт спорить с фронтендом о правильной цене.

export const PRICING = {
  letterTypeRateByLabel: {
    "Несветовые плоские": 80,
    "Несветовые объёмные": 80,
    "Световое лицо": 80,
    "Световой борт и лицо": 80,
    "Лицо не световое, торцы световые": 80,
    "Контражур": 80,
    "Световое лицо + контражур": 80,
    "RGB": 80,
    "Буквы день/ночь": 80,
  },
  fontMultByLabel: {
    "Простой без засечек": 1,
    "С засечками": 1.12,
    "Рукописный / декоративный": 1.3,
  },
  placeMultByLabel: {
    "Интерьер": 0.85,
    "Улица": 1.0,
  },
  classMultByLabel: {
    "Эконом": 0.85,
    "Стандарт": 1.0,
    "Спец": 1.25,
  },
  backingPricePerM2ByLabel: {
    "Без подложки": 0,
    "ПВХ подложка": 5000,
    "Композитная подложка": 7500,
    "Прозрачная подложка": 15000,
    "Рама": 1000,
  },
  mountByLabel: {
    "Без монтажа": { percent: 0, min: 0, custom: false },
    "Фасадный монтаж до 3 м": { percent: 0.25, min: 8000, custom: false },
    "Фасадный монтаж до 5 м": { percent: 0.30, min: 8000, custom: false },
    "Сложный монтаж / выше 5 м": { percent: null, min: null, custom: true },
  },
  charWidthRatio: 0.70,
  thinElementsSurcharge: 0.25,
  minOrder: 12000,
};

export function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

export function countLetters(text) {
  const t = normalizeText(text).replace(/\s/g, "");
  return Math.max(t.length, 1);
}

// Возвращает { total, mountIsCustom, breakdown } или null, если какой-то из параметров
// не удалось распознать (например, лейбл не совпадает ни с одним известным вариантом).
export function recalcPrice({ signText, height, type, font, place, cls, backing, mount, thinElements }) {
  const rate = PRICING.letterTypeRateByLabel[type];
  const fontMult = PRICING.fontMultByLabel[font];
  const placeMult = PRICING.placeMultByLabel[place];
  const clsMult = PRICING.classMultByLabel[cls];
  const backingPricePerM2 = PRICING.backingPricePerM2ByLabel[backing];
  const mountCfg = PRICING.mountByLabel[mount];

  if (
    rate === undefined || fontMult === undefined || placeMult === undefined ||
    clsMult === undefined || backingPricePerM2 === undefined || mountCfg === undefined
  ) {
    return null;
  }

  const heightCm = parseFloat(String(height).replace(/[^\d.]/g, ""));
  if (!heightCm || heightCm <= 0) return null;

  const letterCount = countLetters(signText);

  const unit = heightCm * rate * fontMult * placeMult * clsMult;
  const lettersSubtotal = unit * letterCount;
  const thinAddon = thinElements ? lettersSubtotal * PRICING.thinElementsSurcharge : 0;
  const lettersTotal = lettersSubtotal + thinAddon;

  const widthCm = letterCount * heightCm * PRICING.charWidthRatio;
  const areaM2 = (widthCm / 100) * (heightCm / 100);
  const backingCost = areaM2 * backingPricePerM2;

  const preMount = lettersTotal + backingCost;

  let mountCost = 0;
  if (!mountCfg.custom && mountCfg.percent > 0) {
    mountCost = Math.max(preMount * mountCfg.percent, mountCfg.min);
  }

  let total = preMount + mountCost;
  if (!mountCfg.custom) total = Math.max(total, PRICING.minOrder);

  return {
    total: Math.round(total),
    mountIsCustom: mountCfg.custom,
    letterCount,
    heightCm,
  };
}
