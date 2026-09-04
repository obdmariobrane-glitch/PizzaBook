import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import {
  dimensionsCalc, doughCalc, iceCalc,
  Method, OvenType, FlourType, FLOUR_PROFILES,
} from '../../src/calculator';
import { useAuth } from '../../src/auth';

const DIAMETERS = [26, 28, 30, 33, 35, 40];
const FLOURS: { key: FlourType; emoji: string; label: string }[] = [
  { key: 'caputo00', emoji: '🌾', label: 'Tipo 0 i 00' },
  { key: 'manitoba', emoji: '🥖', label: 'Manitoba / Visoki W' },
  { key: 'spelt', emoji: '🌿', label: 'Pirovo brašno' },
  { key: 'wholeWheat', emoji: '🍞', label: 'Integralno brašno' },
  { key: 'glutenFree', emoji: '🌽', label: 'Bezglutensko' },
];

export default function CalculatorHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();

  const [flour, setFlour] = useState<FlourType>('caputo00');
  const [pizzas, setPizzas] = useState(4);
  const [diameter, setDiameter] = useState(30);
  const [customDiameter, setCustomDiameter] = useState('');
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

  const SALT_PCT = 2.8;
  const OIL_PCT = 2;

  const flourProfile = FLOUR_PROFILES[flour];
  const isIdealHydration = hydration === flourProfile.ideal;
  const inRange = hydration >= flourProfile.min && hydration <= flourProfile.max;

  // Reactive calculations - RE-COMPUTE on any input change
  const dims = useMemo(() => dimensionsCalc(diameter, pizzas), [diameter, pizzas]);
  const dough = useMemo(() => doughCalc({
    pizzas, ballWeight: dims.doughBall, hydration,
    saltPct: SALT_PCT, oilPct: OIL_PCT, method,
    roomHours, roomTemp, fridgeHours, fridgeTemp,
    mixing: mixing === 'mixer' ? 'spiral' : 'hand',
    yeastType: 'fresh',
  }), [pizzas, dims.doughBall, hydration, method, roomHours, roomTemp, fridgeHours, fridgeTemp, mixing]);
  const iceNeeded = roomTemp >= 26;
  const ice = useMemo(() => iceNeeded ? iceCalc(dough.total.water, roomTemp, 4) : null, [iceNeeded, dough.total.water, roomTemp]);

  // Auto-adjust hydration when flour changes to that flour's ideal
  const changeFlour = (f: FlourType) => {
    setFlour(f);
    setHydration(FLOUR_PROFILES[f].ideal);
    try { Haptics.selectionAsync(); } catch {}
  };

  const step = (fn: () => void) => { try { Haptics.selectionAsync(); } catch {}; fn(); };

  const commitCustomDiameter = () => {
    const v = parseFloat(customDiameter);
    if (v >= 15 && v <= 60) setDiameter(Math.round(v));
    setCustomDiameter('');
  };

  const saveRecipe = async () => {
    const recipe = {
      pizzas, diameter, hydration, method, flourType: flourProfile.label,
      ballWeight: dims.doughBall,
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={styles.logo}><Text style={{ fontSize: 20 }}>🍕</Text></View>
          <Text style={styles.title}>{t.appName}</Text>
        </View>
        <Text style={styles.subtitle}>{t.calc.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl * 2, gap: SPACING.lg }} keyboardShouldPersistTaps="handled">

        {/* 1. FLOUR - vertical list, one below another */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1 · {t.calc.flourType}</Text>
          <View style={{ gap: SPACING.sm }}>
            {FLOURS.map((f) => {
              const p = FLOUR_PROFILES[f.key];
              const active = flour === f.key;
              return (
                <Pressable key={f.key} testID={`flour-${f.key}`} onPress={() => changeFlour(f.key)} style={[styles.flourRow, active && styles.flourRowActive]}>
                  <Text style={styles.flourRowEmoji}>{f.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flourRowLabel, active && { color: '#fff' }]}>{f.label}</Text>
                    <Text style={[styles.flourRowRange, active && { color: '#fff' }]}>Idealno {p.ideal}% · raspon {p.min}–{p.max}%</Text>
                  </View>
                  {active ? <Icon name="checkmark-circle" size={20} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. VELIČINA PIZZE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2 · {t.calc.dimensions}</Text>
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
          <Text style={[styles.label, { marginTop: SPACING.md }]}>{t.calc.diameter}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DIAMETERS.map((d) => (
              <Pressable key={d} testID={`diam-${d}`} onPress={() => step(() => setDiameter(d))} style={[styles.chip, diameter === d && styles.chipActive]}>
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
              <Pressable key={m.k} testID={`method-${m.k}`} onPress={() => step(() => setMethod(m.k))} style={[styles.pill, method === m.k && styles.pillActive]}>
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
              <Icon name="hand-left" size={16} color={mixing === 'hand' ? '#fff' : COLORS.brand} />
              <Text style={[styles.segText, mixing === 'hand' && { color: '#fff' }]}>{t.calc.handMixTitle}</Text>
            </Pressable>
            <Pressable testID="mix-mixer" onPress={() => step(() => setMixing('mixer'))} style={[styles.segBtn, mixing === 'mixer' && styles.segBtnActive]}>
              <Icon name="cog" size={16} color={mixing === 'mixer' ? '#fff' : COLORS.brand} />
              <Text style={[styles.segText, mixing === 'mixer' && { color: '#fff' }]}>{t.calc.mixerTitle}</Text>
            </Pressable>
          </View>
          <Pressable testID="mix-toggle" onPress={() => setShowMixSteps(!showMixSteps)} style={styles.expandBtn}>
            <Text style={styles.expandText}>{showMixSteps ? t.calc.hideSteps : t.calc.showSteps}</Text>
            <Icon name={showMixSteps ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.brand} />
          </Pressable>
          {showMixSteps ? (
            <View style={styles.stepsBox}>
              {mixing === 'hand' ? (
                <>
                  <PhaseBlock title={t.calc.handMixSteps.A.title} steps={t.calc.handMixSteps.A.steps} />
                  <PhaseBlock title={t.calc.handMixSteps.B.title} steps={t.calc.handMixSteps.B.steps} />
                  <PhaseBlock title={t.calc.handMixSteps.C.title} steps={t.calc.handMixSteps.C.steps} />
                  <PhaseBlock title={t.calc.handMixSteps.D.title} steps={t.calc.handMixSteps.D.steps} />
                </>
              ) : (
                <>
                  <PhaseBlock title={t.calc.mixerSteps.A.title} steps={t.calc.mixerSteps.A.steps} />
                  <PhaseBlock title={t.calc.mixerSteps.B.title} steps={t.calc.mixerSteps.B.steps} />
                  <PhaseBlock title={t.calc.mixerSteps.C.title} steps={t.calc.mixerSteps.C.steps} />
                  <PhaseBlock title={t.calc.mixerSteps.D.title} steps={t.calc.mixerSteps.D.steps} />
                </>
              )}
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
                <Text style={styles.subhead}>{t.calc.totals} · {pizzas} × {dims.doughBall}g = {dough.totalDough}g</Text>
                <ResultRow label={t.calc.totalFlour} value={`${dough.total.flour} g`} />
                <ResultRow label={t.calc.totalWater} value={`${dough.total.water} g`} />
                <ResultRow label={t.calc.saltAmount} value={`${dough.total.salt} g`} />
                <ResultRow label={t.calc.yeastAmount} value={`${dough.total.yeast} g`} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.recipeSection}>
                6 · Ukupno tijesto · {pizzas} × {dims.doughBall}g = {dough.totalDough}g
              </Text>
              <ResultRow label={`Brašno (${flourProfile.label})`} value={`${dough.main.flour} g`} highlight />
              {ice ? (
                <>
                  <ResultRow label={t.calc.coldWater} value={`${ice.water} g`} />
                  <ResultRow label={`🧊 ${t.calc.iceAmount}`} value={`${ice.ice} g`} highlight />
                </>
              ) : (
                <ResultRow label={`${t.calc.totalWater} (${dough.waterTemp}°C)`} value={`${dough.main.water} g`} highlight />
              )}
              <ResultRow label={t.calc.saltAmount} value={`${dough.main.salt} g`} />
              <ResultRow label={t.calc.yeastAmount + ' (svježi)'} value={`${dough.main.yeast} g`} />
              <ResultRow label={t.calc.oilAmount} value={`${dough.main.oil} g`} />
            </>
          )}

          {/* Per-pizza normative — BELOW total */}
          <Text style={[styles.recipeSection, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider }]}>
            Za 1 pizzu · {diameter} cm
          </Text>
          <ResultRow label={t.calc.doughBall} value={`${dims.doughBall} g`} />
          <ResultRow label={t.calc.sauce} value={`${dims.sauce} g`} />
          <ResultRow label={t.calc.cheese} value={`${dims.cheese} g`} />

          <Text style={styles.hint}>
            🧪 Kvasac dinamički izračunat: {dough.yeastPct}% (E_total ≈ {dough.eTotal}h) · {roomHours}h@{roomTemp}°C + {fridgeHours}h@{fridgeTemp}°C
          </Text>
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

      <Modal visible={!!moreTool} animationType="slide" onRequestClose={() => setMoreTool(null)}>
        {moreTool === 'school' && <SchoolModal onClose={() => setMoreTool(null)} />}
        {moreTool === 'leftover' && <LeftoverModal onClose={() => setMoreTool(null)} />}
        {moreTool === 'shopping' && <ShoppingModal onClose={() => setMoreTool(null)} />}
      </Modal>
    </View>
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

function PhaseBlock({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.phaseTitle}>{title}</Text>
      {steps.map((s, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
          <Text style={styles.stepText}>{s}</Text>
        </View>
      ))}
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
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  card: { backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  cardTitle: { fontSize: 13, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  subLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  flourRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  flourRowActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  flourRowEmoji: { fontSize: 28 },
  flourRowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  flourRowRange: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginTop: 2 },

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
  stepItem: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, color: COLORS.onSurface, fontSize: 13, lineHeight: 19 },
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
