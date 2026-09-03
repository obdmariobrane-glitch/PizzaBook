import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Icon from '@react-native-vector-icons/ionicons';

import { api, fileUrl, useAuth } from '../../src/auth';
import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';

export default function PostDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const { user } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api(`/api/posts/${id}`),
        api(`/api/posts/${id}/comments`),
      ]);
      setPost(p); setComments(c);
    } catch {}
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const c = await api(`/api/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text: text.trim() }) });
      setComments((prev) => [...prev, c]);
      setText('');
    } catch {} finally { setPosting(false); }
  };

  const onLike = async () => {
    if (!post) return;
    try {
      const r = await api(`/api/posts/${id}/like`, { method: 'POST' });
      setPost({ ...post, likes_count: r.likes_count, likes: r.liked ? [...(post.likes || []), user!.user_id] : (post.likes || []).filter((u: string) => u !== user!.user_id) });
    } catch {}
  };

  if (!post) {
    return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={COLORS.brand} /></View>;
  }

  const liked = user && post.likes?.includes(user.user_id);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable onPress={() => router.back()}><Icon name="chevron-back" size={26} color={COLORS.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>{post.author_name}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxxl }} keyboardShouldPersistTaps="handled">
        {post.image_url ? (
          <Image source={{ uri: fileUrl(post.image_url) }} style={styles.image} contentFit="cover" />
        ) : null}
        <View style={styles.body}>
          <Text style={styles.caption}>{post.caption}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onLike} testID="like-detail" style={styles.action}>
              <Icon name={liked ? 'flame' : 'flame-outline'} size={22} color={liked ? COLORS.brand : COLORS.muted} />
              <Text style={[styles.actionText, liked && { color: COLORS.brand, fontWeight: '700' }]}>{post.likes_count}</Text>
            </Pressable>
            <View style={styles.action}>
              <Icon name="chatbubble-outline" size={20} color={COLORS.muted} />
              <Text style={styles.actionText}>{comments.length}</Text>
            </View>
          </View>

          {post.recipe ? (
            <View style={styles.recipeCard}>
              <Text style={styles.recipeTitle}>{t.feed.recipe}</Text>
              {post.recipe.hydration ? <RecipeLine label={t.feed.hydration} value={`${post.recipe.hydration}%`} /> : null}
              {post.recipe.method ? <RecipeLine label={t.feed.method} value={post.recipe.method} /> : null}
              {post.recipe.dough_weight ? <RecipeLine label={t.calc.doughBall} value={`${post.recipe.dough_weight} g`} /> : null}
              {post.recipe.flour_type ? <RecipeLine label={t.feed.flourType} value={post.recipe.flour_type} /> : null}
              {post.recipe.bake_temp ? <RecipeLine label={t.feed.bakeTemp} value={`${post.recipe.bake_temp}°C`} /> : null}
            </View>
          ) : null}

          <Text style={[styles.section, { marginTop: SPACING.xl }]}>{t.feed.comment}s ({comments.length})</Text>
          {comments.map((c) => (
            <View key={c.comment_id} style={styles.comment}>
              <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{c.author_name?.[0]?.toUpperCase() || '?'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commentName}>{c.author_name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <TextInput
          testID="comment-input"
          value={text}
          onChangeText={setText}
          placeholder={t.feed.addComment}
          placeholderTextColor={COLORS.muted}
          style={styles.commentInput}
        />
        <Pressable testID="send-comment" onPress={submitComment} disabled={!text.trim() || posting} style={[styles.sendBtn, (!text.trim() || posting) && { opacity: 0.5 }]}>
          <Icon name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function RecipeLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recipeLine}>
      <Text style={styles.recipeLabel}>{label}</Text>
      <Text style={styles.recipeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  image: { width: '100%', aspectRatio: 1 },
  body: { padding: SPACING.lg },
  caption: { fontSize: 16, color: COLORS.onSurface, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  recipeCard: { marginTop: SPACING.md, backgroundColor: COLORS.brandTertiary, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4 },
  recipeTitle: { fontSize: 13, color: COLORS.brand, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  recipeLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  recipeLabel: { color: COLORS.onBrandTertiary, fontSize: 13 },
  recipeValue: { color: COLORS.onSurface, fontSize: 14, fontWeight: '700' },
  section: { fontSize: 13, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' },
  comment: { flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: COLORS.onBrandTertiary, fontWeight: '800' },
  commentName: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },
  commentText: { fontSize: 14, color: COLORS.onSurface, marginTop: 2 },
  inputBar: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  commentInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 14, color: COLORS.onSurface, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
});
