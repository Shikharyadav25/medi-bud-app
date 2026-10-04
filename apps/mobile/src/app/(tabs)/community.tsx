import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

interface CommunityPost {
  id: string;
  authorName: string;
  community: string;
  text: string;
  likes: number;
  commentsCount: number;
  timeAgo: string;
  isLikedByUser: boolean;
}

const COMMUNITIES = [
  'All',
  'Fitness',
  'Nutrition',
  'Senior Wellness',
  'Yoga',
  'Mental Wellness',
  'Asthma Support',
  'General Wellness',
];

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    authorName: 'Rohan V.',
    community: 'Fitness',
    text: 'Hit my 5-day water goal streak and completed a 4km brisk walk around Lodhi Gardens today! Feeling energized.',
    likes: 18,
    commentsCount: 3,
    timeAgo: '2h ago',
    isLikedByUser: false,
  },
  {
    id: 'post-2',
    authorName: 'Dr. Meenakshi S.',
    community: 'Nutrition',
    text: 'Quick tip: Pairing your lentils (dal) with a squeeze of lemon enhances non-heme iron absorption by up to 300%. Perfect for traditional Indian thalis.',
    likes: 42,
    commentsCount: 7,
    timeAgo: '4h ago',
    isLikedByUser: true,
  },
  {
    id: 'post-3',
    authorName: 'Kavita M.',
    community: 'Yoga',
    text: 'Started 20 minutes of daily Anulom Vilom and gentle spinal twists. Noticeably better sleep quality and reduced morning stiffness.',
    likes: 27,
    commentsCount: 4,
    timeAgo: '6h ago',
    isLikedByUser: false,
  },
  {
    id: 'post-4',
    authorName: 'Devendra K.',
    community: 'Senior Wellness',
    text: 'The simplified readable mode on Medi Bud has made tracking my daily walking and BP easy. Great initiative for elders.',
    likes: 31,
    commentsCount: 5,
    timeAgo: '1d ago',
    isLikedByUser: false,
  },
];

export default function CommunityScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [selectedCommunity, setSelectedCommunity] = useState('All');
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const filteredPosts =
    selectedCommunity === 'All'
      ? posts
      : posts.filter((p) => p.community === selectedCommunity);

  const handleLike = (id: string) => {
    setPosts(
      posts.map((p) => {
        if (p.id === id) {
          const isLiked = !p.isLikedByUser;
          return {
            ...p,
            isLikedByUser: isLiked,
            likes: isLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = () => {
    if (!newPostText.trim()) return;
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: `${profile.name || 'You'} (You)`,
      community: selectedCommunity === 'All' ? 'General Wellness' : selectedCommunity,
      text: newPostText.trim(),
      likes: 1,
      commentsCount: 0,
      timeAgo: 'Just now',
      isLikedByUser: true,
    };
    setPosts([newPost, ...posts]);
    setNewPostText('');
    setIsPosting(false);
  };

  const handleReportPost = () => {
    Alert.alert(
      'Report Content',
      'Thank you for keeping Medi Bud communities safe. Our moderation team has been notified.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wellness Communities</Text>
          <Text style={styles.headerSubtitle}>
            Demo community feed stored locally. Share progress without posting private medical information.
          </Text>
        </View>

        {/* Community Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {COMMUNITIES.map((comm) => (
            <Chip
              key={comm}
              label={comm}
              selected={selectedCommunity === comm}
              onPress={() => setSelectedCommunity(comm)}
            />
          ))}
        </ScrollView>

        {/* Create Post Prompt */}
        {!isPosting ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsPosting(true)}
            style={styles.createPostBar}
          >
            <Feather name="edit-3" size={16} color={COLORS.primaryAccent} />
            <Text style={styles.createPostPlaceholder}>Share a wellness achievement or tip...</Text>
          </TouchableOpacity>
        ) : (
          <Card style={styles.composeCard}>
            <TextInput
              style={styles.composeInput}
              placeholder="What wellness milestone or insight are you celebrating today?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={newPostText}
              onChangeText={setNewPostText}
            />
            <View style={styles.composeActions}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setIsPosting(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Post to Community"
                variant="cta"
                onPress={handleCreatePost}
                style={styles.postButton}
              />
            </View>
          </Card>
        )}

        {/* Posts Feed */}
        {filteredPosts.map((post) => (
          <Card key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.authorRow}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.avatarInitial}>{post.authorName[0]}</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{post.authorName}</Text>
                  <Text style={styles.timeAgo}>
                    {post.timeAgo} • in <Text style={styles.communityTag}>{post.community}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.7} onPress={handleReportPost} style={styles.moreButton}>
                <Feather name="more-horizontal" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.postText}>{post.text}</Text>

            <View style={styles.postFooter}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleLike(post.id)}
                style={styles.interactionButton}
              >
                <MaterialCommunityIcons
                  name={post.isLikedByUser ? 'heart' : 'heart-outline'}
                  size={18}
                  color={post.isLikedByUser ? '#C62828' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.interactionCount,
                    post.isLikedByUser && styles.likedCount,
                  ]}
                >
                  {post.likes}
                </Text>
              </TouchableOpacity>

              <View style={styles.interactionButton}>
                <Feather name="message-circle" size={16} color={COLORS.textSecondary} />
                <Text style={styles.interactionCount}>{post.commentsCount}</Text>
              </View>

              <View style={styles.secureBadge}>
                <Feather name="shield" size={11} color="#2E7D32" />
                <Text style={styles.secureBadgeText}>No Private Health Info Shared</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chipsScroll: {
    paddingBottom: 12,
  },
  createPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    marginBottom: 16,
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  composeCard: {
    padding: 16,
    marginBottom: 16,
  },
  composeInput: {
    minHeight: 70,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  cancelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  postButton: {
    height: 42,
    paddingHorizontal: 16,
  },
  postCard: {
    padding: 16,
    marginBottom: 14,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeAgo: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  communityTag: {
    color: COLORS.primaryAccent,
    fontWeight: '500',
  },
  moreButton: {
    padding: 4,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.06)',
    paddingTop: 10,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interactionCount: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  likedCount: {
    color: '#C62828',
    fontWeight: '600',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  secureBadgeText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '500',
  },
});
