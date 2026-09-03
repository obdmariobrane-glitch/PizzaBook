import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import Icon from '@react-native-vector-icons/ionicons';

import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { reversePlan, Method } from '../../src/calculator';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

function fmt(d: Date) {
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function Planner() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [method, setMethod] = useState<Method>('direct');
  const [bakeAt, setBakeAt] = useState<Date | null>(null);
  const [steps, setSteps] = useState<any[]>([]);

  // Preset options for "when to bake"
  const now = new Date();
  const nextSat = new Date(now);
  nextSat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
  nextSat.setHours(18, 0, 0, 0);
  const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  inTwoDays.setHours(19, 0, 0, 0);
  const inFiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  const presets = [
    { label: `+5h (${fmt(inFiveHours)})`, date: inFiveHours },
    { label: `+2 dana (${fmt(inTwoDays)})`, date: inTwoDays },
    { label: `Subota 18h (${fmt(nextSat)})`, date: nextSat },
  ];

  const generate = (d: Date) => {
    setBakeAt(d);
    setSteps(reversePlan(d, method));
  };

  const scheduleAll = async () => {
    if (Platform.OS === 'web' || !steps.length) return;
    if (IS_EXPO_GO && Platform.OS === 'android') {
      // Expo Go on Android doesn't support notifications since SDK 53
      return;
    }
    try {
      await Notifications.requestPermissionsAsync();
      for (const s of steps) {
        const trigger = s.at.getTime() - Date.now();
        if (trigger <= 0) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: `🍕 ${s.title}`, body: s.desc, sound: 'default' },
          trigger: { seconds: Math.round(trigger / 1000), channelId: 'default' } as any,
        });
      }
    } catch {}
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>{t.planner.title}</Text></View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg }}>
        <View style={styles.card}>
          <Text style={styles.label}>{t.planner.method}</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'direct' as const, l: t.calc.direct },
              { key: 'biga' as const, l: t.calc.biga },
              { key: 'poolish' as const, l: t.calc.poolish },
            ].map((m) => (
              <Pressable
                key={m.key}
                testID={`planner-method-${m.key}`}
                onPress={() => { setMethod(m.key); if (bakeAt) generate(bakeAt); }}
                style={[styles.chip, method === m.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, method === m.key && { color: '#fff' }]}>{m.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t.planner.when}</Text>
          <View style={{ gap: SPACING.sm }}>
            {presets.map((p, i) => (
              <Pressable
                key={i}
                testID={`preset-${i}`}
                onPress={() => generate(p.date)}
                style={[styles.optRow, bakeAt?.getTime() === p.date.getTime() && styles.optRowActive]}
              >
                <Icon name="calendar" size={18} color={COLORS.brand} />
                <Text style={styles.optText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {steps.length > 0 ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.stepsHeader}>{t.planner.steps}</Text>
              <Pressable testID="schedule-alarms" onPress={scheduleAll} style={styles.alarmBtn}>
                <Icon name="alarm" size={16} color="#fff" />
                <Text style={styles.alarmBtnText}>Postavi alarme</Text>
              </Pressable>
            </View>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTime}>{fmt(s.at)}</Text>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Icon name="time-outline" size={40} color={COLORS.muted} />
            <Text style={styles.emptyText}>{t.planner.empty}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  card: { backgroundColor: COLORS.surfaceSecondary, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  label: { fontSize: 13, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '600' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  optRowActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandTertiary },
  optText: { color: COLORS.onSurface, fontSize: 14 },
  stepsHeader: { fontSize: 15, fontWeight: '800', color: COLORS.brand, textTransform: 'uppercase', letterSpacing: 0.5 },
  alarmBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  alarmBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  stepItem: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brand, marginTop: 6 },
  stepTime: { fontSize: 12, color: COLORS.brand, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginTop: 2 },
  stepDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2, lineHeight: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
