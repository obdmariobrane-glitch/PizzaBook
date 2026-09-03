import { useEffect } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth, api } from '../src/auth';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { COLORS } from '../src/theme';
import {
  setupHandlerAndChannel,
  addTapListener,
  getColdStartData,
  getPermissionState,
  requestAndGetDeviceToken,
  isPushSupported,
} from '../src/notifications';

LogBox.ignoreAllLogs(true);

// Module-scope setup (safe no-op if unsupported)
setupHandlerAndChannel();

function AuthGate() {
  const { user, loading, signInWithSessionId } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links w/ session_id
  useEffect(() => {
    if (Platform.OS === 'web') {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const m = url.match(/[?#&]session_id=([^&#]+)/);
      if (m) {
        signInWithSessionId(m[1]).finally(() => {
          try {
            const clean = window.location.origin + window.location.pathname;
            window.history.replaceState(window.history.state, '', clean);
          } catch {}
        });
      }
      return;
    }

    let stashed: string | null = null;
    const sub = Linking.addEventListener('url', (e) => {
      if (e?.url) stashed = e.url;
      const m = e?.url?.match(/[?#&]session_id=([^&#]+)/);
      if (m) signInWithSessionId(m[1]);
    });

    Linking.getInitialURL().then((url) => {
      const src = url || stashed;
      const m = src?.match(/[?#&]session_id=([^&#]+)/);
      if (m) signInWithSessionId(m[1]);
    });

    return () => sub.remove();
  }, [signInWithSessionId]);

  // Push tap handlers (only when supported)
  useEffect(() => {
    if (Platform.OS === 'web' || !isPushSupported()) return;

    const tapSub = addTapListener((data) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      if (typeof url === 'string' && url.startsWith('http')) Linking.openURL(url);
      else router.push(url);
    });

    getColdStartData().then((data) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      if (typeof url === 'string' && url.startsWith('http')) Linking.openURL(url);
      else router.push(url);
    });

    (async () => {
      try {
        const { status, canAskAgain } = await getPermissionState();
        if (status !== 'denied' || canAskAgain) return;
        const lastNudge = await AsyncStorage.getItem('pushNudgeAt');
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (lastNudge && Date.now() - Number(lastNudge) <= oneWeek) return;
        await AsyncStorage.setItem('pushNudgeAt', String(Date.now()));
      } catch {}
    })();

    return () => { try { tapSub.remove(); } catch {} };
  }, [router]);

  // Register push after login
  useEffect(() => {
    if (!user || Platform.OS === 'web' || !isPushSupported()) return;
    (async () => {
      const token = await requestAndGetDeviceToken();
      if (!token) return;
      try {
        await api('/api/register-push', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.user_id,
            platform: Platform.OS,
            device_token: token,
          }),
        });
      } catch {}
    })();
  }, [user]);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) router.replace('/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface } }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
});
