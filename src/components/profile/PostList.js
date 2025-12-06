import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";
import PostCard from "../posts/PostCard";

const PostList = ({
  posts,
  onPostPress,
  onCommentClick,
  onAuthorPress,
  onForumPress,
}) => {
  // Formatear datos de los posts
  const getFormattedPosts = () => {
    if (!posts || posts.length === 0) return [];

    return posts.map((post) => ({
      id: post.id,
      title: post.title || post.titulo || "",
      content: post.content || post.contenido || "",
      createdAt: post.createdAt || post.fecha,
      likes: post.likes || [],
      dislikes: post.dislikes || [],
      stats: post.stats || { commentCount: 0, likeCount: 0 },
      status: post.status || "active",
      rejectionReason: post.rejectionReason,
      images: post.images || [],
      authorId: post.authorId,
      authorName:
        post.authorName || post.authorData?.nombreCompleto || "Usuario",
      authorPhoto: post.authorPhoto || post.authorData?.photoURL || null,
      authorSpecialty:
        post.authorSpecialty ||
        post.authorData?.professionalInfo?.specialty ||
        null,
      forumName:
        post.forumName || post.tema || post.forumData?.name || "Comunidad",
      forumId: post.forumId,
    }));
  };

  const formattedPosts = getFormattedPosts();

  if (formattedPosts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <IconButton icon="file-document" size={48} iconColor="#d1d5db" />
          <Text style={styles.emptyTitle}>Aún no has publicado</Text>
          <Text style={styles.emptyText}>
            Cuando crees publicaciones, aparecerán aquí.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {formattedPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onCommentClick={onCommentClick}
          onAuthorPress={onAuthorPress}
          onForumPress={onForumPress}
          onViewPost={onPostPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyCard: {
    width: "100%",
    padding: 24,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default PostList;
