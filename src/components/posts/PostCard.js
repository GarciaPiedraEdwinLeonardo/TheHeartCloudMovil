import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { IconButton } from "react-native-paper";
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
  const [showPopover, setShowPopover] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(
    post.stats?.commentCount || 0
  );
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  const currentUser = auth.currentUser;
  const isAuthor = currentUser && currentUser.uid === post.authorId;
  const { reactToPost, loading: reactionLoading } = usePostActions();
  const menuButtonRef = useRef(null);

  useEffect(() => {
    // Inicializar contadores y reacción del usuario
    const likes = post.likes || [];
    const dislikes = post.dislikes || [];

    setLikeCount(likes.length);
    setDislikeCount(dislikes.length);
    setCommentCount(post.stats?.commentCount || 0);

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

  // Manejar clic en botón de comentarios
  const handleCommentClick = () => {
    setShowCommentsModal(true);
    if (onCommentClick && typeof onCommentClick === "function") {
      onCommentClick(post);
    }
  };

  // Manejar clic en el botón de menú (popover) - SOLUCIÓN CORREGIDA
  const handleMenuPress = () => {
    // Si ya está abierto, cerrarlo
    if (showPopover) {
      setShowPopover(false);
      return;
    }

    // Si no está abierto, calcular posición y abrirlo
    if (menuButtonRef.current) {
      menuButtonRef.current.measureInWindow((x, y, width, height) => {
        // Calcular posición para el popover
        const screenWidth = Dimensions.get("window").width || 375;
        const popoverWidth = 160;

        // Para PostCard, el menú está a la derecha, así que ajustamos diferente
        // Queremos que aparezca a la izquierda del botón
        let popoverX = x - popoverWidth + width - 10;

        // Ajustar si se sale por la izquierda
        if (popoverX < 10) {
          popoverX = 10;
        }

        // Posición Y (debajo del botón)
        const popoverY = y + height + 5;

        console.log("Posición calculada:", { x: popoverX, y: popoverY });

        setPopoverPosition({ x: popoverX, y: popoverY });
        setShowPopover(true);
      });
    }
  };

  // Cerrar popover cuando se selecciona una opción
  const handleOptionSelect = (action) => {
    setShowPopover(false);
    if (action === "edit") {
      setShowEditModal(true);
    } else if (action === "delete") {
      setShowDeleteModal(true);
    }
  };

  // Renderizar popover/menú personalizado para el autor
  const renderPopover = () => (
    <Modal
      visible={showPopover}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPopover(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowPopover(false)}>
        <View style={styles.popoverOverlay}>
          <View
            style={[
              styles.popoverContainer,
              {
                position: "absolute",
                top: popoverPosition.y,
                left: popoverPosition.x,
              },
            ]}
          >
            {/* Flecha indicadora (ARRIBA del contenido) */}
            <View style={styles.popoverArrow} />

            {/* Contenido del popover */}
            <View style={styles.popoverContent}>
              <TouchableOpacity
                style={styles.popoverItem}
                onPress={() => handleOptionSelect("edit")}
              >
                <View style={styles.popoverItemIcon}>
                  <IconButton icon="pencil" size={18} iconColor="#4b5563" />
                </View>
                <Text style={styles.popoverItemText}>Editar</Text>
              </TouchableOpacity>

              <View style={styles.popoverDivider} />

              <TouchableOpacity
                style={[styles.popoverItem, styles.popoverDeleteItem]}
                onPress={() => handleOptionSelect("delete")}
              >
                <View style={styles.popoverItemIcon}>
                  <IconButton icon="delete" size={18} iconColor="#ef4444" />
                </View>
                <Text
                  style={[styles.popoverItemText, styles.popoverDeleteText]}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

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

            {/* Menú solo para autor - CON POPOVER PERSONALIZADO */}
            {isAuthor && (
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  ref={menuButtonRef}
                  onPress={handleMenuPress}
                  style={styles.menuButton}
                >
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    iconColor="#6b7280"
                  />
                </TouchableOpacity>

                {/* Renderizar popover si está activo */}
                {renderPopover()}
              </View>
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
              </TouchableOpacity>

              {/* Comment button */}
              <TouchableOpacity
                style={styles.commentButton}
                onPress={handleCommentClick}
              >
                <IconButton icon="comment" size={20} iconColor="#6b7280" />
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

      {/* Modal de Comentarios */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={post}
        onCommentDeleted={(commentId, deletionType) => {
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
  menuContainer: {
    position: "relative",
    zIndex: 1000,
  },
  menuButton: {
    padding: 4,
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

  // Estilos para el Popover (MEJORADOS)
  popoverOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  popoverContainer: {
    zIndex: 2000,
  },
  popoverArrow: {
    position: "absolute",
    top: 0,
    right: 15,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#ffffff",
    zIndex: 2001,
  },
  popoverContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8, // Para que la flecha no tape el contenido
    zIndex: 2000,
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  popoverItemIcon: {
    width: 32,
    alignItems: "center",
  },
  popoverItemText: {
    fontSize: 15,
    color: "#374151",
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  popoverDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 12,
  },
  popoverDeleteItem: {
    backgroundColor: "#fef2f2",
  },
  popoverDeleteText: {
    color: "#dc2626",
  },
});

export default PostCard;
