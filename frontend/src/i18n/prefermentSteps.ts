// Detailed BIGA and POOLISH step-by-step recipes, per language and per mixing method.
// P1 = Preferment build, P2 = Final mix (hand OR mixer), P3 = Rest / Balling / Baking.
import type { Lang } from './translations';

export type Phase = { title: string; steps: string[] };
export type Path = { p1: Phase; p2: Phase; p3: Phase };
export type MethodSteps = { hand: Path; mixer: Path };

// ============================ HR ============================
const HR_BIGA_P1: Phase = {
  title: 'Faza 1: Izrada Bige',
  steps: [
    'U posudu stavite brašno i po njemu ravnomjerno izmrvite kvasac.',
    'Ulijte izračunatu hladnu vodu.',
    'Rukama samo ukratko pomiješajte sastojke bez miješenja glatkog tijesta (cilj je samo da brašno popije vodu i ostane mrvičasto).',
    'Nježno pritisnite smjesu rukom, pokrijte posudu i ostavite 8 sati na sobnoj temperaturi.',
    'Prebacite posudu u hladnjak na 16 sati (na 4–6°C).',
  ],
};
const HR_BIGA_HAND_P2: Phase = {
  title: 'Faza 2: Završni zamjes (Ručno)',
  steps: [
    'Bigu izrežite nožem ili natrgajte rukama na manje komade direktno u posudu za ručni zamjes.',
    'Dodajte preostali kvasac i ulijte veći dio hladne vode.',
    'Prstima i šakama pritišćite komade Bige u vodi dok se ne omekšaju i ne počnu povezivati u smjesu.',
    'Kako tijesto upija, polako u mlazevima dolijevajte ostatak vode i mijesite.',
    'Kad ostane malo vode, ubacite sol, prelijte je s tom zadnjom vodom i nastavite energično mijesiti.',
    'Na samom kraju ulijte maslinovo ulje i mijesite dok ga tijesto potpuno ne upije i ne postane glatko.',
  ],
};
const HR_BIGA_MIXER_P2: Phase = {
  title: 'Faza 2: Završni zamjes (Mikser)',
  steps: [
    'Bigu izrežite nožem na manje komade i ubacite u posudu miksera.',
    'Dodajte preostali kvasac i ulijte veći dio hladne vode (s ledom). Pokrenite mikser u 1. brzini.',
    'Kako tijesto upija, polako u mlazevima dolijevajte ostatak vode.',
    'Kad ostane malo vode, ubacite sol, prelijte zadnjom vodom i prebacite mikser u 2. brzinu.',
    'Ulijte maslinovo ulje i ugasite mikser čim ga tijesto potpuno upije.',
  ],
};
const HR_BIGA_P3: Phase = {
  title: 'Faza 3: Odmor, loptice i pečenje',
  steps: [
    'Ostavite tijesto da odmori u posudi 6–7 minuta.',
    'Prebacite ga u nauljenu posudu, pokrijte i ostavite 30 minuta na sobnoj temperaturi.',
    'Preklopite tijesto par puta rukama (stretch & fold), pokrijte i stavite u hladnjak na 60 do 90 minuta.',
    'Oblikujte čvrste loptice (bulice) od 260–300 g.',
    'Loptice ostavite 15 minuta na sobnoj temp., pa ih spremite u hladnjak na još 5 do 6 sati.',
    'Izvadite loptice 10–15 minuta prije pečenja, razvucite na semoli, nadjenite i pecite na najjačoj temperaturi.',
  ],
};

