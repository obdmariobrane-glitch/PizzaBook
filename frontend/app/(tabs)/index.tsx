import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform, Alert, Image, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useT } from '../../src/i18n/LanguageProvider';
import {
  BIGA_STEPS, POOLISH_STEPS, RESET_LABEL,
  PHASE_TIMER_DURATIONS, TIMER_KIND_LABEL, TIMER_NOTIF, BaseTimer,
  formatDuration, formatCountdown,
} from '../../src/i18n/prefermentSteps';
import type { Lang } from '../../src/i18n/translations';
import { scheduleLocal, cancelLocal, isPushSupported } from '../../src/notifications';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import {
  dimensionsCalc, doughCalc, iceCalc,
  Method, OvenType, FlourType, FLOUR_PROFILES, BASE_FLOURS, blendIdealHydration,
} from '../../src/calculator';
import { useAuth } from '../../src/auth';

const DIAMETERS = [26, 28, 30, 33, 35, 40];
const FLOURS: { key: FlourType; label: string; suffix: string; info?: string }[] = [
  { key: 'caputo00',   label: 'Tipo 0 / 00',           suffix: 'Idealno 68%', info: 'Klasično meko brašno za neapolitansku pizzu.\n\nPrimjeri: Caputo Pizzeria, Caputo Classica, Molino Dallagiovanna Rinforzato.\n\nW faktor ~ 260–300. Idealna hidracija 65–70%.' },
  { key: 'manitoba',   label: 'Manitoba / Visoki W',   suffix: 'Idealno 75%', info: 'Jače brašno s puno glutena za dugu hladnu fermentaciju i visoku hidraciju.\n\nPrimjeri: Caputo Cuoco, Caputo Oro, Manitoba Le 5 Stagioni.\n\nW faktor 320+. Idealna hidracija 70–80%.' },
  { key: 'spelt',      label: 'Pirovo brašno',         suffix: 'Idealno 62%', info: 'Aromatično brašno stare žitarice. Kraća fermentacija, niža hidracija.\n\nČesto se koristi u mješavini 30–50% s Tipo 00 za punoću okusa.' },
  { key: 'wholeWheat', label: 'Integralno brašno',     suffix: 'Idealno 72%', info: 'Integralno pšenično brašno. Više vlakana, tamnija boja, blago orašast okus.\n\nNajbolje u mješavini 20–40% s Tipo 00.' },
  { key: 'glutenFree', label: 'Bezglutensko brašno',   suffix: 'Idealno 80%', info: 'Poseban bezglutenski miks (npr. Caputo Fioreglut, Schär Mix B). Zahtijeva višu hidraciju i drukčiji zamjes.\n\nBez klasičnog razvoja glutena — pizza se često peče u kalupu.' },
  { key: 'custom',     label: 'Mješavina brašna (Blend)', suffix: 'Prilagođeno', info: 'Kombiniraj dva brašna A i B. Aplikacija automatski računa idealnu hidraciju kao ponderirani prosjek dvaju odabranih brašna.' },
];

