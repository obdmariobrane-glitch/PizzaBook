import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';

import { api, fileUrl, useAuth } from '../../src/auth';
import { useT } from '../../src/i18n/LanguageProvider';
import { COLORS, SPACING, RADIUS } from '../../src/theme';

type Post = {
  post_id: string; user_id: string; author_name: string; author_picture?: string;
  caption: string; image_path?: string; image_url?: string;
  recipe?: any; likes: string[]; likes_count: number; comments_count: number;
  created_at: string;
};

export default function Feed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/posts');
      setPosts(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLike = async (post: Post) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      const r = await api(`/api/posts/${post.post_id}/like`, { method: 'POST' });
      setPosts((prev) => prev.map((p) => p.post_id === post.post_id
        ? { ...p, likes_count: r.likes_count, likes: r.liked ? [...p.likes, user!.user_id] : p.likes.filter(u => u !== user!.user_id) }
        : p));
    } catch {}
  };

  const renderItem = ({ item }: { item: Post }) => {
    const liked = user && item.likes?.includes(user.user_id);
    return (
      <Pressable
        testID={`post-card-${item.post_id}`}
        style={styles.card}
        onPress={() => router.push(`/post/${item.post_id}`)}
      >
        <View style={styles.cardHeader}>
          {item.author_picture ? (
            <Image source={{ uri: item.author_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{item.author_name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <Text style={styles.authorName}>{item.author_name}</Text>
        </View>
        {item.image_url ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: fileUrl(item.image_url) }} style={styles.image} contentFit="cover" />
            {item.recipe ? (
              <View style={styles.recipeBadge}>
                <Icon name="document-text" size={12} color="#fff" />
                <Text style={styles.recipeBadgeText}>{t.feed.recipe}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.body}>
          <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
          <View style={styles.actions}>
            <Pressable testID={`like-btn-${item.post_id}`} onPress={() => onLike(item)} style={styles.action}>
              <Icon name={liked ? 'flame' : 'flame-outline'} size={20} color={liked ? COLORS.brand : COLORS.muted} />
              <Text style={[styles.actionText, liked && { color: COLORS.brand, fontWeight: '700' }]}>{item.likes_count}</Text>
            </Pressable>
            <View style={styles.action}>
              <Icon name="chatbubble-outline" size={18} color={COLORS.muted} />
              <Text style={styles.actionText}>{item.comments_count}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.feed.title}</Text>
        <Pressable
          testID="new-post-button"
          onPress={() => router.push('/new-post')}
          style={styles.newBtn}
        >
          <Icon name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.brand} /></View>
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🍕</Text>
          <Text style={styles.emptyText}>{t.feed.empty}</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/new-post')}>
            <Text style={styles.emptyBtnText}>{t.feed.newPost}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.post_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyEmoji: { fontSize: 60 },
  emptyText: { fontSize: 16, color: COLORS.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: COLORS.brand, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.pill },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: COLORS.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: COLORS.onBrandTertiary, fontWeight: '800' },
  authorName: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceTertiary, position: 'relative' },
  image: { width: '100%', height: '100%' },
  recipeBadge: { position: 'absolute', bottom: SPACING.md, left: SPACING.md, backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, flexDirection: 'row', gap: 4, alignItems: 'center' },
  recipeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: SPACING.md, gap: SPACING.sm },
  caption: { fontSize: 15, color: COLORS.onSurface, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.xs },
  action: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
});