const HR_POOLISH_P1: Phase = {
  title: 'Faza 1: Izrada Poolisha',
  steps: [
    'U posudi otopite kvasac u izračunatoj vodi za Poolish.',
    'Dodajte brašno za Poolish i dobro pomiješajte pjenjačom ili vilicom dok ne dobijete glatku tekuću smjesu.',
    'Pokrijte posudu, ostavite 1 sat na sobnoj temperaturi, pa prebacite u hladnjak na 16 do 24 sata.',
  ],
};
const HR_POOLISH_HAND_P2: Phase = {
  title: 'Faza 2: Završni zamjes (Ručno)',
  steps: [
    'Hladni Poolish prelijte u posudu za miješenje.',
    'Dodajte preostalo brašno i veći dio preostale vode.',
    'Miješajte kuhačom ili rukama dok se brašno u potpunosti ne sjedini s Poolishom.',
    'Ubacite sol i polako u tankom mlazu dolijevajte ostatak vode miješajući tijesto.',
    'Ulijte maslinovo ulje i mijesite rukama dok ga tijesto ne upije i ne postane svilenkasto.',
  ],
};
const HR_POOLISH_MIXER_P2: Phase = {
  title: 'Faza 2: Završni zamjes (Mikser)',
  steps: [
    'Hladni Poolish prelijte izravno u posudu miksera.',
    'Dodajte preostalo brašno i veći dio vode te pokrenite mikser u 1. brzini.',
    'Ubacite sol i polako u tankom mlazu dolijevajte ostatak vode dok mikser radi.',
    'Ulijte maslinovo ulje i mijesite dok tijesto u potpunosti ne upije ulje i ne postane glatko.',
  ],
};
const HR_POOLISH_P3: Phase = {
  title: 'Faza 3: Odmor, loptice i pečenje',
  steps: [
    'Oblikujte tijesto u kuglu, stavite u nauljenu posudu i pokrijte.',
    'Ostavite da odmori 30 minuta na sobnoj temperaturi.',
    'Napravite jedno preklapanje rukama (stretch & fold), pa ostavite još 30 minuta na sobnoj temperaturi.',
    'Podijelite tijesto i oblikujte glatke loptice od 260–280 g.',
    'Poslažite loptice u kutiju za tijesto i ostavite na sobnoj temp. 3 do 4 sata prije pečenja.',
    'Razvucite lopticu na semoli, nadjenite i pecite na najjačoj temperaturi peći.',
  ],
};

// ============================ EN ============================
const EN_BIGA_P1: Phase = {
  title: 'Phase 1: Making the Biga',
  steps: [
    'Place the flour in a bowl and evenly crumble the yeast over it.',
    'Pour in the calculated cold water.',
    'Briefly combine the ingredients by hand without kneading a smooth dough (the goal is just for the flour to absorb the water and stay crumbly).',
    'Gently press the mixture with your hand, cover the bowl and leave for 8 hours at room temperature.',
    'Move the bowl to the fridge for 16 hours (at 4–6°C).',
  ],
};
const EN_BIGA_HAND_P2: Phase = {
  title: 'Phase 2: Final mix (Hand)',
  steps: [
    'Cut the Biga with a knife or tear it by hand into smaller pieces, directly into the mixing bowl.',
    'Add the remaining yeast and pour in most of the cold water.',
    'Press the Biga pieces in the water with your fingers and fists until they soften and start to bind into a mass.',
    'As the dough absorbs, slowly stream in the remaining water and knead.',
    'When only a little water is left, add the salt, pour it in with that last water and continue kneading energetically.',
    'At the very end, pour in the olive oil and knead until the dough fully absorbs it and becomes smooth.',
  ],
};
const EN_BIGA_MIXER_P2: Phase = {
  title: 'Phase 2: Final mix (Mixer)',
  steps: [
    'Cut the Biga with a knife into smaller pieces and place them into the mixer bowl.',
    'Add the remaining yeast and pour in most of the cold water (with ice). Start the mixer on speed 1.',
    'As the dough absorbs, slowly stream in the remaining water.',
    'When only a little water is left, add the salt, pour it in with the last water and switch the mixer to speed 2.',
    'Pour in the olive oil and stop the mixer as soon as the dough fully absorbs it.',
  ],
};
const EN_BIGA_P3: Phase = {
  title: 'Phase 3: Rest, balling and baking',
  steps: [
    'Let the dough rest in the bowl for 6–7 minutes.',
    'Transfer it to an oiled bowl, cover and leave for 30 minutes at room temperature.',
    'Fold the dough a few times by hand (stretch & fold), cover and place in the fridge for 60 to 90 minutes.',
    'Shape firm dough balls of 260–300 g.',
    'Leave the balls for 15 minutes at room temp, then place them in the fridge for another 5 to 6 hours.',
    'Take the balls out 10–15 minutes before baking, stretch on semolina, top and bake at the highest temperature.',
  ],
};

