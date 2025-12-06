import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import { IconButton, Menu, Divider } from "react-native-paper";
import { auth } from "../../config/firebase";
import PostImages from "../posts/PostImages";
import EditPostModal from "../posts/EditPostModal";
import DeletePostModal from "../posts/DeletePostModal";
import { usePostActions } from "../../hooks/usePostActions";

const PostCard = ({
  post,
  onCommentClick,
  onAuthorPress,
  onForumPress,
  onViewPost,
  onPostUpdated,
  onPostDeleted,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);

  const currentUser = auth.currentUser;
  const isAuthor = currentUser && currentUser.uid === post.authorId;
  const { reactToPost, loading: reactionLoading } = usePostActions();

  useEffect(() => {
    // Inicializar contadores y reacción del usuario
    const likes = post.likes || [];
    const dislikes = post.dislikes || [];

    setLikeCount(likes.length);
    setDislikeCount(dislikes.length);

    if (currentUser) {
      const userId = currentUser.uid;
      if (likes.includes(userId)) {
        setUserReaction("like");
      } else if (dislikes.includes(userId)) {
        setUserReaction("dislike");
      } else {
        setUserReaction(null);
      }
    }
  }, [post, currentUser]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString("es-ES");
      }
      return new Date(timestamp).toLocaleDateString("es-ES");
    } catch {
      return "";
    }
  };

  const shouldShowExpand = post.content && post.content.length > 300;

  const handleLike = async () => {
    if (!currentUser || reactionLoading) return;

    const newReaction = userReaction === "like" ? "remove" : "like";
    const result = await reactToPost(post.id, newReaction);

    if (result.success) {
      if (newReaction === "like") {
        if (userReaction === "dislike") {
          setDislikeCount(dislikeCount - 1);
        }
        setLikeCount(likeCount + 1);
        setUserReaction("like");
      } else if (newReaction === "remove" && userReaction === "like") {
        setLikeCount(likeCount - 1);
        setUserReaction(null);
      }
    }
  };

  const handleDislike = async () => {
    if (!currentUser || reactionLoading) return;

    const newReaction = userReaction === "dislike" ? "remove" : "dislike";
    const result = await reactToPost(post.id, newReaction);

    if (result.success) {
      if (newReaction === "dislike") {
        if (userReaction === "like") {
          setLikeCount(likeCount - 1);
        }
        setDislikeCount(dislikeCount + 1);
        setUserReaction("dislike");
      } else if (newReaction === "remove" && userReaction === "dislike") {
        setDislikeCount(dislikeCount - 1);
        setUserReaction(null);
      }
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => onAuthorPress && onAuthorPress(post.authorId)}
          >
            {post.authorPhoto ? (
              <Image
                source={{ uri: post.authorPhoto }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
                <IconButton icon="account" size={16} iconColor="#fff" />
              </View>
            )}
            <View style={styles.authorDetails}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorName}
              </Text>
              {post.authorSpecialty && (
                <View style={styles.specialtyBadge}>
                  <IconButton
                    icon="briefcase-medical"
                    size={10}
                    iconColor="#4f46e5"
                  />
                  <Text style={styles.specialtyText} numberOfLines={1}>
                    {post.authorSpecialty}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {post.forumName && (
              <TouchableOpacity
                style={styles.forumBadge}
                onPress={() => onForumPress && onForumPress(post.forumId)}
              >
                <IconButton
                  icon="account-group"
                  size={14}
                  iconColor="#2563eb"
                />
                <Text style={styles.forumText} numberOfLines={1}>
                  {post.forumName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Menú solo para autor */}
            {isAuthor && (
              <Menu
                visible={showMenu}
                onDismiss={() => setShowMenu(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setShowMenu(true)}
                    iconColor="#6b7280"
                  />
                }
                style={styles.menu}
              >
                <Menu.Item
                  leadingIcon="pencil"
                  onPress={() => {
                    setShowEditModal(true);
                    setShowMenu(false);
                  }}
                  title="Editar"
                />
                <Divider />
                <Menu.Item
                  leadingIcon="delete"
                  onPress={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  title="Eliminar"
                  titleStyle={{ color: "#ef4444" }}
                />
              </Menu>
            )}
          </View>
        </View>

        {/* Fecha */}
        <View style={styles.dateContainer}>
          <IconButton icon="calendar" size={14} iconColor="#6b7280" />
          <Text style={styles.dateText}>{formatDate(post.createdAt)}</Text>
        </View>

        {/* Contenido */}
        <View style={styles.contentContainer}>
          <Text style={styles.postTitle}>{post.title}</Text>

          <View style={styles.contentWrapper}>
            {shouldShowExpand && !expanded ? (
              <Text style={styles.postContent} numberOfLines={4}>
                {post.content.substring(0, 300)}...
              </Text>
            ) : (
              <ScrollView
                style={styles.contentScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <Text style={styles.postContent}>{post.content}</Text>
              </ScrollView>
            )}

            {shouldShowExpand && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={styles.expandButtonText}>
                  {expanded ? "Mostrar menos" : "Leer más"}
                </Text>
                <IconButton
                  icon={expanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  iconColor="#3b82f6"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Imágenes */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <PostImages images={post.images} />
            </View>
          )}

          {/* Footer con reacciones y comentarios */}
          <View style={styles.footer}>
            <View style={styles.reactionsContainer}>
              {/* Like button */}
              <TouchableOpacity
                style={styles.reactionButton}
                onPress={handleLike}
                disabled={reactionLoading}
              >
                <IconButton
                  icon={userReaction === "like" ? "heart" : "heart-outline"}
                  size={20}
                  iconColor={userReaction === "like" ? "#ef4444" : "#6b7280"}
                />
                {likeCount > 0 && (
                  <Text style={styles.likeCount}>{likeCount}</Text>
                )}
              </TouchableOpacity>

              {/* Dislike button */}
              <TouchableOpacity
                style={styles.reactionButton}
                onPress={handleDislike}
                disabled={reactionLoading}
              >
                <IconButton
                  icon={
                    userReaction === "dislike"
                      ? "thumb-down"
                      : "thumb-down-outline"
                  }
                  size={20}
                  iconColor={userReaction === "dislike" ? "#3b82f6" : "#6b7280"}
                />
                {/* Sin contador para dislike */}
              </TouchableOpacity>

              {/* Comment button */}
              <TouchableOpacity
                style={styles.commentButton}
                onPress={() => onCommentClick && onCommentClick(post)}
              >
                <IconButton icon="comment" size={20} iconColor="#6b7280" />
                {post.stats?.commentCount > 0 && (
                  <Text style={styles.commentCount}>
                    {post.stats?.commentCount || 0}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modales */}
      <EditPostModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={post}
        onPostUpdated={onPostUpdated}
      />

      <DeletePostModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        post={post}
        onPostDeleted={onPostDeleted}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  specialtyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  specialtyText: {
    fontSize: 10,
    color: "#4f46e5",
    fontWeight: "500",
    marginLeft: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  forumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  forumText: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "500",
    marginLeft: 2,
  },
  menu: {
    marginTop: 40,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: -8,
  },
  contentContainer: {
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 24,
  },
  contentWrapper: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  contentScrollView: {
    maxHeight: 300,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  imagesContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  reactionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  likeCount: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 2,
    fontWeight: "600",
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  commentCount: {
    fontSize: 14,
    color: "#0ea5e9",
    marginLeft: 4,
    fontWeight: "600",
  },
});

export default PostCard;
