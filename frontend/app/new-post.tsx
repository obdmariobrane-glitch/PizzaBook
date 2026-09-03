import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/ionicons';

import { api, getToken } from '../src/auth';
import { useT } from '../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../src/theme';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL!;

export default function NewPost() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();

  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [posting, setPosting] = useState(false);
  const [attachRecipe, setAttachRecipe] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('lastRecipe').then((v) => {
      if (v) setRecipe(JSON.parse(v));
    });
  }, []);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    setImageUri(uri);
    await upload(uri);
  };

  const upload = async (uri: string) => {
    setUploading(true);
    try {
      const form = new FormData();
      const name = `pizza-${Date.now()}.jpg`;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        form.append('file', blob, name);
      } else {
        form.append('file', { uri, name, type: 'image/jpeg' } as any);
      }
      const res = await fetch(`${BACKEND}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const json = await res.json();
      if (json.path) setUploadedPath(json.path);
    } catch (e) {
      // ignore
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!caption.trim() && !uploadedPath) return;
    setPosting(true);
    try {
      await api('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          caption: caption.trim(),
          image_path: uploadedPath || '',
          recipe: attachRecipe && recipe ? {
            diameter_cm: recipe.diameter,
            hydration: recipe.hydration,
            method: recipe.method,
            flour_type: recipe.flourType,
            dough_weight: recipe.ballWeight,
          } : null,
        }),
      });
      router.back();
    } catch (e) {
      // ignore
    } finally { setPosting(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable onPress={() => router.back()} testID="close-new-post">
          <Icon name="close" size={26} color={COLORS.onSurface} />
        </Pressable>
        <Text style={styles.title}>{t.feed.newPost}</Text>
        <Pressable
          testID="publish-btn"
          disabled={posting || (!caption.trim() && !uploadedPath)}
          onPress={submit}
          style={[styles.publishBtn, (posting || (!caption.trim() && !uploadedPath)) && { opacity: 0.5 }]}
        >
          <Text style={styles.publishBtnText}>{posting ? '...' : t.feed.publish}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxxl }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pick} style={styles.picker} testID="pick-image">
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
              {uploading ? (
                <View style={styles.uploadOverlay}><ActivityIndicator color="#fff" /></View>
              ) : null}
            </>
          ) : (
            <View style={styles.pickerEmpty}>
              <Icon name="image-outline" size={40} color={COLORS.brand} />
              <Text style={styles.pickerText}>{t.feed.pickImage}</Text>
            </View>
          )}
        </Pressable>

        <View>
          <Text style={styles.label}>{t.feed.caption}</Text>
          <TextInput
            testID="caption-input"
            value={caption}
            onChangeText={setCaption}
            placeholder={t.feed.captionPlaceholder}
            placeholderTextColor={COLORS.muted}
            multiline
            style={styles.input}
          />
        </View>

        {recipe ? (
          <Pressable
            testID="attach-recipe"
            onPress={() => setAttachRecipe(!attachRecipe)}
            style={[styles.recipe, attachRecipe && styles.recipeActive]}
          >
            <Icon name={attachRecipe ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={attachRecipe ? COLORS.brand : COLORS.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeTitle}>{t.feed.attachRecipe}</Text>
              <Text style={styles.recipeMeta}>
                {recipe.hydration}% · {recipe.method} · {recipe.ballWeight}g
              </Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  publishBtn: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  picker: { aspectRatio: 1, width: '100%', backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pickerEmpty: { alignItems: 'center', gap: SPACING.sm },
  pickerText: { color: COLORS.brand, fontWeight: '600' },
  image: { width: '100%', height: '100%' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 100, fontSize: 15, color: COLORS.onSurface, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: 'top' },
  recipe: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  recipeActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandTertiary },
  recipeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  recipeMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