const EN_POOLISH_P1: Phase = {
  title: 'Phase 1: Making the Poolish',
  steps: [
    'In a bowl, dissolve the yeast in the calculated water for Poolish.',
    'Add the flour for Poolish and mix well with a whisk or fork until you get a smooth, liquid mixture.',
    'Cover the bowl, leave for 1 hour at room temperature, then move to the fridge for 16 to 24 hours.',
  ],
};
const EN_POOLISH_HAND_P2: Phase = {
  title: 'Phase 2: Final mix (Hand)',
  steps: [
    'Pour the cold Poolish into the mixing bowl.',
    'Add the remaining flour and most of the remaining water.',
    'Mix with a spoon or your hands until the flour is fully combined with the Poolish.',
    'Add the salt and slowly, in a thin stream, pour in the remaining water while mixing the dough.',
    'Pour in the olive oil and knead by hand until the dough absorbs it and becomes silky.',
  ],
};
const EN_POOLISH_MIXER_P2: Phase = {
  title: 'Phase 2: Final mix (Mixer)',
  steps: [
    'Pour the cold Poolish directly into the mixer bowl.',
    'Add the remaining flour and most of the water, and start the mixer on speed 1.',
    'Add the salt and slowly, in a thin stream, pour in the remaining water while the mixer runs.',
    'Pour in the olive oil and knead until the dough fully absorbs the oil and becomes smooth.',
  ],
};
const EN_POOLISH_P3: Phase = {
  title: 'Phase 3: Rest, balling and baking',
  steps: [
    'Shape the dough into a ball, place in an oiled bowl and cover.',
    'Let it rest for 30 minutes at room temperature.',
    'Do one stretch & fold by hand, then leave it for another 30 minutes at room temperature.',
    'Divide the dough and shape smooth balls of 260–280 g.',
    'Arrange the balls in a dough tray and leave them at room temp for 3 to 4 hours before baking.',
    'Stretch the ball on semolina, top and bake at the highest oven temperature.',
  ],
};

// ============================ DE ============================
const DE_BIGA_P1: Phase = {
  title: 'Phase 1: Herstellung der Biga',
  steps: [
    'Geben Sie das Mehl in eine Schüssel und zerbröseln Sie die Hefe gleichmäßig darüber.',
    'Gießen Sie das berechnete kalte Wasser hinein.',
    'Vermengen Sie die Zutaten mit den Händen nur kurz, ohne einen glatten Teig zu kneten (Ziel ist, dass das Mehl das Wasser aufnimmt und krümelig bleibt).',
    'Drücken Sie die Masse sanft mit der Hand an, decken Sie die Schüssel ab und lassen Sie sie 8 Stunden bei Raumtemperatur ruhen.',
    'Stellen Sie die Schüssel für 16 Stunden in den Kühlschrank (bei 4–6°C).',
  ],
};
const DE_BIGA_HAND_P2: Phase = {
  title: 'Phase 2: Endkneten (Hand)',
  steps: [
    'Schneiden Sie die Biga mit einem Messer oder reißen Sie sie mit den Händen in kleinere Stücke direkt in die Knetschüssel.',
    'Fügen Sie die restliche Hefe hinzu und gießen Sie den Großteil des kalten Wassers ein.',
    'Drücken Sie die Biga-Stücke mit Fingern und Fäusten im Wasser, bis sie weich werden und sich zu einer Masse verbinden.',
    'Während der Teig aufnimmt, gießen Sie langsam in Strömen das restliche Wasser ein und kneten weiter.',
    'Wenn nur noch wenig Wasser übrig ist, geben Sie das Salz dazu, übergießen Sie es mit dem letzten Wasser und kneten Sie kräftig weiter.',
    'Zum Schluss gießen Sie das Olivenöl ein und kneten, bis der Teig es vollständig aufnimmt und glatt wird.',
  ],
};
const DE_BIGA_MIXER_P2: Phase = {
  title: 'Phase 2: Endkneten (Küchenmaschine)',
  steps: [
    'Schneiden Sie die Biga mit einem Messer in kleinere Stücke und geben Sie sie in die Mixerschüssel.',
    'Fügen Sie die restliche Hefe hinzu und gießen Sie den Großteil des kalten Wassers ein (mit Eis). Starten Sie den Mixer auf Stufe 1.',
    'Während der Teig aufnimmt, gießen Sie langsam in Strömen das restliche Wasser ein.',
    'Wenn nur noch wenig Wasser übrig ist, geben Sie das Salz dazu, übergießen Sie es mit dem letzten Wasser und schalten Sie den Mixer auf Stufe 2.',
    'Gießen Sie das Olivenöl ein und stoppen Sie den Mixer, sobald der Teig es vollständig aufgenommen hat.',
  ],
};
const DE_BIGA_P3: Phase = {
  title: 'Phase 3: Ruhen, Teiglinge und Backen',
  steps: [
    'Lassen Sie den Teig 6–7 Minuten in der Schüssel ruhen.',
    'Geben Sie ihn in eine geölte Schüssel, decken Sie ab und lassen Sie ihn 30 Minuten bei Raumtemperatur ruhen.',
    'Falten Sie den Teig einige Male mit den Händen (Stretch & Fold), decken Sie ab und stellen Sie ihn für 60 bis 90 Minuten in den Kühlschrank.',
    'Formen Sie feste Teiglinge zu je 260–300 g.',
    'Lassen Sie die Teiglinge 15 Minuten bei Raumtemp., dann für weitere 5 bis 6 Stunden in den Kühlschrank.',
    'Nehmen Sie die Teiglinge 10–15 Minuten vor dem Backen heraus, ziehen Sie sie auf Semola aus, belegen und backen Sie bei höchster Temperatur.',
  ],
};

