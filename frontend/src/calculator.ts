// Pizza calculator logic
export type Method = 'direct' | 'biga' | 'poolish';
export type YeastType = 'fresh' | 'dry' | 'sourdough';
export type Mixing = 'hand' | 'home' | 'spiral';
export type Fermentation = 'sameDay' | 'coldLong';
export type OvenType = 'ooni' | 'homeStone' | 'homePan';

export function dimensionsCalc(diameter: number, pizzas: number) {
  // baseline: 30cm -> 250g dough. Area-scale for other sizes.
  const area = Math.PI * (diameter / 2) ** 2;
  const baseArea = Math.PI * 15 * 15;
  const factor = area / baseArea;
  return {
    doughBall: Math.round(250 * factor),
    sauce: Math.round(85 * factor),
    cheese: Math.round(90 * factor),
    totalDough: Math.round(250 * factor * pizzas),
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

  // Yeast %:
  //  sameDay: 0.3% fresh; coldLong: 0.1% fresh
  //  Warmer room -> less yeast (fermentation faster)
  let yeastFreshPct = opts.fermentation === 'sameDay' ? 0.3 : 0.1;
  if (opts.roomTemp > 24) yeastFreshPct *= 0.7;
  if (opts.roomTemp < 18) yeastFreshPct *= 1.4;
  let yeastAmount = flour * (yeastFreshPct / 100);
  if (opts.yeastType === 'dry') yeastAmount /= 3;

  // biga/poolish adjust yeast: biga 1% of biga flour, poolish 0.1% of poolish flour
  let bigaBlock: any = null;
  let poolishBlock: any = null;
  if (opts.method === 'biga') {
    // 50% of flour, 45% hydration, 1% yeast
    const bigaFlour = flour * 0.5;
    const bigaWater = bigaFlour * 0.45;
    const bigaYeast = bigaFlour * 0.01;
    bigaBlock = { flour: bigaFlour, water: bigaWater, yeast: bigaYeast };
  } else if (opts.method === 'poolish') {
    // 35% of flour, 100% hydration, 0.1% yeast
    const pFlour = flour * 0.35;
    const pWater = pFlour * 1.0;
    const pYeast = pFlour * 0.001;
    poolishBlock = { flour: pFlour, water: pWater, yeast: pYeast };
  }

  // water temp - rule 55/60: desired dough temp ~24C
  //   hand: sum 55 (water + room = 55)
  //   home mixer: 55 (moderate friction)
  //   spiral: 60 - friction (spiral gives more heat -> colder water)
  const rule = opts.mixing === 'spiral' ? 55 : (opts.mixing === 'home' ? 60 : 60);
  let waterTemp = rule - opts.roomTemp;
  if (opts.fermentation === 'coldLong') waterTemp = Math.min(waterTemp, 10);
  waterTemp = Math.max(2, Math.min(30, waterTemp));

  return {
    flour: Math.round(flour),
    water: Math.round(water),
    salt: Math.round(salt * 10) / 10,
    oil: Math.round(oil * 10) / 10,
    yeast: Math.round(yeastAmount * 100) / 100,
    waterTemp: Math.round(waterTemp),
    totalDough: Math.round(totalDough),
    biga: bigaBlock ? {
      flour: Math.round(bigaBlock.flour),
      water: Math.round(bigaBlock.water),
      yeast: Math.round(bigaBlock.yeast * 100) / 100,
    } : null,
    poolish: poolishBlock ? {
      flour: Math.round(poolishBlock.flour),
      water: Math.round(poolishBlock.water),
      yeast: Math.round(poolishBlock.yeast * 100) / 100,
    } : null,
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