export default function CalculatorHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useT();
  const { user } = useAuth();

  const [flour, setFlour] = useState<FlourType>('caputo00');
  const [blendA, setBlendA] = useState<Exclude<FlourType, 'custom'>>('caputo00');
  const [blendB, setBlendB] = useState<Exclude<FlourType, 'custom'>>('wholeWheat');
  const [blendPctA, setBlendPctA] = useState(70);
  const [pizzas, setPizzas] = useState(4);
  const [diameter, setDiameter] = useState(30);
  const [customDiameter, setCustomDiameter] = useState('');
  const [customBallWeight, setCustomBallWeight] = useState<number | null>(null);
  const [customBallInput, setCustomBallInput] = useState<string>('');
  const [method, setMethod] = useState<Method>('direct');
  const [hydration, setHydration] = useState(FLOUR_PROFILES.caputo00.ideal);
  const [roomTemp, setRoomTemp] = useState(22);
  const [roomHours, setRoomHours] = useState(2);
  const [fridgeTemp, setFridgeTemp] = useState(4);
  const [fridgeHours, setFridgeHours] = useState(24);
  const [oven, setOven] = useState<OvenType>('homeStone');
  const [mixing, setMixing] = useState<'hand' | 'mixer'>('hand');
  const [showMixSteps, setShowMixSteps] = useState(false);
  const [moreTool, setMoreTool] = useState<null | 'school' | 'leftover' | 'shopping'>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [flourInfo, setFlourInfo] = useState<null | { label: string; info: string }>(null);
  const [flourExpanded, setFlourExpanded] = useState(false);
  const [activeTimers, setActiveTimers] = useState<Record<string, { endsAt: number; label: string; notifId?: string | null }>>({});
  const alertedRef = useRef<Set<string>>(new Set());
  // ticker: force re-render each second for countdowns AND check for expired timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const active = Object.entries(activeTimers);
    if (active.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];
      for (const [k, v] of active) {
        if (v.endsAt <= now && !alertedRef.current.has(k)) expired.push(k);
      }
      if (expired.length > 0) {
        const NOTIF = TIMER_NOTIF[lang];
        for (const k of expired) alertedRef.current.add(k);
        setActiveTimers((prev) => {
          const next = { ...prev };
          for (const k of expired) delete next[k];
          AsyncStorage.setItem('activeTimers', JSON.stringify(next)).catch(() => {});
          return next;
        });
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        const firstLabel = activeTimers[expired[0]]?.label ?? '';
        Alert.alert(NOTIF.expiredAlertTitle, NOTIF.expiredAlertBody(firstLabel));
      } else {
        setTick((n) => n + 1);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [activeTimers, lang]);

  // Load persisted checkbox state
  useEffect(() => {
    AsyncStorage.getItem('completedSteps').then((v) => {
      if (v) {
        try { setCompletedSteps(JSON.parse(v) || {}); } catch {}
      }
    });
  }, []);

  const toggleStep = (key: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem('completedSteps', JSON.stringify(next)).catch(() => {});
      return next;
    });
    try { Haptics.selectionAsync(); } catch {}
  };

  const resetStepsForCurrent = () => {
    const prefix = `${method}-${mixing}-`;
    setCompletedSteps((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) {
        if (!k.startsWith(prefix)) next[k] = prev[k];
      }
      AsyncStorage.setItem('completedSteps', JSON.stringify(next)).catch(() => {});
      return next;
    });
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
  };

  // Load persisted active timers
  useEffect(() => {
    AsyncStorage.getItem('activeTimers').then((v) => {
      if (!v) return;
      try {
        const parsed = JSON.parse(v) as Record<string, { endsAt: number; label: string; notifId?: string | null }>;
        // drop already-expired timers
        const now = Date.now();
        const fresh: typeof parsed = {};
        for (const [k, val] of Object.entries(parsed)) {
          if (val && val.endsAt > now) fresh[k] = val;
        }
        setActiveTimers(fresh);
        AsyncStorage.setItem('activeTimers', JSON.stringify(fresh)).catch(() => {});
      } catch {}
    });
  }, []);

  const startTimer = async (phaseKey: string, t: BaseTimer) => {
    const key = `${phaseKey}-${t.id}`;
    if (activeTimers[key]) return; // already running
    const label = `${TIMER_KIND_LABEL[lang][t.kind]} · ${formatDuration(t.seconds, lang)}`;
    const NOTIF = TIMER_NOTIF[lang];
    let notifId: string | null = null;
    try {
      if (isPushSupported()) {
        notifId = await scheduleLocal(NOTIF.title, NOTIF.body(label), t.seconds);
      }
    } catch {}
    const endsAt = Date.now() + t.seconds * 1000;
    setActiveTimers((prev) => {
      const next = { ...prev, [key]: { endsAt, label, notifId } };
      AsyncStorage.setItem('activeTimers', JSON.stringify(next)).catch(() => {});
      return next;
    });
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const stopTimer = async (phaseKey: string, timerId: string) => {
    const key = `${phaseKey}-${timerId}`;
    const t = activeTimers[key];
    if (t?.notifId) { try { await cancelLocal(t.notifId); } catch {} }
    setActiveTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      AsyncStorage.setItem('activeTimers', JSON.stringify(next)).catch(() => {});
      return next;
    });
    try { Haptics.selectionAsync(); } catch {}
  };

  const SALT_PCT = 2.8;
  const OIL_PCT = 2;

  const flourProfile = FLOUR_PROFILES[flour];
  const isCustom = flour === 'custom';
  const customIdeal = useMemo(() => blendIdealHydration(blendA, blendB, blendPctA), [blendA, blendB, blendPctA]);
  const effectiveIdeal = isCustom ? customIdeal : flourProfile.ideal;
  const isIdealHydration = hydration === effectiveIdeal;
  const inRange = isCustom
    ? Math.abs(hydration - customIdeal) <= 3
    : (hydration >= flourProfile.min && hydration <= flourProfile.max);

  // Auto-adjust hydration when custom blend changes
  const changeFlour = (f: FlourType) => {
    setFlour(f);
    if (f === 'custom') {
      setHydration(blendIdealHydration(blendA, blendB, blendPctA));
    } else {
      setHydration(FLOUR_PROFILES[f].ideal);
    }
    try { Haptics.selectionAsync(); } catch {}
  };

  const changeBlend = (which: 'a' | 'b' | 'pct', value: any) => {
    let a = blendA, b = blendB, p = blendPctA;
    if (which === 'a') { a = value; setBlendA(value); }
    if (which === 'b') { b = value; setBlendB(value); }
    if (which === 'pct') { p = value; setBlendPctA(value); }
    if (flour === 'custom') setHydration(blendIdealHydration(a, b, p));
    try { Haptics.selectionAsync(); } catch {}
  };

  // Reactive calculations - RE-COMPUTE on any input change
  const dims = useMemo(() => dimensionsCalc(diameter, pizzas), [diameter, pizzas]);
  const effectiveBall = customBallWeight ?? dims.doughBall;
  const dough = useMemo(() => doughCalc({
    pizzas, ballWeight: effectiveBall, hydration,
    saltPct: SALT_PCT, oilPct: OIL_PCT, method,
    roomHours, roomTemp, fridgeHours, fridgeTemp,
    mixing: mixing === 'mixer' ? 'spiral' : 'hand',
    yeastType: 'fresh',
  }), [pizzas, effectiveBall, hydration, method, roomHours, roomTemp, fridgeHours, fridgeTemp, mixing]);
  const iceNeeded = roomTemp >= 26;
  const ice = useMemo(() => iceNeeded ? iceCalc(dough.total.water, roomTemp, 4) : null, [iceNeeded, dough.total.water, roomTemp]);

  // Auto-adjust hydration when flour changes to that flour's ideal
  // (uses changeFlour above)
  const step = (fn: () => void) => { try { Haptics.selectionAsync(); } catch {}; fn(); };

  const commitCustomDiameter = () => {
    const v = parseFloat(customDiameter);
    if (v >= 15 && v <= 60) { setDiameter(Math.round(v)); setCustomBallWeight(null); setCustomBallInput(''); }
    setCustomDiameter('');
  };

  const saveRecipe = async () => {
    const recipe = {
      pizzas, diameter, hydration, method, flourType: flourProfile.label,
      ballWeight: effectiveBall,
      flour: dough.total.flour, water: dough.total.water,
      salt: dough.total.salt, oil: dough.total.oil, yeast: dough.total.yeast,
      sauce: dims.sauce * pizzas, cheese: dims.cheese * pizzas,
    };
    await AsyncStorage.setItem('lastRecipe', JSON.stringify(recipe));
  };

  const onShare = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    await saveRecipe();
    if (!user) { router.push('/login'); return; }
    router.push('/new-post');
  };

  const onShopping = async () => {
    try { Haptics.selectionAsync(); } catch {}
    await saveRecipe();
    setMoreTool('shopping');
  };

  const bakingSteps =
    oven === 'homeStone' ? t.calc.homeStoneSteps :
    oven === 'ooni' ? t.calc.ooniSteps : t.calc.homePanSteps;
  const bakingTemp =
    oven === 'homeStone' ? '300°C + grill · 4–6 min' :
    oven === 'ooni' ? '430–480°C · 60–90 s' : '280°C · 8–10 min';

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1584448097639-99cf648e8def?w=600&q=60' }}
      style={[styles.root, { paddingTop: insets.top }]}
      imageStyle={styles.rootBgImage}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={styles.logo}><Text style={{ fontSize: 20 }}>🍕</Text></View>
          <Text style={styles.title}>{t.appName}</Text>
        </View>
        <Text style={styles.subtitle}>{t.calc.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl * 2, gap: SPACING.lg }} keyboardShouldPersistTaps="handled">

        {/* 1. FLOUR - collapsed header, expands on tap, auto-closes on select */}
        <View style={styles.card}>
          <Pressable
            testID="flour-header"
            onPress={() => setFlourExpanded((v) => !v)}
            style={styles.flourHeader}
          >
            <Text style={styles.flourHeaderText}>Vrste brašna</Text>
            <Icon name={flourExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.brand} />
          </Pressable>

          {flourExpanded ? (
            <View style={{ gap: 6, marginTop: SPACING.md }}>
              {FLOURS.map((f) => {
                const active = flour === f.key;
                return (
                  <View key={f.key} style={styles.flourRowWrap}>
                    <Pressable
                      testID={`flour-${f.key}`}
                      onPress={() => { changeFlour(f.key); setFlourExpanded(false); }}
                      style={[styles.flourCompact, active && styles.flourCompactActive]}
                    >
                      <Text style={[styles.flourCompactLabel, active && { color: '#fff' }]} numberOfLines={1}>{f.label}</Text>
                      {active ? <Icon name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} /> : null}
                    </Pressable>
                    {f.info ? (
                      <Pressable
                        testID={`flour-info-${f.key}`}
                        onPress={() => setFlourInfo({ label: f.label, info: f.info! })}
                        hitSlop={8}
                        style={styles.infoBtn}
                      >
                        <Icon name="information-circle-outline" size={18} color={active ? COLORS.brand : COLORS.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Blend controls stay visible when custom is selected, even if the list is collapsed */}
          {isCustom ? (
            <View style={styles.blendPanel}>
              <Text style={styles.blendTitle}>Sastav mješavine</Text>

              <Text style={styles.label}>Brašno A ({blendPctA}%)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {BASE_FLOURS.map((k) => (
                  <Pressable key={k} testID={`blendA-${k}`} onPress={() => changeBlend('a', k)} style={[styles.chip, blendA === k && styles.chipActive]}>
                    <Text style={[styles.chipText, blendA === k && styles.chipTextActive]}>{FLOUR_PROFILES[k].label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.label, { marginTop: SPACING.sm }]}>Brašno B ({100 - blendPctA}%)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {BASE_FLOURS.map((k) => (
                  <Pressable key={k} testID={`blendB-${k}`} onPress={() => changeBlend('b', k)} style={[styles.chip, blendB === k && styles.chipActive]}>
                    <Text style={[styles.chipText, blendB === k && styles.chipTextActive]}>{FLOUR_PROFILES[k].label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={[styles.row, { marginTop: SPACING.sm }]}>
                <Text style={styles.label}>Udio Brašna A</Text>
                <View style={styles.stepper}>
                  <Pressable testID="blendPct-minus" onPress={() => changeBlend('pct', Math.max(5, blendPctA - 5))} style={styles.stepBtn}>
                    <Icon name="remove" size={20} color={COLORS.brand} />
                  </Pressable>
                  <Text style={styles.stepVal}>{blendPctA}%</Text>
                  <Pressable testID="blendPct-plus" onPress={() => changeBlend('pct', Math.min(95, blendPctA + 5))} style={styles.stepBtn}>
                    <Icon name="add" size={20} color={COLORS.brand} />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.hint}>
                Idealna hidracija mješavine: {customIdeal}% ({FLOUR_PROFILES[blendA].ideal}% × {blendPctA}% + {FLOUR_PROFILES[blendB].ideal}% × {100 - blendPctA}%)
              </Text>
            </View>
          ) : null}
        </View>

        {/* 2. VELIČINA PIZZE */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>2 · {t.calc.dimensions}</Text>
            <Image source={require('../../assets/images/pizza-slice.png')} style={styles.pizzaBadge} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t.calc.pizzas}</Text>
            <View style={styles.stepper}>
              <Pressable testID="pizza-minus" onPress={() => step(() => setPizzas(Math.max(1, pizzas - 1)))} style={styles.stepBtn}>
                <Icon name="remove" size={22} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{pizzas}</Text>
              <Pressable testID="pizza-plus" onPress={() => step(() => setPizzas(Math.min(50, pizzas + 1)))} style={styles.stepBtn}>
                <Icon name="add" size={22} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>

          {/* Ball weight (grams) — manual override */}
          <View style={[styles.ballRow, { marginTop: SPACING.sm }]}>
            <View style={styles.ballLabelCol}>
              <Text style={styles.label}>Gramaža lopte</Text>
              <Text style={styles.subLabel} numberOfLines={2}>
                {customBallWeight != null ? `Ručno · zadano ${dims.doughBall}g` : `Auto po promjeru: ${dims.doughBall}g`}
              </Text>
            </View>
            <View style={styles.ballStepper}>
              <Pressable
                testID="ball-minus"
                onPress={() => step(() => setCustomBallWeight(Math.max(50, (customBallWeight ?? dims.doughBall) - 5)))}
                style={styles.stepBtn}
              >
                <Icon name="remove" size={20} color={COLORS.brand} />
              </Pressable>
              <TextInput
                testID="ball-input"
                value={customBallInput !== '' ? customBallInput : String(effectiveBall)}
                onChangeText={(txt) => {
                  const clean = txt.replace(/[^0-9]/g, '').slice(0, 4);
                  setCustomBallInput(clean);
                  const n = parseInt(clean, 10);
                  if (!isNaN(n) && n >= 50 && n <= 600) setCustomBallWeight(n);
                }}
                onBlur={() => setCustomBallInput('')}
                keyboardType="number-pad"
                style={styles.stepInput}
                selectTextOnFocus
              />
              <Text style={styles.stepUnit}>g</Text>
              <Pressable
                testID="ball-plus"
                onPress={() => step(() => setCustomBallWeight(Math.min(600, (customBallWeight ?? dims.doughBall) + 5)))}
                style={styles.stepBtn}
              >
                <Icon name="add" size={20} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>
          {customBallWeight != null ? (
            <Pressable
              testID="ball-reset"
              onPress={() => { setCustomBallWeight(null); setCustomBallInput(''); try { Haptics.selectionAsync(); } catch {} }}
              style={styles.resetInlineBtn}
            >
              <Icon name="refresh" size={12} color={COLORS.muted} />
              <Text style={styles.resetInlineText}>Vrati automatski izračun</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.label, { marginTop: SPACING.md }]}>{t.calc.diameter}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DIAMETERS.map((d) => (
              <Pressable key={d} testID={`diam-${d}`} onPress={() => step(() => { setDiameter(d); setCustomBallWeight(null); setCustomBallInput(''); })} style={[styles.chip, diameter === d && styles.chipActive]}>
                <Text style={[styles.chipText, diameter === d && styles.chipTextActive]}>{d} cm</Text>
              </Pressable>
            ))}
            <TextInput
              testID="custom-diameter"
              value={customDiameter}
              onChangeText={setCustomDiameter}
              onBlur={commitCustomDiameter}
              onSubmitEditing={commitCustomDiameter}
              keyboardType="number-pad"
              placeholder="cm"
              placeholderTextColor={COLORS.muted}
              style={styles.customInput}
            />
          </ScrollView>

          {/* Proportional pizza preview — real-size ratio (26 vs 40 cm) */}
          <View style={styles.pizzaPreviewWrap}>
            <View style={styles.pizzaScale}>
              {/* Faded reference: 40cm (max) */}
              <View style={[styles.pizzaCircleGhost, { width: 200, height: 200 }]} />
              {/* Current diameter — scales relative to 40cm max */}
              <View style={[styles.pizzaCircle, { width: 200 * (diameter / 40), height: 200 * (diameter / 40) }]}>
                <Text style={styles.pizzaCircleText}>{diameter} cm</Text>
              </View>
            </View>
            <Text style={styles.pizzaPreviewHint}>Prava proporcija (referenca: 40 cm)</Text>
          </View>
        </View>

        {/* 3. METHOD + HYDRATION + TEMP */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3 · {t.calc.method} + {t.calc.hydration}</Text>

          <Text style={styles.label}>{t.calc.method}</Text>
          <View style={styles.pillGroup}>
            {[
              { k: 'direct' as const, l: t.calc.direct },
              { k: 'biga' as const, l: t.calc.biga },
              { k: 'poolish' as const, l: t.calc.poolish },
            ].map((m) => (
              <Pressable
                key={m.k}
                testID={`method-${m.k}`}
                onPress={() => { try { Haptics.selectionAsync(); } catch {}; setMethod(m.k); setShowMixSteps(true); }}
                style={[styles.pill, method === m.k && styles.pillActive]}
              >
                <Text style={[styles.pillText, method === m.k && styles.pillTextActive]}>{m.l}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.hydRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t.calc.hydration}</Text>
              <Text style={styles.subLabel}>{t.calc.idealHydration}: {flourProfile.min}–{flourProfile.max}% (◎ {flourProfile.ideal}%)</Text>
            </View>
            <View style={[styles.stepper, isIdealHydration && styles.stepperIdeal, !isIdealHydration && inRange && styles.stepperInRange]}>
              <Pressable testID="hyd-minus" onPress={() => step(() => setHydration(Math.max(50, hydration - 1)))} style={styles.stepBtn}>
                <Icon name="remove" size={20} color={isIdealHydration ? COLORS.success : COLORS.brand} />
              </Pressable>
              <Text style={[styles.stepVal, isIdealHydration && { color: COLORS.success }]}>{hydration}%</Text>
              <Pressable testID="hyd-plus" onPress={() => step(() => setHydration(Math.min(95, hydration + 1)))} style={styles.stepBtn}>
                <Icon name="add" size={20} color={isIdealHydration ? COLORS.success : COLORS.brand} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.row, { marginTop: SPACING.md }]}>
            <Text style={styles.label}>{t.calc.roomTemp}</Text>
            <View style={styles.stepper}>
              <Pressable testID="rt-minus" onPress={() => step(() => setRoomTemp(Math.max(10, roomTemp - 1)))} style={styles.stepBtn}>
                <Icon name="remove" size={20} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{roomTemp}°C</Text>
              <Pressable testID="rt-plus" onPress={() => step(() => setRoomTemp(Math.min(35, roomTemp + 1)))} style={styles.stepBtn}>
                <Icon name="add" size={20} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.row, { marginTop: SPACING.sm }]}>
            <Text style={styles.label}>Sati na sobnoj temp.</Text>
            <View style={styles.stepper}>
              <Pressable testID="rh-minus" onPress={() => step(() => setRoomHours(Math.max(0, roomHours - 1)))} style={styles.stepBtn}>
                <Icon name="remove" size={20} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{roomHours}h</Text>
              <Pressable testID="rh-plus" onPress={() => step(() => setRoomHours(Math.min(24, roomHours + 1)))} style={styles.stepBtn}>
                <Icon name="add" size={20} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.row, { marginTop: SPACING.sm }]}>
            <Text style={styles.label}>Sati u hladnjaku</Text>
            <View style={styles.stepper}>
              <Pressable testID="fh-minus" onPress={() => step(() => setFridgeHours(Math.max(0, fridgeHours - 2)))} style={styles.stepBtn}>
                <Icon name="remove" size={20} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{fridgeHours}h</Text>
              <Pressable testID="fh-plus" onPress={() => step(() => setFridgeHours(Math.min(72, fridgeHours + 2)))} style={styles.stepBtn}>
                <Icon name="add" size={20} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.row, { marginTop: SPACING.sm }]}>
            <Text style={styles.label}>Temp. hladnjaka</Text>
            <View style={styles.stepper}>
              <Pressable testID="ft-minus" onPress={() => step(() => setFridgeTemp(Math.max(2, fridgeTemp - 1)))} style={styles.stepBtn}>
                <Icon name="remove" size={20} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{fridgeTemp}°C</Text>
              <Pressable testID="ft-plus" onPress={() => step(() => setFridgeTemp(Math.min(10, fridgeTemp + 1)))} style={styles.stepBtn}>
                <Icon name="add" size={20} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* 4. MIXING */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4 · {t.calc.mixingTitle}</Text>
          <View style={styles.segmentedRow}>
            <Pressable testID="mix-hand" onPress={() => step(() => setMixing('hand'))} style={[styles.segBtn, mixing === 'hand' && styles.segBtnActive]}>
              <Image source={require('../../assets/images/icon-hand.png')} style={styles.mixIcon} resizeMode="contain" />
              <Text style={[styles.segText, mixing === 'hand' && { color: '#fff' }]}>{t.calc.handMixTitle}</Text>
            </Pressable>
            <Pressable testID="mix-mixer" onPress={() => step(() => setMixing('mixer'))} style={[styles.segBtn, mixing === 'mixer' && styles.segBtnActive]}>
              <Image source={require('../../assets/images/icon-cog.png')} style={styles.mixIcon} resizeMode="contain" />
              <Text style={[styles.segText, mixing === 'mixer' && { color: '#fff' }]}>{t.calc.mixerTitle}</Text>
            </Pressable>
          </View>
          <Pressable testID="mix-toggle" onPress={() => setShowMixSteps(!showMixSteps)} style={styles.expandBtn}>
            <Text style={styles.expandText}>{showMixSteps ? t.calc.hideSteps : t.calc.showSteps}</Text>
            <Icon name={showMixSteps ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.brand} />
          </Pressable>
          {showMixSteps ? (
            <View style={styles.stepsBox}>
              {method === 'direct' ? (
                mixing === 'hand' ? (
                  <>
                    <PhaseBlock title={t.calc.handMixSteps.A.title} steps={t.calc.handMixSteps.A.steps} phaseKey={`direct-hand-A`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.handMixSteps.B.title} steps={t.calc.handMixSteps.B.steps} phaseKey={`direct-hand-B`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.handMixSteps.C.title} steps={t.calc.handMixSteps.C.steps} phaseKey={`direct-hand-C`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.handMixSteps.D.title} steps={t.calc.handMixSteps.D.steps} phaseKey={`direct-hand-D`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                  </>
                ) : (
                  <>
                    <PhaseBlock title={t.calc.mixerSteps.A.title} steps={t.calc.mixerSteps.A.steps} phaseKey={`direct-mixer-A`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.mixerSteps.B.title} steps={t.calc.mixerSteps.B.steps} phaseKey={`direct-mixer-B`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.mixerSteps.C.title} steps={t.calc.mixerSteps.C.steps} phaseKey={`direct-mixer-C`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    <PhaseBlock title={t.calc.mixerSteps.D.title} steps={t.calc.mixerSteps.D.steps} phaseKey={`direct-mixer-D`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                  </>
                )
              ) : method === 'biga' ? (
                (() => {
                  const path = BIGA_STEPS[lang][mixing];
                  return (
                    <>
                      <PhaseBlock title={path.p1.title} steps={path.p1.steps} phaseKey={`biga-${mixing}-P1`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                      <PhaseBlock title={path.p2.title} steps={path.p2.steps} phaseKey={`biga-${mixing}-P2`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                      <PhaseBlock title={path.p3.title} steps={path.p3.steps} phaseKey={`biga-${mixing}-P3`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    </>
                  );
                })()
              ) : (
                (() => {
                  const path = POOLISH_STEPS[lang][mixing];
                  return (
                    <>
                      <PhaseBlock title={path.p1.title} steps={path.p1.steps} phaseKey={`poolish-${mixing}-P1`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                      <PhaseBlock title={path.p2.title} steps={path.p2.steps} phaseKey={`poolish-${mixing}-P2`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                      <PhaseBlock title={path.p3.title} steps={path.p3.steps} phaseKey={`poolish-${mixing}-P3`} completed={completedSteps} onToggle={toggleStep} activeTimers={activeTimers} onStartTimer={startTimer} onStopTimer={stopTimer} lang={lang} />
                    </>
                  );
                })()
              )}
              <Pressable testID="reset-steps" onPress={resetStepsForCurrent} style={styles.resetBtn}>
                <Icon name="refresh" size={14} color={COLORS.muted} />
                <Text style={styles.resetBtnText}>{RESET_LABEL[lang]}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 5. BAKING */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>5 · {t.calc.baking}</Text>
          <View style={styles.ovenRow}>
            <OvenCard active={oven === 'homeStone'} onPress={() => step(() => setOven('homeStone'))} icon="home" title={t.calc.homeStone} testID="oven-homeStone" />
            <OvenCard active={oven === 'ooni'} onPress={() => step(() => setOven('ooni'))} icon="flame" title={t.calc.ooni} testID="oven-ooni" />
            <OvenCard active={oven === 'homePan'} onPress={() => step(() => setOven('homePan'))} icon="restaurant" title={t.calc.homePan} testID="oven-homePan" />
          </View>
          <View style={styles.bakeInstructions}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
              <Icon name="flame" size={16} color={COLORS.brand} />
              <Text style={styles.bakeText}>{bakingTemp}</Text>
            </View>
            <Text style={styles.bakeBody}>{bakingSteps}</Text>
          </View>
        </View>

        {/* 6. RESULT - AT BOTTOM: Total FIRST, then per-pizza */}
        <View style={styles.recipeCard}>
          {dough.preferment ? (
            <>
              <Text style={styles.recipeSection}>
                6 · {t.calc.preferment} · {method === 'biga' ? 'BIGA 50%' : 'POOLISH 35%'}
              </Text>
              <ResultRow label={t.calc.totalFlour} value={`${dough.preferment.flour} g`} highlight />
              <ResultRow label={t.calc.totalWater} value={`${dough.preferment.water} g`} highlight />
              <ResultRow label={t.calc.yeastAmount + ' (svježi)'} value={`${dough.preferment.yeast} g`} />
              {method === 'poolish' ? (
                <Text style={styles.hint}>+ kap meda za bolju aktivaciju · 12-14h na 18-20°C</Text>
              ) : (
                <Text style={styles.hint}>16-18h fermentacija na 18-20°C prije glavnog zamjesa</Text>
              )}

              <Text style={[styles.recipeSection, { marginTop: SPACING.md }]}>{t.calc.mainDough}</Text>
              <ResultRow label={t.calc.remainingFlour} value={`${dough.main.flour} g`} highlight />
              {ice ? (
                <>
                  <ResultRow label={`${t.calc.coldWater} (preostala)`} value={`${Math.max(0, dough.main.water - ice.ice)} g`} />
                  <ResultRow label={`🧊 ${t.calc.iceAmount}`} value={`${ice.ice} g`} highlight />
                </>
              ) : (
                <ResultRow label={`${t.calc.remainingWater} (${dough.waterTemp}°C)`} value={`${dough.main.water} g`} highlight />
              )}
              <ResultRow label={t.calc.saltAmount} value={`${dough.main.salt} g`} />
              <ResultRow label={t.calc.oilAmount} value={`${dough.main.oil} g`} />

              <View style={styles.subBlock}>
                <Text style={styles.subhead}>{t.calc.totals} · {pizzas} × {effectiveBall}g = {dough.totalDough}g</Text>
                <ResultRow label={t.calc.totalFlour} value={`${dough.total.flour} g`} />
                <ResultRow label={t.calc.totalWater} value={`${dough.total.water} g`} />
                <ResultRow label={t.calc.saltAmount} value={`${dough.total.salt} g`} />
                <ResultRow label={t.calc.yeastAmount} value={`${dough.total.yeast} g`} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.recipeSection}>
                6 · Ukupno tijesto · {pizzas} × {effectiveBall}g = {dough.totalDough}g
              </Text>
              {isCustom ? (
                <>
                  <ResultRow label={`${FLOUR_PROFILES[blendA].label} (${blendPctA}%)`} value={`${Math.round(dough.main.flour * blendPctA / 100)} g`} highlight />
                  <ResultRow label={`${FLOUR_PROFILES[blendB].label} (${100 - blendPctA}%)`} value={`${Math.round(dough.main.flour * (100 - blendPctA) / 100)} g`} highlight />
                  <ResultRow label="Ukupno brašno" value={`${dough.main.flour} g`} />
                </>
              ) : (
                <ResultRow label={`Brašno (${flourProfile.label})`} value={`${dough.main.flour} g`} highlight />
              )}
              {ice ? (
                <>
                  <ResultRow label={t.calc.coldWater} value={`${ice.water} g`} />
                  <ResultRow label={`🧊 ${t.calc.iceAmount}`} value={`${ice.ice} g`} highlight />
                </>
              ) : (
                <ResultRow label={`${t.calc.totalWater} (${dough.waterTemp}°C)`} value={`${dough.main.water} g`} highlight />
              )}
              <ResultRow label={t.calc.saltAmount} value={`${dough.main.salt} g`} />
              <ResultRow label={`${t.calc.yeastAmount} (svježi, ${dough.yeastPct}%)`} value={`${dough.main.yeast} g`} />
              <ResultRow label={t.calc.oilAmount} value={`${dough.main.oil} g`} />
            </>
          )}

          {/* Per-pizza normative — BELOW total */}
          <Text style={[styles.recipeSection, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider }]}>
            Za 1 pizzu · {diameter} cm
          </Text>
          <ResultRow label={t.calc.doughBall} value={`${effectiveBall} g`} />
          <ResultRow label={t.calc.sauce} value={`${dims.sauce} g`} />
          <ResultRow label={t.calc.cheese} value={`${dims.cheese} g`} />
        </View>

        {/* 7. ACTIONS */}
        <View style={styles.actionsRow}>
          <Pressable testID="add-shopping" style={[styles.actionBtn, { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border }]} onPress={onShopping}>
            <Icon name="cart" size={18} color={COLORS.brand} />
            <Text style={[styles.actionBtnText, { color: COLORS.brand }]}>{t.shopping.title}</Text>
          </Pressable>
          <Pressable testID="share-community" style={[styles.actionBtn, { backgroundColor: COLORS.brand }]} onPress={onShare}>
            <Icon name="share" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Podijeli na Zid</Text>
          </Pressable>
        </View>

        {/* Footer links */}
        <View style={styles.moreRow}>
          <MoreLink icon="book" label={t.calc.school} onPress={() => setMoreTool('school')} testID="more-school" />
          <MoreLink icon="restaurant-outline" label={t.calc.leftover} onPress={() => setMoreTool('leftover')} testID="more-leftover" />
        </View>

      </ScrollView>

      {/* Floating active-timers bar */}
      {Object.keys(activeTimers).length > 0 ? (
        <View style={[styles.floatingTimers, { bottom: insets.bottom + 70 }]} pointerEvents="box-none">
          <View style={styles.floatingTimersInner}>
            <Icon name="alarm" size={16} color={COLORS.brand} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingRight: 6 }}>
              {Object.entries(activeTimers).map(([key, val]) => {
                const remaining = val.endsAt - Date.now();
                return (
                  <Pressable
                    key={key}
                    testID={`floating-timer-${key}`}
                    onPress={() => {
                      const idx = key.lastIndexOf('-');
                      const pk = key.substring(0, idx);
                      const tid = key.substring(idx + 1);
                      stopTimer(pk, tid);
                    }}
                    style={styles.floatingChip}
                  >
                    <Text style={styles.floatingChipLabel} numberOfLines={1}>{val.label}</Text>
                    <Text style={styles.floatingChipTime}>{formatCountdown(remaining)}</Text>
                    <Icon name="close" size={12} color="#fff" />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <Modal visible={!!moreTool} animationType="slide" onRequestClose={() => setMoreTool(null)}>
        {moreTool === 'school' && <SchoolModal onClose={() => setMoreTool(null)} />}
        {moreTool === 'leftover' && <LeftoverModal onClose={() => setMoreTool(null)} />}
        {moreTool === 'shopping' && <ShoppingModal onClose={() => setMoreTool(null)} />}
      </Modal>

      {/* Flour info tooltip modal */}
      <Modal visible={!!flourInfo} animationType="fade" transparent onRequestClose={() => setFlourInfo(null)}>
        <Pressable style={styles.tooltipBackdrop} onPress={() => setFlourInfo(null)}>
          <Pressable style={styles.tooltipCard} onPress={() => {}}>
            <View style={styles.tooltipHeader}>
              <Icon name="information-circle" size={20} color={COLORS.brand} />
              <Text style={styles.tooltipTitle}>{flourInfo?.label}</Text>
              <Pressable onPress={() => setFlourInfo(null)} hitSlop={8}>
                <Icon name="close" size={20} color={COLORS.muted} />
              </Pressable>
            </View>
            <Text style={styles.tooltipBody}>{flourInfo?.info}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}

// ============= HELPERS =============
function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.resRow}>
      <Text style={styles.resLabel}>{label}</Text>
      <Text style={[styles.resValue, highlight && { color: COLORS.brand, fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

function PhaseBlock({
  title, steps, phaseKey, completed, onToggle,
  activeTimers, onStartTimer, onStopTimer, lang,
}: {
  title: string;
  steps: readonly string[];
  phaseKey: string;
  completed: Record<string, boolean>;
  onToggle: (key: string) => void;
  activeTimers: Record<string, { endsAt: number; label: string; notifId?: string | null }>;
  onStartTimer: (phaseKey: string, t: BaseTimer) => void;
  onStopTimer: (phaseKey: string, timerId: string) => void;
  lang: Lang;
}) {
  const timers = PHASE_TIMER_DURATIONS[phaseKey] || [];
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.phaseTitle}>{title}</Text>
      {timers.length > 0 ? (
        <View style={styles.timerRow}>
          {timers.map((tm) => {
            const key = `${phaseKey}-${tm.id}`;
            const active = activeTimers[key];
            const remaining = active ? active.endsAt - Date.now() : 0;
            const kindLabel = TIMER_KIND_LABEL[lang][tm.kind];
            return (
              <Pressable
                key={key}
                testID={`timer-${key}`}
                onPress={() => (active ? onStopTimer(phaseKey, tm.id) : onStartTimer(phaseKey, tm))}
                style={[styles.timerChip, active && styles.timerChipActive]}
              >
                <Icon
                  name={active ? 'stop-circle' : 'play-circle'}
                  size={14}
                  color={active ? '#fff' : COLORS.brand}
                />
                <Text style={[styles.timerChipText, active && { color: '#fff' }]}>
                  {kindLabel}
                </Text>
                <Text style={[styles.timerChipDuration, active && { color: '#fff' }]}>
                  {active ? formatCountdown(remaining) : formatDuration(tm.seconds, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {steps.map((s, i) => {
        const key = `${phaseKey}-${i}`;
        const done = !!completed[key];
        return (
          <Pressable
            key={i}
            testID={`step-${key}`}
            onPress={() => onToggle(key)}
            style={({ pressed }) => [styles.stepItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.stepCheckWrap}>
              {done ? (
                <View style={styles.stepCheckDone}>
                  <Icon name="checkmark" size={14} color="#fff" />
                </View>
              ) : (
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.stepText, done && styles.stepTextDone]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OvenCard({ active, onPress, icon, title, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.ovenCard, active && styles.ovenCardActive]}>
      <View style={[styles.ovenIconWrap, active && styles.ovenIconWrapActive]}>
        <Icon name={icon} size={28} color={active ? '#fff' : COLORS.brand} />
      </View>
      <Text style={[styles.ovenText, active && { color: '#fff' }]} numberOfLines={2}>{title}</Text>
    </Pressable>
  );
}

function MoreLink({ icon, label, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.moreLink}>
      <Icon name={icon} size={16} color={COLORS.brand} />
      <Text style={styles.moreLinkText}>{label}</Text>
    </Pressable>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.sm }]}>
      <Pressable onPress={onClose} testID="modal-close"><Icon name="close" size={26} color={COLORS.onSurface} /></Pressable>
      <Text style={styles.modalTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

// ============= MODALS =============
function SchoolModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.school.title} onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl }}>
        {t.school.rules.map((r, i) => (
          <View key={i} style={styles.ruleCard}>
            <Icon name="star" size={16} color={COLORS.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleTitle}>{r.title}</Text>
              <Text style={styles.ruleBody}>{r.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function LeftoverModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.leftover.title} onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl }}>
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>{t.leftover.subtitle}</Text>
        {t.leftover.tips.map((tip, i) => (
          <View key={i} style={styles.ruleCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleTitle}>{tip.title}</Text>
              <Text style={styles.ruleBody}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ShoppingModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [recipe, setRecipe] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useMemo(() => {
    AsyncStorage.getItem('lastRecipe').then((v) => { if (v) setRecipe(JSON.parse(v)); });
  }, []);

  if (!recipe) {
    return (
      <View style={styles.modalRoot}>
        <ModalHeader title={t.shopping.title} onClose={onClose} />
      </View>
    );
  }

  const items = [
    { key: 'flour', qty: `${recipe.flour} g`, name: `Brašno (${recipe.flourType || '00'})` },
    { key: 'water', qty: `${recipe.water} g`, name: 'Voda' },
    { key: 'salt', qty: `${recipe.salt} g`, name: 'Sol' },
    { key: 'yeast', qty: `${recipe.yeast} g`, name: 'Kvasac' },
    ...(recipe.oil > 0 ? [{ key: 'oil', qty: `${recipe.oil} g`, name: 'Maslinovo ulje' }] : []),
    ...(recipe.sauce ? [{ key: 'sauce', qty: `${recipe.sauce} g`, name: 'Pelat / rajčica' }] : []),
    ...(recipe.cheese ? [{ key: 'cheese', qty: `${recipe.cheese} g`, name: 'Mozzarella / Fior di Latte' }] : []),
  ];

  const listText = `Pizzabook - Recept za ${recipe.pizzas} pizze:\n\n` +
    items.map((it) => `☐ ${it.qty} — ${it.name}`).join('\n');

  const doCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(listText);
      } else {
        const clip = await import('expo-clipboard').catch(() => null);
        if (clip?.setStringAsync) await clip.setStringAsync(listText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.shopping.title} onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl }}>
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>{t.shopping.subtitle}</Text>
        <View style={styles.recipeCard}>
          <Text style={styles.recipeSection}>Za {recipe.pizzas} pizze · {recipe.hydration}% · {recipe.method}</Text>
          {items.map((it) => (
            <Pressable
              key={it.key}
              testID={`shop-${it.key}`}
              style={styles.checkRow}
              onPress={() => setChecked({ ...checked, [it.key]: !checked[it.key] })}
            >
              <Icon name={checked[it.key] ? 'checkbox' : 'square-outline'} size={22} color={checked[it.key] ? COLORS.brand : COLORS.muted} />
              <Text style={[styles.checkLabel, checked[it.key] && { textDecorationLine: 'line-through', color: COLORS.muted }]}>{it.name}</Text>
              <Text style={[styles.checkQty, checked[it.key] && { color: COLORS.muted }]}>{it.qty}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.copyBtn} onPress={doCopy} testID="copy-shopping-btn">
          <Icon name={copied ? 'checkmark' : 'copy'} size={16} color="#fff" />
          <Text style={styles.copyBtnText}>{copied ? t.shopping.copied : t.shopping.copy}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ============= STYLES =============
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  rootBgImage: { opacity: 0.18 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  card: { backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  cardTitle: { fontSize: 13, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pizzaBadge: { width: 44, height: 44, marginBottom: SPACING.sm },
  mixingHero: { width: '100%', height: 100, marginBottom: SPACING.sm },
  mixIcon: { width: 22, height: 22 },
  // Proportional pizza preview
  pizzaPreviewWrap: { alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 6 },
  pizzaScale: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  pizzaCircleGhost: { position: 'absolute', borderRadius: 100, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: 'transparent' },
  pizzaCircle: { borderRadius: 100, backgroundColor: COLORS.brandTertiary, borderWidth: 2, borderColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  pizzaCircleText: { color: COLORS.brand, fontSize: 15, fontWeight: '800' },
  pizzaPreviewHint: { fontSize: 11, color: COLORS.muted, fontStyle: 'italic' },
  stepInput: { fontSize: 15, fontWeight: '800', color: COLORS.onSurface, minWidth: 38, maxWidth: 46, textAlign: 'center', padding: 0 },
  stepUnit: { fontSize: 12, color: COLORS.muted, fontWeight: '700', marginLeft: -2 },
  ballRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ballLabelCol: { flex: 1, minWidth: 0 },
  ballStepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 4, borderWidth: 1, borderColor: COLORS.border, flexShrink: 0 },
  resetInlineBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  resetInlineText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  subLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  flourRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  flourRowActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  flourRowEmoji: { fontSize: 28 },
  flourRowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  flourRowSub: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontStyle: 'italic' },
  flourRowRange: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginTop: 2 },
  // NEW compact single-line flour row
  flourHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  flourHeaderText: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  flourRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flourCompact: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, minHeight: 42 },
  flourCompactActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  flourCompactLabel: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface, flexShrink: 1 },
  flourCompactSuffix: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginLeft: 6, flexShrink: 0 },
  infoBtn: { width: 26, height: 32, alignItems: 'center', justifyContent: 'center' },
  tooltipBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  tooltipCard: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tooltipTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.onSurface },
  tooltipBody: { fontSize: 13, color: COLORS.onSurfaceTertiary, lineHeight: 20 },
  // Timer chips
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  timerChipActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  timerChipText: { color: COLORS.onSurface, fontSize: 11, fontWeight: '700' },
  timerChipDuration: { color: COLORS.brand, fontSize: 12, fontWeight: '800', marginLeft: 2 },
  // Floating timer bar
  floatingTimers: { position: 'absolute', left: SPACING.md, right: SPACING.md },
  floatingTimersInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.pill, paddingLeft: SPACING.md, paddingRight: 4, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.success },
  floatingChipLabel: { color: '#fff', fontSize: 11, fontWeight: '700', maxWidth: 110 },
  floatingChipTime: { color: '#fff', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  blendPanel: { marginTop: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.brandTertiary, borderRadius: RADIUS.md, gap: SPACING.sm },
  blendTitle: { fontSize: 12, fontWeight: '800', color: COLORS.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  stepperIdeal: { borderColor: COLORS.success, backgroundColor: '#DCFCE7' },
  stepperInRange: { borderColor: COLORS.brand },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 16, fontWeight: '800', color: COLORS.onSurface, minWidth: 42, textAlign: 'center' },

  chipRow: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  customInput: { minWidth: 64, height: 36, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.borderStrong, borderStyle: 'dashed', paddingHorizontal: SPACING.md, fontSize: 13, color: COLORS.onSurface, textAlign: 'center' },

  pillGroup: { flexDirection: 'row', gap: SPACING.sm },
  pill: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  pillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  pillText: { color: COLORS.onSurface, fontSize: 14, fontWeight: '700' },
  pillTextActive: { color: '#fff' },

  hydRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-end', marginTop: SPACING.md },

  segmentedRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: RADIUS.sm },
  segBtnActive: { backgroundColor: COLORS.brand },
  segText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '700' },
  expandBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  expandText: { color: COLORS.brand, fontSize: 13, fontWeight: '700' },
  stepsBox: { gap: SPACING.sm, paddingTop: SPACING.sm },
  stepItem: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', marginBottom: 6, paddingVertical: 4 },
  stepCheckWrap: { marginTop: 2 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepCheckDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, color: COLORS.onSurface, fontSize: 13, lineHeight: 19 },
  stepTextDone: { textDecorationLine: 'line-through', color: COLORS.muted },
  resetBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginTop: 4 },
  resetBtnText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  phaseTitle: { fontSize: 13, color: COLORS.brand, fontWeight: '800', marginBottom: SPACING.sm, textTransform: 'uppercase' },

  ovenRow: { flexDirection: 'row', gap: SPACING.sm },
  ovenCard: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 6, minHeight: 88 },
  ovenCardActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  ovenIconWrap: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  ovenIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  ovenEmoji: { fontSize: 30 },
  ovenText: { color: COLORS.onSurface, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  bakeInstructions: { marginTop: SPACING.md, gap: SPACING.sm, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  bakeText: { fontSize: 14, color: COLORS.onSurface, fontWeight: '700' },
  bakeBody: { fontSize: 13, color: COLORS.onSurfaceTertiary, lineHeight: 19 },

  recipeCard: { backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  recipeSection: { fontSize: 13, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  resLabel: { color: COLORS.muted, fontSize: 14, flex: 1 },
  resValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '700' },
  subBlock: { marginTop: SPACING.md, gap: 4, paddingTop: SPACING.sm, borderTopWidth: 2, borderTopColor: COLORS.brand },
  subhead: { fontSize: 12, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginTop: 4, marginBottom: 4 },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: RADIUS.md },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  moreRow: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center', paddingVertical: SPACING.md },
  moreLink: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  moreLinkText: { color: COLORS.brand, fontSize: 13, fontWeight: '600' },

  modalRoot: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  ruleCard: { flexDirection: 'row', gap: SPACING.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  ruleTitle: { fontSize: 15, fontWeight: '800', color: COLORS.onSurface, marginBottom: 4 },
  ruleBody: { fontSize: 14, color: COLORS.onSurfaceTertiary, lineHeight: 20 },
  copyBtn: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: RADIUS.md, marginTop: SPACING.sm },
  copyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  checkRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  checkLabel: { flex: 1, color: COLORS.onSurface, fontSize: 14 },
  checkQty: { color: COLORS.brand, fontSize: 14, fontWeight: '700' },
});