const DE_POOLISH_P1: Phase = {
  title: 'Phase 1: Herstellung des Poolish',
  steps: [
    'In einer Schüssel die Hefe im berechneten Wasser für Poolish auflösen.',
    'Das Mehl für Poolish hinzufügen und mit einem Schneebesen oder einer Gabel gut vermischen, bis eine glatte, flüssige Masse entsteht.',
    'Die Schüssel abdecken, 1 Stunde bei Raumtemperatur ruhen lassen, dann für 16 bis 24 Stunden in den Kühlschrank stellen.',
  ],
};
const DE_POOLISH_HAND_P2: Phase = {
  title: 'Phase 2: Endkneten (Hand)',
  steps: [
    'Den kalten Poolish in die Knetschüssel gießen.',
    'Das restliche Mehl und den Großteil des restlichen Wassers hinzufügen.',
    'Mit einem Löffel oder den Händen mischen, bis das Mehl vollständig mit dem Poolish verbunden ist.',
    'Das Salz hinzufügen und langsam in einem dünnen Strahl das restliche Wasser einlaufen lassen, während Sie den Teig kneten.',
    'Das Olivenöl einfüllen und mit den Händen kneten, bis der Teig es aufgenommen hat und seidig wird.',
  ],
};
const DE_POOLISH_MIXER_P2: Phase = {
  title: 'Phase 2: Endkneten (Küchenmaschine)',
  steps: [
    'Den kalten Poolish direkt in die Mixerschüssel gießen.',
    'Das restliche Mehl und den Großteil des Wassers hinzufügen und den Mixer auf Stufe 1 starten.',
    'Das Salz hinzufügen und langsam in einem dünnen Strahl das restliche Wasser einlaufen lassen, während der Mixer läuft.',
    'Das Olivenöl einfüllen und kneten, bis der Teig das Öl vollständig aufgenommen hat und glatt wird.',
  ],
};
const DE_POOLISH_P3: Phase = {
  title: 'Phase 3: Ruhen, Teiglinge und Backen',
  steps: [
    'Den Teig zu einer Kugel formen, in eine geölte Schüssel legen und abdecken.',
    '30 Minuten bei Raumtemperatur ruhen lassen.',
    'Ein Stretch & Fold von Hand machen, dann weitere 30 Minuten bei Raumtemperatur ruhen lassen.',
    'Den Teig teilen und glatte Kugeln zu je 260–280 g formen.',
    'Die Kugeln in eine Teigbox setzen und 3 bis 4 Stunden bei Raumtemp. vor dem Backen ruhen lassen.',
    'Die Kugel auf Semola ausziehen, belegen und bei höchster Ofentemperatur backen.',
  ],
};

