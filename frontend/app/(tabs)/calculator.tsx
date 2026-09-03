import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@react-native-vector-icons/ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { dimensionsCalc, doughCalc, bakingCalc, iceCalc, Method, YeastType, Mixing, Fermentation, OvenType } from '../../src/calculator';
import { translations } from '../../src/i18n/translations';

type Tool = null | 'dimensions' | 'dough' | 'baking' | 'ice' | 'school';

export default function Calculator() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [tool, setTool] = useState<Tool>(null);

  const tools = [
    { id: 'dimensions' as const, icon: 'resize' as const, title: t.calc.dimensions, desc: t.calc.dimensionsDesc, color: '#D15900' },
    { id: 'dough' as const, icon: 'flask' as const, title: t.calc.dough, desc: t.calc.doughDesc, color: '#E87121' },
    { id: 'baking' as const, icon: 'flame' as const, title: t.calc.baking, desc: t.calc.bakingDesc, color: '#B84A00' },
    { id: 'ice' as const, icon: 'snow' as const, title: t.calc.ice, desc: t.calc.iceDesc, color: '#8C3A00' },
    { id: 'school' as const, icon: 'book' as const, title: t.calc.school, desc: '', color: '#2D6A4F' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>{t.calc.title}</Text></View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md }}>
        {tools.map((it) => (
          <Pressable key={it.id} testID={`tool-${it.id}`} style={styles.tool} onPress={() => setTool(it.id)}>
            <View style={[styles.toolIcon, { backgroundColor: it.color }]}>
              <Icon name={it.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>{it.title}</Text>
              {it.desc ? <Text style={styles.toolDesc}>{it.desc}</Text> : null}
            </View>
            <Icon name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!tool} animationType="slide" onRequestClose={() => setTool(null)}>
        {tool === 'dimensions' && <DimensionsTool onClose={() => setTool(null)} />}
        {tool === 'dough' && <DoughTool onClose={() => setTool(null)} />}
        {tool === 'baking' && <BakingTool onClose={() => setTool(null)} />}
        {tool === 'ice' && <IceTool onClose={() => setTool(null)} />}
        {tool === 'school' && <SchoolTool onClose={() => setTool(null)} />}
      </Modal>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.sm }]}>
      <Pressable onPress={onClose} testID="modal-close">
        <Icon name="close" size={26} color={COLORS.onSurface} />
      </Pressable>
      <Text style={styles.modalTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function Row({ label, children }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange, testId }: { options: { key: string; label: string }[]; value: string; onChange: (k: any) => void; testId: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          testID={`${testId}-${o.key}`}
          onPress={() => onChange(o.key)}
          style={[styles.chip, value === o.key && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === o.key && styles.chipTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function NumInput({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <TextInput
      testID={testId}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      style={styles.input}
    />
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

// --- DIMENSIONS ---
function DimensionsTool({ onClose }: any) {
  const { t } = useT();
  const [d, setD] = useState('30');
  const [n, setN] = useState('4');
  const diameter = parseFloat(d) || 0;
  const pizzas = parseInt(n) || 0;
  const res = diameter && pizzas ? dimensionsCalc(diameter, pizzas) : null;

  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.calc.dimensions} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Row label={t.calc.diameter}><NumInput value={d} onChange={setD} testId="input-diameter" /></Row>
        <Row label={t.calc.pizzas}><NumInput value={n} onChange={setN} testId="input-pizzas" /></Row>
        {res ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t.calc.results}</Text>
            <ResultRow label={t.calc.doughBall} value={`${res.doughBall} g`} />
            <ResultRow label={t.calc.sauce} value={`${res.sauce} g`} />
            <ResultRow label={t.calc.cheese} value={`${res.cheese} g`} />
            <ResultRow label={t.calc.totalDough} value={`${res.totalDough} g`} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// --- DOUGH ---
function DoughTool({ onClose }: any) {
  const { t } = useT();
  const [n, setN] = useState('4');
  const [bw, setBw] = useState('250');
  const [hyd, setHyd] = useState('65');
  const [salt, setSalt] = useState('2.8');
  const [oil, setOil] = useState('2');
  const [method, setMethod] = useState<Method>('direct');
  const [yeast, setYeast] = useState<YeastType>('fresh');
  const [mix, setMix] = useState<Mixing>('hand');
  const [rt, setRt] = useState('22');
  const [ft, setFt] = useState('4');
  const [ferm, setFerm] = useState<Fermentation>('coldLong');

  const opts = {
    pizzas: parseInt(n) || 0, ballWeight: parseFloat(bw) || 0,
    hydration: parseFloat(hyd) || 0, saltPct: parseFloat(salt) || 0, oilPct: parseFloat(oil) || 0,
    method, yeastType: yeast, mixing: mix,
    roomTemp: parseFloat(rt) || 22, fridgeTemp: parseFloat(ft) || 4, fermentation: ferm,
  };
  const res = opts.pizzas && opts.ballWeight ? doughCalc(opts) : null;
  const warn = opts.hydration > 70;

  const saveRecipe = async () => {
    if (!res) return;
    const recipe = {
      pizzas: opts.pizzas, ballWeight: opts.ballWeight, hydration: opts.hydration,
      method, flourType: '00', flour: res.flour, water: res.water, salt: res.salt, oil: res.oil, yeast: res.yeast,
    };
    await AsyncStorage.setItem('lastRecipe', JSON.stringify(recipe));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
      <ModalHeader title={t.calc.dough} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
        <Row label={t.calc.pizzas}><NumInput value={n} onChange={setN} testId="dough-pizzas" /></Row>
        <Row label={t.calc.doughBall + ' (g)'}><NumInput value={bw} onChange={setBw} testId="dough-ball" /></Row>
        <Row label={t.calc.method}>
          <ChipRow
            testId="dough-method"
            options={[{ key: 'direct', label: t.calc.direct }, { key: 'biga', label: t.calc.biga }, { key: 'poolish', label: t.calc.poolish }]}
            value={method} onChange={setMethod}
          />
        </Row>
        <Row label={t.calc.hydration}><NumInput value={hyd} onChange={setHyd} testId="dough-hyd" /></Row>
        <Row label={t.calc.salt}><NumInput value={salt} onChange={setSalt} /></Row>
        <Row label={t.calc.oil}><NumInput value={oil} onChange={setOil} /></Row>
        <Row label={t.calc.yeastType}>
          <ChipRow
            testId="dough-yeast"
            options={[{ key: 'fresh', label: t.calc.freshYeast }, { key: 'dry', label: t.calc.dryYeast }, { key: 'sourdough', label: t.calc.sourdough }]}
            value={yeast} onChange={setYeast}
          />
        </Row>
        <Row label={t.calc.mixing}>
          <ChipRow
            testId="dough-mix"
            options={[{ key: 'hand', label: t.calc.handMix }, { key: 'home', label: t.calc.homeMixer }, { key: 'spiral', label: t.calc.spiralMixer }]}
            value={mix} onChange={setMix}
          />
        </Row>
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <View style={{ flex: 1 }}><Row label={t.calc.roomTemp}><NumInput value={rt} onChange={setRt} /></Row></View>
          <View style={{ flex: 1 }}><Row label={t.calc.fridgeTemp}><NumInput value={ft} onChange={setFt} /></Row></View>
        </View>
        <Row label={t.calc.fermentation}>
          <ChipRow
            testId="dough-ferm"
            options={[{ key: 'sameDay', label: t.calc.sameDay }, { key: 'coldLong', label: t.calc.coldLong }]}
            value={ferm} onChange={setFerm}
          />
        </Row>
        {warn ? (
          <View style={styles.warnBox}>
            <Icon name="alert-circle" size={16} color={COLORS.warning} />
            <Text style={styles.warnText}>{t.calc.hydrationWarning}</Text>
          </View>
        ) : null}
        {res ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t.calc.results}</Text>
            <ResultRow label={t.calc.totalFlour} value={`${res.flour} g`} />
            <ResultRow label={t.calc.totalWater} value={`${res.water} g`} />
            <ResultRow label={t.calc.saltAmount} value={`${res.salt} g`} />
            <ResultRow label={t.calc.oilAmount} value={`${res.oil} g`} />
            <ResultRow label={t.calc.yeastAmount} value={`${res.yeast} g`} />
            <ResultRow label={t.calc.waterTemp} value={`${res.waterTemp} °C`} />
            <ResultRow label={t.calc.totalDough} value={`${res.totalDough} g`} />
            {res.biga ? (
              <View style={{ marginTop: SPACING.md, gap: 4 }}>
                <Text style={styles.subhead}>Biga</Text>
                <ResultRow label={t.calc.totalFlour} value={`${res.biga.flour} g`} />
                <ResultRow label={t.calc.totalWater} value={`${res.biga.water} g`} />
                <ResultRow label={t.calc.yeastAmount} value={`${res.biga.yeast} g`} />
              </View>
            ) : null}
            {res.poolish ? (
              <View style={{ marginTop: SPACING.md, gap: 4 }}>
                <Text style={styles.subhead}>Poolish</Text>
                <ResultRow label={t.calc.totalFlour} value={`${res.poolish.flour} g`} />
                <ResultRow label={t.calc.totalWater} value={`${res.poolish.water} g`} />
                <ResultRow label={t.calc.yeastAmount} value={`${res.poolish.yeast} g`} />
              </View>
            ) : null}
            <Pressable style={styles.primaryBtn} onPress={saveRecipe} testID="save-recipe">
              <Icon name="bookmark" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Spremi za objavu</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- BAKING ---
function BakingTool({ onClose }: any) {
  const { t } = useT();
  const [oven, setOven] = useState<OvenType>('homeStone');
  const res = bakingCalc(oven);
  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.calc.baking} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Row label={t.calc.ovenType}>
          <View style={{ gap: SPACING.sm }}>
            {[
              { key: 'ooni' as const, label: t.calc.ooni },
              { key: 'homeStone' as const, label: t.calc.homeStone },
              { key: 'homePan' as const, label: t.calc.homePan },
            ].map((o) => (
              <Pressable key={o.key} testID={`oven-${o.key}`} style={[styles.optRow, oven === o.key && styles.optRowActive]} onPress={() => setOven(o.key)}>
                <Icon name={oven === o.key ? 'radio-button-on' : 'radio-button-off'} size={20} color={COLORS.brand} />
                <Text style={[styles.optText, oven === o.key && { fontWeight: '700' }]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{t.calc.results}</Text>
          <ResultRow label={t.calc.bakeTemp} value={res.temp} />
          <ResultRow label={t.calc.bakeTime} value={res.time} />
          <Text style={[styles.subhead, { marginTop: SPACING.md }]}>{t.calc.instructions}</Text>
          {res.steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// --- ICE ---
function IceTool({ onClose }: any) {
  const { t } = useT();
  const [total, setTotal] = useState('700');
  const [tap, setTap] = useState('20');
  const [target, setTarget] = useState('4');
  const totalW = parseFloat(total) || 0;
  const tapT = parseFloat(tap) || 0;
  const tgt = parseFloat(target) || 0;
  const res = totalW && tapT > tgt ? iceCalc(totalW, tapT, tgt) : null;
  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.calc.ice} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Row label={t.calc.totalWaterAmount}><NumInput value={total} onChange={setTotal} testId="ice-total" /></Row>
        <Row label={t.calc.currentTemp}><NumInput value={tap} onChange={setTap} /></Row>
        <Row label={t.calc.targetTemp}><NumInput value={target} onChange={setTarget} /></Row>
        {res ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t.calc.results}</Text>
            <ResultRow label={t.calc.coldWater} value={`${res.water} g`} />
            <ResultRow label={t.calc.iceAmount} value={`${res.ice} g`} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// --- SCHOOL ---
function SchoolTool({ onClose }: any) {
  const { t } = useT();
  return (
    <View style={styles.modalRoot}>
      <ModalHeader title={t.school.title} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.modalBody}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  tool: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md, borderRadius: RADIUS.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  toolIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  toolDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  modalRoot: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  modalBody: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  label: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 16, color: COLORS.onSurface, borderWidth: 1, borderColor: COLORS.border },
  chip: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  resultCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.sm },
  resultTitle: { fontSize: 15, fontWeight: '800', color: COLORS.brand, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  resultLabel: { color: COLORS.muted, fontSize: 14 },
  resultValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '700' },
  subhead: { fontSize: 13, color: COLORS.brand, fontWeight: '700', textTransform: 'uppercase', marginTop: SPACING.sm },
  warnBox: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', backgroundColor: '#FEF3C7', padding: SPACING.md, borderRadius: RADIUS.md },
  warnText: { flex: 1, color: COLORS.onSurface, fontSize: 13 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  optRowActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandTertiary },
  optText: { color: COLORS.onSurface, fontSize: 15 },
  stepRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', marginTop: SPACING.sm },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, color: COLORS.onSurface, fontSize: 14, lineHeight: 20 },
  primaryBtn: { marginTop: SPACING.md, flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ruleCard: { flexDirection: 'row', gap: SPACING.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  ruleTitle: { fontSize: 15, fontWeight: '800', color: COLORS.onSurface, marginBottom: 4 },
  ruleBody: { fontSize: 14, color: COLORS.onSurfaceTertiary, lineHeight: 20 },
});
