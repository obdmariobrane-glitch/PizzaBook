// Pizza calculator logic
export type Method = 'direct' | 'biga' | 'poolish';
export type YeastType = 'fresh' | 'dry' | 'sourdough';
export type Mixing = 'hand' | 'home' | 'spiral';
export type Fermentation = 'sameDay' | 'coldLong';
export type OvenType = 'ooni' | 'homeStone' | 'homePan';

export type FlourType = 'caputo00' | 'manitoba' | 'spelt' | 'wholeWheat' | 'glutenFree';

export const FLOUR_PROFILES: Record<FlourType, { label: string; ideal: number; min: number; max: number }> = {
  caputo00: { label: 'Tipo 0 i 00', ideal: 68, min: 65, max: 70 },
  manitoba: { label: 'Manitoba / Visoki W', ideal: 75, min: 70, max: 80 },
  spelt: { label: 'Pirovo brašno', ideal: 62, min: 60, max: 65 },
  wholeWheat: { label: 'Integralno brašno', ideal: 72, min: 70, max: 75 },
  glutenFree: { label: 'Bezglutensko', ideal: 80, min: 75, max: 85 },
};

// Exact normative table per pizza diameter (from spec)
const DIMENSION_TABLE: Record<number, { ball: number; sauce: number; cheese: number }> = {
  26: { ball: 220, sauce: 70, cheese: 75 },
  28: { ball: 240, sauce: 80, cheese: 85 },
  30: { ball: 260, sauce: 85, cheese: 90 },
  33: { ball: 280, sauce: 95, cheese: 100 },
  35: { ball: 310, sauce: 105, cheese: 110 },
  40: { ball: 380, sauce: 130, cheese: 140 },
};

export function dimensionsCalc(diameter: number, pizzas: number) {
  // Use exact table when known; otherwise scale from nearest entry
  const exact = DIMENSION_TABLE[diameter];
  if (exact) {
    return {
      doughBall: exact.ball,
      sauce: exact.sauce,
      cheese: exact.cheese,
      totalDough: exact.ball * pizzas,
    };
  }
  // Scale from 30cm as baseline
  const base = DIMENSION_TABLE[30];
  const area = Math.PI * (diameter / 2) ** 2;
  const baseArea = Math.PI * 15 * 15;
  const factor = area / baseArea;
  return {
    doughBall: Math.round(base.ball * factor),
    sauce: Math.round(base.sauce * factor),
    cheese: Math.round(base.cheese * factor),
    totalDough: Math.round(base.ball * factor) * pizzas,
  };
}

export function doughCalc(opts: {
  pizzas: number; ballWeight: number; hydration: number; saltPct: number; oilPct: number;
  method: Method; yeastType: YeastType; mixing: Mixing;
  roomTemp: number; fridgeTemp: number; fermentation: Fermentation;
}) {
  const totalDough = opts.pizzas * opts.ballWeight;
  // total dough = flour + water + salt + yeast + oil ≈ flour * (1 + hyd + salt + oil + yeast)
  const totalFactor = 1 + opts.hydration / 100 + opts.saltPct / 100 + opts.oilPct / 100 + 0.005;
  const flour = totalDough / totalFactor;
  const water = flour * (opts.hydration / 100);
  const salt = flour * (opts.saltPct / 100);
  const oil = flour * (opts.oilPct / 100);

  // Direct-method yeast %:
  let yeastFreshPct = opts.fermentation === 'sameDay' ? 0.3 : 0.1;
  if (opts.roomTemp > 24) yeastFreshPct *= 0.7;
  if (opts.roomTemp < 18) yeastFreshPct *= 1.4;
  let directYeast = flour * (yeastFreshPct / 100);
  if (opts.yeastType === 'dry') directYeast /= 3;

  // Water temp - rule 55/60
  const rule = opts.mixing === 'spiral' ? 55 : 60;
  let waterTemp = rule - opts.roomTemp;
  if (opts.fermentation === 'coldLong') waterTemp = Math.min(waterTemp, 10);
  waterTemp = Math.max(2, Math.min(30, waterTemp));

  const R = (n: number, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  };

  if (opts.method === 'biga') {
    // Biga: 50% flour, 45% hydration, 1% yeast
    const bigaFlour = flour * 0.5;
    const bigaWater = bigaFlour * 0.45;
    let bigaYeast = bigaFlour * 0.01;
    if (opts.yeastType === 'dry') bigaYeast /= 3;

    const mainFlour = flour - bigaFlour;
    const mainWater = water - bigaWater;

    return {
      method: 'biga' as const,
      preferment: { flour: R(bigaFlour), water: R(bigaWater), yeast: R(bigaYeast, 2) },
      main: { flour: R(mainFlour), water: R(mainWater), salt: R(salt, 1), oil: R(oil, 1), yeast: 0 },
      total: { flour: R(flour), water: R(water), salt: R(salt, 1), oil: R(oil, 1), yeast: R(bigaYeast, 2) },
      totalDough: R(totalDough),
      waterTemp: R(waterTemp),
    };
  }

  if (opts.method === 'poolish') {
    // Poolish: 35% flour, 100% hydration, 0.1% yeast
    const pFlour = flour * 0.35;
    const pWater = pFlour * 1.0;
    let pYeast = pFlour * 0.001;
    if (opts.yeastType === 'dry') pYeast /= 3;

    const mainFlour = flour - pFlour;
    const mainWater = water - pWater;

    return {
      method: 'poolish' as const,
      preferment: { flour: R(pFlour), water: R(pWater), yeast: R(pYeast, 2) },
      main: { flour: R(mainFlour), water: R(mainWater), salt: R(salt, 1), oil: R(oil, 1), yeast: 0 },
      total: { flour: R(flour), water: R(water), salt: R(salt, 1), oil: R(oil, 1), yeast: R(pYeast, 2) },
      totalDough: R(totalDough),
      waterTemp: R(waterTemp),
    };
  }

  // Direct
  return {
    method: 'direct' as const,
    preferment: null,
    main: { flour: R(flour), water: R(water), salt: R(salt, 1), oil: R(oil, 1), yeast: R(directYeast, 2) },
    total: { flour: R(flour), water: R(water), salt: R(salt, 1), oil: R(oil, 1), yeast: R(directYeast, 2) },
    totalDough: R(totalDough),
    waterTemp: R(waterTemp),
  };
}

