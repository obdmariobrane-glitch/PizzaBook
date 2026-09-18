import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
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
  rating?: number | null;
  created_at: string;
};

export default function Feed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [featured, setFeatured] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'direct' | 'biga' | 'poolish'>('all');

  const load = useCallback(async () => {
    try {
      const q = filter === 'all' ? '' : `?method=${filter}`;
      const [data, feat] = await Promise.all([
        api(`/api/posts${q}`),
        api('/api/posts/featured').catch(() => null),
      ]);
      setPosts(data);
      setFeatured(feat);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLike = async (post: Post) => {
    if (!user) { router.push('/login'); return; }
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
          {item.rating ? (
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(n => (
                <Icon key={n} name={n <= (item.rating as number) ? 'star' : 'star-outline'} size={14} color={COLORS.brand} />
              ))}
              <Text style={styles.ratingText}>{t.feed.rating}</Text>
            </View>
          ) : null}
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
          onPress={() => user ? router.push('/new-post') : router.push('/login')}
          style={styles.newBtn}
        >
          <Icon name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {([
            { k: 'all' as const, label: t.feed.filterAll },
            { k: 'direct' as const, label: t.calc.direct },
            { k: 'biga' as const, label: t.calc.biga },
            { k: 'poolish' as const, label: t.calc.poolish },
          ]).map((f) => (
            <Pressable
              key={f.k}
              testID={`filter-${f.k}`}
              onPress={() => setFilter(f.k)}
              style={[styles.filterChip, filter === f.k && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.k && { color: '#fff' }]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
          ListHeaderComponent={featured ? (
            <Pressable
              testID="featured-post"
              onPress={() => router.push(`/post/${featured.post_id}`)}
              style={styles.featured}
            >
              {featured.image_url ? (
                <Image source={{ uri: fileUrl(featured.image_url) }} style={styles.featuredImage} contentFit="cover" />
              ) : null}
              <LinearGradient colors={['transparent', 'rgba(28,25,23,0.95)']} style={styles.featuredScrim} />
              <View style={styles.featuredBadge}>
                <Icon name="trophy" size={12} color="#fff" />
                <Text style={styles.featuredBadgeText}>{t.feed.featured}</Text>
              </View>
              <View style={styles.featuredBody}>
                <Text style={styles.featuredName}>{featured.author_name}</Text>
                <Text style={styles.featuredCaption} numberOfLines={2}>{featured.caption}</Text>
                <View style={styles.featuredMeta}>
                  <Icon name="flame" size={14} color="#fff" />
                  <Text style={styles.featuredMetaText}>{featured.likes_count}</Text>
                </View>
              </View>
            </Pressable>
          ) : null}
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
  filterRow: { height: 56, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.surface },
  filterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  filterChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterChipText: { color: COLORS.onSurface, fontSize: 13, fontWeight: '600' },
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
  ratingRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 6 },
  ratingText: { color: COLORS.muted, fontSize: 12, marginLeft: 4 },
  featured: { borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.surfaceInverse, aspectRatio: 16 / 10, marginBottom: SPACING.sm, position: 'relative' },
  featuredImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  featuredScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  featuredBadge: { position: 'absolute', top: SPACING.md, left: SPACING.md, backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, flexDirection: 'row', gap: 4, alignItems: 'center' },
  featuredBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  featuredBody: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: SPACING.lg, gap: 4 },
  featuredName: { color: '#fff', fontSize: 13, fontWeight: '700', opacity: 0.85 },
  featuredCaption: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 22 },
  featuredMeta: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
  featuredMetaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
