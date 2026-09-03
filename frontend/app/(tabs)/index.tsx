import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { dimensionsCalc, doughCalc, bakingCalc, iceCalc, Method, OvenType } from '../../src/calculator';
import { useAuth } from '../../src/auth';

const DIAMETERS = [26, 28, 30, 33, 35, 40];
const HYDRATIONS = [60, 62, 65, 68, 70, 72, 75, 78, 80];
const ROOM_TEMPS = [18, 22, 26, 28];

export default function CalculatorHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();

  const [pizzas, setPizzas] = useState(4);
  const [diameter, setDiameter] = useState(30);
  const [customDiameter, setCustomDiameter] = useState('');
  const [method, setMethod] = useState<Method>('direct');
  const [hydration, setHydration] = useState(68);
  const [roomTemp, setRoomTemp] = useState(22);
  const [oven, setOven] = useState<OvenType>('homeStone');
  const [moreTool, setMoreTool] = useState<null | 'school' | 'leftover' | 'shopping'>(null);

  // Compute reactive
  const dims = useMemo(() => dimensionsCalc(diameter, pizzas), [diameter, pizzas]);
  const dough = useMemo(() => doughCalc({
    pizzas, ballWeight: dims.doughBall, hydration,
    saltPct: 2.8, oilPct: 2, method,
    yeastType: 'fresh', mixing: 'hand',
    roomTemp, fridgeTemp: 4, fermentation: 'coldLong',
  }), [pizzas, dims.doughBall, hydration, method, roomTemp]);
  const baking = useMemo(() => bakingCalc(oven), [oven]);
  const iceNeeded = roomTemp >= 26;
  const ice = useMemo(() => iceNeeded ? iceCalc(dough.water, roomTemp, 4) : null, [iceNeeded, dough.water, roomTemp]);

  const setPizzasSafe = (n: number) => {
    if (n < 1 || n > 20) return;
    try { Haptics.selectionAsync(); } catch {}
    setPizzas(n);
  };

  const commitCustomDiameter = () => {
    const v = parseFloat(customDiameter);
    if (v >= 15 && v <= 60) setDiameter(Math.round(v));
    setCustomDiameter('');
  };

  const saveRecipe = async () => {
    const recipe = {
      pizzas, diameter, hydration, method, flourType: '00',
      ballWeight: dims.doughBall, flour: dough.flour, water: dough.water,
      salt: dough.salt, oil: dough.oil, yeast: dough.yeast,
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={styles.logo}><Text style={{ fontSize: 20 }}>🍕</Text></View>
          <Text style={styles.title}>{t.appName}</Text>
        </View>
        <Text style={styles.subtitle}>{t.calc.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl * 2, gap: SPACING.lg }}>

        {/* 1. Dimensions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.calc.dimensions}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t.calc.pizzas}</Text>
            <View style={styles.stepper}>
              <Pressable testID="pizza-minus" onPress={() => setPizzasSafe(pizzas - 1)} style={styles.stepBtn}>
                <Icon name="remove" size={22} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.stepVal}>{pizzas}</Text>
              <Pressable testID="pizza-plus" onPress={() => setPizzasSafe(pizzas + 1)} style={styles.stepBtn}>
                <Icon name="add" size={22} color={COLORS.brand} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: SPACING.md }]}>{t.calc.diameter}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DIAMETERS.map((d) => (
              <Pressable
                key={d}
                testID={`diam-${d}`}
                onPress={() => { setDiameter(d); try { Haptics.selectionAsync(); } catch {} }}
                style={[styles.chip, diameter === d && styles.chipActive]}
              >
                <Text style={[styles.chipText, diameter === d && styles.chipTextActive]}>{d} cm</Text>
              </Pressable>
            ))}
            <View style={styles.customWrap}>
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
            </View>
          </ScrollView>
        </View>

        {/* 2. Method + Hydration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.calc.method} + {t.calc.hydration}</Text>

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
                onPress={() => { setMethod(m.k); try { Haptics.selectionAsync(); } catch {} }}
                style={[styles.pill, method === m.k && styles.pillActive]}
              >
                <Text style={[styles.pillText, method === m.k && styles.pillTextActive]}>{m.l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: SPACING.md }]}>{t.calc.hydration}: <Text style={{ color: COLORS.brand, fontWeight: '800' }}>{hydration}%</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {HYDRATIONS.map((h) => (
              <Pressable
                key={h}
                testID={`hyd-${h}`}
                onPress={() => { setHydration(h); try { Haptics.selectionAsync(); } catch {} }}
                style={[styles.chip, hydration === h && styles.chipActive]}
              >
                <Text style={[styles.chipText, hydration === h && styles.chipTextActive]}>{h}%</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { marginTop: SPACING.md }]}>{t.calc.roomTemp}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ROOM_TEMPS.map((r) => (
              <Pressable
                key={r}
                testID={`rt-${r}`}
                onPress={() => setRoomTemp(r)}
                style={[styles.chip, roomTemp === r && styles.chipActive]}
              >
                <Text style={[styles.chipText, roomTemp === r && styles.chipTextActive]}>{r}°C</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 3. Oven */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.calc.baking}</Text>
          <View style={styles.ovenRow}>
            <OvenCard active={oven === 'homeStone'} onPress={() => setOven('homeStone')} icon="flame" title={t.calc.homeStone} testID="oven-homeStone" />
            <OvenCard active={oven === 'ooni'} onPress={() => setOven('ooni')} icon="pizza" title={t.calc.ooni} testID="oven-ooni" />
            <OvenCard active={oven === 'homePan'} onPress={() => setOven('homePan')} icon="restaurant" title={t.calc.homePan} testID="oven-homePan" />
          </View>
        </View>

        {/* 4. Recipe result (realtime) */}
        <View style={styles.recipeCard}>
          <Text style={styles.recipeSection}>Za 1 pizzu · {diameter} cm</Text>
          <ResultRow label={t.calc.doughBall} value={`${dims.doughBall} g`} />
          <ResultRow label={t.calc.sauce} value={`${dims.sauce} g`} />
          <ResultRow label={t.calc.cheese} value={`${dims.cheese} g`} />

          <Text style={[styles.recipeSection, { marginTop: SPACING.md }]}>
            Ukupno · {pizzas} × {dims.doughBall}g = {dims.totalDough}g
          </Text>
          <ResultRow label="Brašno (00 / Tipo 0)" value={`${dough.flour} g`} highlight />
          {ice ? (
            <>
              <ResultRow label={t.calc.coldWater} value={`${ice.water} g`} />
              <ResultRow label={`🧊 ${t.calc.iceAmount}`} value={`${ice.ice} g`} highlight />
            </>
          ) : (
            <ResultRow label={`${t.calc.totalWater} (${dough.waterTemp}°C)`} value={`${dough.water} g`} highlight />
          )}
          <ResultRow label={t.calc.saltAmount} value={`${dough.salt} g`} />
          <ResultRow label={t.calc.yeastAmount + ' (svježi)'} value={`${dough.yeast} g`} />
          <ResultRow label={t.calc.oilAmount} value={`${dough.oil} g`} />

          {dough.biga ? (
            <View style={styles.subBlock}>
              <Text style={styles.subhead}>Biga (16-18h prije)</Text>
              <ResultRow label={t.calc.totalFlour} value={`${dough.biga.flour} g`} />
              <ResultRow label={t.calc.totalWater} value={`${dough.biga.water} g`} />
              <ResultRow label={t.calc.yeastAmount} value={`${dough.biga.yeast} g`} />
            </View>
          ) : null}
          {dough.poolish ? (
            <View style={styles.subBlock}>
              <Text style={styles.subhead}>Poolish (12-14h prije)</Text>
              <ResultRow label={t.calc.totalFlour} value={`${dough.poolish.flour} g`} />
              <ResultRow label={t.calc.totalWater} value={`${dough.poolish.water} g`} />
              <ResultRow label={t.calc.yeastAmount} value={`${dough.poolish.yeast} g`} />
            </View>
          ) : null}

          <View style={styles.bakeInfo}>
            <Icon name="flame" size={16} color={COLORS.brand} />
            <Text style={styles.bakeText}>{baking.temp} · {baking.time}</Text>
          </View>

          {hydration > 70 ? (
            <View style={styles.warnBox}>
              <Icon name="alert-circle" size={14} color={COLORS.warning} />
              <Text style={styles.warnText}>{t.calc.hydrationWarning}</Text>
            </View>
          ) : null}
        </View>

        {/* 5. Actions */}
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

        {/* More tools */}
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

function OvenCard({ active, onPress, icon, title, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.ovenCard, active && styles.ovenCardActive]}>
      <Icon name={icon} size={26} color={active ? '#fff' : COLORS.brand} />
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
    { qty: `${recipe.flour} g`, name: `Brašno ${recipe.flourType || '00'}` },
    { qty: `${recipe.water} g`, name: 'Voda' },
    { qty: `${recipe.salt} g`, name: 'Sol' },
    { qty: `${recipe.yeast} g`, name: 'Kvasac' },
    ...(recipe.oil > 0 ? [{ qty: `${recipe.oil} g`, name: 'Maslinovo ulje' }] : []),
  ];

  const listText = `Pizzabook - Recept za ${recipe.pizzas} pizze:\n\n` +
    items.map((it) => `• ${it.qty} — ${it.name}`).join('\n') +
    '\n\n' + t.shopping.extras + ':\n' +
    t.shopping.extrasList.map((x) => `• ${x}`).join('\n');

  const doCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(listText);
      } else {
        const { setStringAsync } = await import('expo-clipboard').catch(() => ({ setStringAsync: null as any }));
        if (setStringAsync) await setStringAsync(listText);
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
          {items.map((it, i) => (<ResultRow key={i} label={it.name} value={it.qty} />))}
        </View>
        <View style={styles.recipeCard}>
          <Text style={styles.recipeSection}>{t.shopping.extras}</Text>
          {t.shopping.extrasList.map((x, i) => (
            <View key={i} style={styles.extraRow}>
              <Icon name="checkmark-circle" size={16} color={COLORS.brand} />
              <Text style={styles.extraText}>{x}</Text>
            </View>
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

  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 18, fontWeight: '800', color: COLORS.onSurface, minWidth: 32, textAlign: 'center' },

  chipRow: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  customWrap: { justifyContent: 'center', flexShrink: 0 },
  customInput: { minWidth: 60, height: 36, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.borderStrong, borderStyle: 'dashed', paddingHorizontal: SPACING.md, fontSize: 13, color: COLORS.onSurface, textAlign: 'center' },

  pillGroup: { flexDirection: 'row', gap: SPACING.sm },
  pill: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  pillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  pillText: { color: COLORS.onSurface, fontSize: 14, fontWeight: '700' },
  pillTextActive: { color: '#fff' },

  ovenRow: { flexDirection: 'row', gap: SPACING.sm },
  ovenCard: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 6, minHeight: 88 },
  ovenCardActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  ovenText: { color: COLORS.onSurface, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  recipeCard: { backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  recipeSection: { fontSize: 13, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  resLabel: { color: COLORS.muted, fontSize: 14, flex: 1 },
  resValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '700' },
  subBlock: { marginTop: SPACING.md, gap: 4, paddingTop: SPACING.sm, borderTopWidth: 2, borderTopColor: COLORS.brand },
  subhead: { fontSize: 12, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  bakeInfo: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  bakeText: { fontSize: 14, color: COLORS.onSurface, fontWeight: '700' },
  warnBox: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', backgroundColor: '#FEF3C7', padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md },
  warnText: { flex: 1, color: COLORS.onSurface, fontSize: 12 },

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
  extraRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', paddingVertical: 6 },
  extraText: { color: COLORS.onSurface, fontSize: 14 },
  copyBtn: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: RADIUS.md, marginTop: SPACING.sm },
  copyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