export function bakingCalc(oven: OvenType) {
  if (oven === 'ooni') {
    return {
      temp: '430–500°C',
      time: '60–90 s',
      steps: [
        'Zagrij peć min 20 minuta na max.',
        'Stavi pizzu i rotiraj svakih 20-30 sekundi.',
        'Vadi kad je rub zapečen i s tamnim mrljama (leopardiranje).',
      ],
    };
  }
  if (oven === 'homeStone') {
    return {
      temp: '300°C + grill',
      time: '4–6 min',
      steps: [
        'Zagrij kamen/čelik na max 45-60 min u gornjoj trećini pećnice.',
        'Uključi gornji grill 5 min prije stavljanja pizze.',
        'Pizza ide na kamen 4-6 minuta.',
        'Zadnjih 30-60 s pod grillom da se sir zapeče.',
      ],
    };
  }
  return {
    temp: '250–280°C',
    time: '8–10 min',
    steps: [
      'Zagrij pećnicu na max s ventilacijom.',
      'Peci pizzu na SAMOM DNU pećnice (u protvanu) 5-7 min da dno bude hrskavo.',
      'Prebaci na gornju rešetku pod grill 2-3 min da se sir i rub zapeku.',
      'ZLATNO PRAVILO: Ne skreći pogled dok je pizza u pećnici!',
    ],
  };
}

export function iceCalc(totalWater: number, tapTemp: number, targetTemp: number) {
  // simple energy balance: ice at 0°C, water at tap.
  // (mIce * 80 + mIce * (0 - target)) = mWater * (tap - target)
  // Using L=80 cal/g latent heat of ice.
  const q = totalWater * (tapTemp - targetTemp);
  const iceCap = 80 + (targetTemp - 0);
  const ice = Math.max(0, Math.min(totalWater * 0.5, q / iceCap));
  return {
    ice: Math.round(ice),
    water: Math.round(totalWater - ice),
  };
}

export function reversePlan(bakeAt: Date, method: Method) {
  const steps: { at: Date; title: string; desc: string }[] = [];
  const push = (offsetMin: number, title: string, desc: string) => {
    const at = new Date(bakeAt.getTime() - offsetMin * 60000);
    steps.push({ at, title, desc });
  };

  // reverse order
  push(60, 'Upali pećnicu / kamen', 'Zagrij pećnicu na max 45-60 min prije pečenja.');
  push(60 * 5, 'Formiranje bulica', 'Napravi loptice (250g) i ostavi na sobnoj temperaturi da odstoje.');
  if (method === 'biga') {
    push(60 * 24, 'Završni zamjes (rinfresco)', 'Dodaj preostalo brašno, vodu, sol i ulje u bigu i zamijesi.');
    push(60 * 24 + 60 * 18, 'Zamijesi Bigu', '50% brašna, 45% hidratacija, 1% kvasca. Stoji 16-18h na sobnoj temp.');
  } else if (method === 'poolish') {
    push(60 * 24, 'Završni zamjes', 'Dodaj preostalo brašno, vodu, sol i ulje u poolish i zamijesi.');
    push(60 * 24 + 60 * 14, 'Zamijesi Poolish', '35% brašna, 100% hidratacija, 0.1% kvasca. Stoji 12-14h na sobnoj temp.');
  } else {
    push(60 * 8, 'Zamijesi tijesto', 'Direktna metoda - zamijesi sve sastojke i stavi na fermentaciju.');
  }
  return steps.sort((a, b) => a.at.getTime() - b.at.getTime());
}
