import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { IconButton, Menu, Divider } from "react-native-paper";
import { auth } from "../../config/firebase";
import PostImages from "./PostImages";
import EditPostModal from "./EditPostModal";
import DeletePostModal from "./DeletePostModal";
import CommentsModal from "../comments/CommentsModal";
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
  const [showCommentsModal, setShowCommentsModal] = useState(false); // NUEVO ESTADO
  const [userReaction, setUserReaction] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(
    post.stats?.commentCount || 0
  ); // NUEVO ESTADO

  const currentUser = auth.currentUser;
  const isAuthor = currentUser && currentUser.uid === post.authorId;
  const { reactToPost, loading: reactionLoading } = usePostActions();

  useEffect(() => {
    // Inicializar contadores y reacción del usuario
    const likes = post.likes || [];
    const dislikes = post.dislikes || [];

    setLikeCount(likes.length);
    setDislikeCount(dislikes.length);
    setCommentCount(post.stats?.commentCount || 0); // Inicializar contador de comentarios

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

  // Función para obtener el nombre del autor
  const getAuthorName = () => {
    if (post.authorName) return post.authorName;

    // Si viene de authorData, intenta construir el nombre
    if (post.authorData) {
      const name = post.authorData.name?.name;
      const lastName = post.authorData.name?.apellidopat;

      if (name) {
        return `${name} ${lastName || ""}`.trim();
      }

      // Si no hay name, usar email
      if (post.authorData.email) {
        return post.authorData.email;
      }
    }

    // Si no hay nada, usar email pasado como prop o texto genérico
    return post.authorEmail || "Usuario";
  };

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

  // NUEVA FUNCIÓN: Manejar clic en botón de comentarios
  const handleCommentClick = () => {
    // Siempre abrir el modal de comentarios
    setShowCommentsModal(true);

    // Si hay un callback externo, podemos llamarlo también si es necesario
    // pero NO para navegar
    if (onCommentClick && typeof onCommentClick === "function") {
      // Podemos pasar los datos del post sin navegar
      onCommentClick(post);
    }
  };

  // NUEVA FUNCIÓN: Manejar cuando se agrega un comentario
  const handleCommentAdded = () => {
    // Actualizar contador local
    setCommentCount((prev) => prev + 1);

    // Notificar al componente padre si es necesario
    if (onPostUpdated) {
      // Podríamos querer refrescar los datos del post
      onPostUpdated();
    }
  };

  // NUEVA FUNCIÓN: Manejar cuando se elimina un comentario
  const handleCommentDeleted = (commentId, deletionType) => {
    // Actualizar contador local
    setCommentCount((prev) => Math.max(0, prev - 1));

    // Podemos mostrar un mensaje si fue eliminación de moderador
    if (deletionType === "moderator") {
      Alert.alert(
        "Comentario eliminado",
        "Un moderador ha eliminado este comentario",
        [{ text: "OK" }]
      );
    }
  };

  const authorName = getAuthorName();

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
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </Text>
                {post.authorVerified && (
                  <View style={styles.verifiedBadge}>
                    <IconButton
                      icon="check-decagram"
                      size={12}
                      iconColor="#10b981"
                    />
                  </View>
                )}
              </View>

              {/* Especialidad médica */}
              {post.authorSpecialty && (
                <Text style={styles.specialtyText} numberOfLines={1}>
                  {post.authorSpecialty}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {post.forumName && (
              <TouchableOpacity
                style={styles.forumBadge}
                onPress={() => onForumPress && onForumPress(post.forumId)}
              >
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
          {post.updatedAt && (
            <>
              <Text style={styles.dateSeparator}>•</Text>
              <Text style={styles.updatedText}>Editado</Text>
            </>
          )}
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

              {/* Comment button - MODIFICADO */}
              <TouchableOpacity
                style={styles.commentButton}
                onPress={handleCommentClick}
              >
                <IconButton icon="comment" size={20} iconColor="#6b7280" />
                {commentCount > 0 && (
                  <Text style={styles.commentCount}>{commentCount}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modales existentes */}
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

      {/* NUEVO MODAL: Comentarios */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={post}
        onCommentDeleted={(commentId, deletionType) => {
          // Solo actualizar contador si es necesario
          if (deletionType === "user" || deletionType === "moderator") {
            setCommentCount((prev) => Math.max(0, prev - 1));
          }
        }}
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
    marginBottom: 12,
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
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  specialtyText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    fontWeight: "500",
  },
  verifiedBadge: {
    marginLeft: 6,
    padding: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  forumBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 4,
    maxWidth: 120,
  },
  forumText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "500",
  },
  menu: {
    marginTop: 40,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: -8,
  },
  dateSeparator: {
    fontSize: 12,
    color: "#d1d5db",
    marginHorizontal: 4,
  },
  updatedText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
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