// ============================ SL ============================
const SL_BIGA_P1: Phase = {
  title: 'Faza 1: Priprava Bige',
  steps: [
    'V posodo stresite moko in po njej enakomerno zdrobite kvas.',
    'Vlijte izračunano hladno vodo.',
    'Z rokami sestavine na hitro premešajte, brez gnetenja gladkega testa (cilj je le, da moka vsrka vodo in ostane drobtinasta).',
    'Nežno pritisnite zmes z roko, pokrijte posodo in pustite 8 ur pri sobni temperaturi.',
    'Prestavite posodo v hladilnik za 16 ur (pri 4–6°C).',
  ],
};
const SL_BIGA_HAND_P2: Phase = {
  title: 'Faza 2: Končno gnetenje (Ročno)',
  steps: [
    'Bigo z nožem razrežite ali z rokami raztrgajte na manjše kose neposredno v posodo za ročno gnetenje.',
    'Dodajte preostali kvas in vlijte večji del hladne vode.',
    'S prsti in pestmi stiskajte kose Bige v vodi, dokler ne omehčajo in se ne začnejo povezovati v zmes.',
    'Ko testo vpija, počasi v curkih dolivajte preostalo vodo in gnetite.',
    'Ko ostane malo vode, dodajte sol, prelijte z zadnjo vodo in nadaljujte z močnim gnetenjem.',
    'Na koncu vlijte oljčno olje in gnetite, dokler ga testo ne vpije popolnoma in postane gladko.',
  ],
};
const SL_BIGA_MIXER_P2: Phase = {
  title: 'Faza 2: Končno gnetenje (Mešalnik)',
  steps: [
    'Bigo z nožem razrežite na manjše kose in jih dajte v posodo mešalnika.',
    'Dodajte preostali kvas in vlijte večji del hladne vode (z ledom). Zaženite mešalnik pri 1. hitrosti.',
    'Ko testo vpija, počasi v curkih dolivajte preostalo vodo.',
    'Ko ostane malo vode, dodajte sol, prelijte z zadnjo vodo in preklopite mešalnik na 2. hitrost.',
    'Vlijte oljčno olje in ustavite mešalnik, ko ga testo popolnoma vpije.',
  ],
};
const SL_BIGA_P3: Phase = {
  title: 'Faza 3: Počitek, kepice in peka',
  steps: [
    'Pustite testo počivati v posodi 6–7 minut.',
    'Prestavite ga v naoljeno posodo, pokrijte in pustite 30 minut pri sobni temperaturi.',
    'Testo nekajkrat prepognite z rokami (stretch & fold), pokrijte in postavite v hladilnik za 60 do 90 minut.',
    'Oblikujte čvrste kepice po 260–300 g.',
    'Kepice pustite 15 minut pri sobni temp., nato pa jih spravite v hladilnik za še 5 do 6 ur.',
    'Vzemite kepice 10–15 minut pred peko, raztegnite na zdrobu, obložite in pecite pri najvišji temperaturi.',
  ],
};

