// ЕДИНЫЙ источник тарифов и формулы расчёта цены.
// Его читают и калькулятор (letters-calculator.html), и сервер (netlify/functions/_pricing.mjs).
// Цены меняются ТОЛЬКО здесь — в других файлах числа тарифов не дублируются.
// Ключи в таблицах — те же названия (label), что видит пользователь в калькуляторе.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PricingCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  var PRICING = {
    letterTypeRateByLabel: {
      "Несветовые плоские": 80,
      "Несветовые объёмные": 80,
      "Световое лицо": 80,
      "Световой борт и лицо": 80,
      "Лицо не световое, торцы световые": 80,
      "Контражур": 80,
      "Световое лицо + контражур": 80,
      "RGB": 80,
      "Буквы день/ночь": 80
    },
    fontMultByLabel: {
      "Простой без засечек": 1,
      "С засечками": 1.12,
      "Рукописный / декоративный": 1.3
    },
    placeMultByLabel: {
      "Интерьер": 0.85,
      "Улица": 1.0
    },
    classMultByLabel: {
      "Эконом": 0.85,
      "Стандарт": 1.0,
      "Спец": 1.25
    },
    backingPricePerM2ByLabel: {
      "Без подложки": 0,
      "ПВХ подложка": 5000,
      "Композитная подложка": 7500,
      "Прозрачная подложка": 15000,
      "Рама": 1000
    },
    mountByLabel: {
      "Без монтажа": { percent: 0, min: 0, custom: false },
      "Фасадный монтаж до 3 м": { percent: 0.25, min: 8000, custom: false },
      "Фасадный монтаж до 5 м": { percent: 0.30, min: 8000, custom: false },
      "Сложный монтаж / выше 5 м": { percent: null, min: null, custom: true }
    },
    charWidthRatio: 0.70,
    thinElementsSurcharge: 0.25,
    minOrder: 12000
  };

  function normalizeText(text) {
    return String(text || "").trim().replace(/\s+/g, " ");
  }

  function countLetters(text) {
    var t = normalizeText(text).replace(/\s/g, "");
    return Math.max(t.length, 1);
  }

  // Возвращает полную раскладку цены (без округления) или null,
  // если какое-то название или высота не распознаны.
  function calcPrice(p) {
    var rate = PRICING.letterTypeRateByLabel[p.type];
    var fontMult = PRICING.fontMultByLabel[p.font];
    var placeMult = PRICING.placeMultByLabel[p.place];
    var clsMult = PRICING.classMultByLabel[p.cls];
    var backingPricePerM2 = PRICING.backingPricePerM2ByLabel[p.backing];
    var mountCfg = PRICING.mountByLabel[p.mount];

    if (
      rate === undefined || fontMult === undefined || placeMult === undefined ||
      clsMult === undefined || backingPricePerM2 === undefined || mountCfg === undefined
    ) {
      return null;
    }

    var heightCm = Number(p.heightCm);
    if (!heightCm || heightCm <= 0) return null;

    var letterCount = countLetters(p.signText);

    var unit = heightCm * rate * fontMult * placeMult * clsMult;
    var lettersSubtotal = unit * letterCount;
    var thinAddon = p.thin ? lettersSubtotal * PRICING.thinElementsSurcharge : 0;
    var lettersTotal = lettersSubtotal + thinAddon;

    var widthCm = letterCount * heightCm * PRICING.charWidthRatio;
    var areaM2 = (widthCm / 100) * (heightCm / 100);
    var backingCost = areaM2 * backingPricePerM2;

    var preMount = lettersTotal + backingCost;

    var mountCost = 0;
    if (!mountCfg.custom && mountCfg.percent > 0) {
      mountCost = Math.max(preMount * mountCfg.percent, mountCfg.min);
    }

    var total = preMount + mountCost;
    if (!mountCfg.custom) total = Math.max(total, PRICING.minOrder);

    return {
      letterCount: letterCount,
      heightCm: heightCm,
      unit: unit,
      lettersSubtotal: lettersSubtotal,
      thinAddon: thinAddon,
      lettersTotal: lettersTotal,
      widthCm: widthCm,
      areaM2: areaM2,
      backingPricePerM2: backingPricePerM2,
      backingCost: backingCost,
      preMount: preMount,
      mountCost: mountCost,
      mountIsCustom: mountCfg.custom,
      total: total
    };
  }

  return {
    PRICING: PRICING,
    normalizeText: normalizeText,
    countLetters: countLetters,
    calcPrice: calcPrice
  };
});