const SL_POOLISH_P1: Phase = {
  title: 'Faza 1: Priprava Poolisha',
  steps: [
    'V posodi raztopite kvas v izračunani vodi za Poolish.',
    'Dodajte moko za Poolish in dobro premešajte z metlico ali vilicami, da dobite gladko tekočo zmes.',
    'Pokrijte posodo, pustite 1 uro pri sobni temperaturi, nato pa jo prestavite v hladilnik za 16 do 24 ur.',
  ],
};
const SL_POOLISH_HAND_P2: Phase = {
  title: 'Faza 2: Končno gnetenje (Ročno)',
  steps: [
    'Hladni Poolish prelijte v posodo za gnetenje.',
    'Dodajte preostalo moko in večji del preostale vode.',
    'Mešajte z zajemalko ali rokami, dokler se moka popolnoma ne spoji s Poolishem.',
    'Dodajte sol in počasi v tankem curku dolivajte preostalo vodo, medtem ko gnetete testo.',
    'Vlijte oljčno olje in z rokami gnetite, dokler ga testo ne vpije in ne postane svilnato.',
  ],
};
const SL_POOLISH_MIXER_P2: Phase = {
  title: 'Faza 2: Končno gnetenje (Mešalnik)',
  steps: [
    'Hladni Poolish prelijte neposredno v posodo mešalnika.',
    'Dodajte preostalo moko in večji del vode ter zaženite mešalnik pri 1. hitrosti.',
    'Dodajte sol in počasi v tankem curku dolivajte preostalo vodo, medtem ko mešalnik dela.',
    'Vlijte oljčno olje in gnetite, dokler testo popolnoma ne vpije olja in ne postane gladko.',
  ],
};
const SL_POOLISH_P3: Phase = {
  title: 'Faza 3: Počitek, kepice in peka',
  steps: [
    'Testo oblikujte v kroglo, dajte v naoljeno posodo in pokrijte.',
    'Pustite počivati 30 minut pri sobni temperaturi.',
    'Naredite en stretch & fold z rokami, nato pustite še 30 minut pri sobni temperaturi.',
    'Testo razdelite in oblikujte gladke kepice po 260–280 g.',
    'Kepice zložite v posodo za testo in pustite pri sobni temp. 3 do 4 ure pred peko.',
    'Kepico raztegnite na zdrobu, obložite in pecite pri najvišji temperaturi pečice.',
  ],
};

// ============================ PACKS ============================
export const BIGA_STEPS: Record<Lang, MethodSteps> = {
  hr: {
    hand:  { p1: HR_BIGA_P1, p2: HR_BIGA_HAND_P2,  p3: HR_BIGA_P3 },
    mixer: { p1: HR_BIGA_P1, p2: HR_BIGA_MIXER_P2, p3: HR_BIGA_P3 },
  },
  en: {
    hand:  { p1: EN_BIGA_P1, p2: EN_BIGA_HAND_P2,  p3: EN_BIGA_P3 },
    mixer: { p1: EN_BIGA_P1, p2: EN_BIGA_MIXER_P2, p3: EN_BIGA_P3 },
  },
  de: {
    hand:  { p1: DE_BIGA_P1, p2: DE_BIGA_HAND_P2,  p3: DE_BIGA_P3 },
    mixer: { p1: DE_BIGA_P1, p2: DE_BIGA_MIXER_P2, p3: DE_BIGA_P3 },
  },
  sl: {
    hand:  { p1: SL_BIGA_P1, p2: SL_BIGA_HAND_P2,  p3: SL_BIGA_P3 },
    mixer: { p1: SL_BIGA_P1, p2: SL_BIGA_MIXER_P2, p3: SL_BIGA_P3 },
  },
};

export const POOLISH_STEPS: Record<Lang, MethodSteps> = {
  hr: {
    hand:  { p1: HR_POOLISH_P1, p2: HR_POOLISH_HAND_P2,  p3: HR_POOLISH_P3 },
    mixer: { p1: HR_POOLISH_P1, p2: HR_POOLISH_MIXER_P2, p3: HR_POOLISH_P3 },
  },
  en: {
    hand:  { p1: EN_POOLISH_P1, p2: EN_POOLISH_HAND_P2,  p3: EN_POOLISH_P3 },
    mixer: { p1: EN_POOLISH_P1, p2: EN_POOLISH_MIXER_P2, p3: EN_POOLISH_P3 },
  },
  de: {
    hand:  { p1: DE_POOLISH_P1, p2: DE_POOLISH_HAND_P2,  p3: DE_POOLISH_P3 },
    mixer: { p1: DE_POOLISH_P1, p2: DE_POOLISH_MIXER_P2, p3: DE_POOLISH_P3 },
  },
  sl: {
    hand:  { p1: SL_POOLISH_P1, p2: SL_POOLISH_HAND_P2,  p3: SL_POOLISH_P3 },
    mixer: { p1: SL_POOLISH_P1, p2: SL_POOLISH_MIXER_P2, p3: SL_POOLISH_P3 },
  },
};

// Localized "reset checked steps" button label
export const RESET_LABEL: Record<Lang, string> = {
  hr: 'Poništi označene korake',
  en: 'Reset checked steps',
  de: 'Markierungen zurücksetzen',
  sl: 'Ponastavi označene korake',
};
