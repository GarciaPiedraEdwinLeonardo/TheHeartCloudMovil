import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { IconButton } from "react-native-paper";
import { auth } from "../../config/firebase";
import { useCommentActions } from "../../hooks/useCommentActions";
import { useCommentLikes } from "../../hooks/useCommentLikes";
import EditCommentModal from "./EditCommentModal";
import DeleteCommentModal from "./DeleteCommentModal";

// Habilitar animaciones en Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CommentCard = ({
  comment,
  postId,
  onReply,
  onCommentDeleted,
  isReply = false,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [authorData, setAuthorData] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [contentHeight, setContentHeight] = useState(0);

  const contentRef = useRef(null);
  const menuButtonRef = useRef(null);

  const currentUser = auth.currentUser;
  const {
    likeComment,
    getCommentAuthor,
    loading: actionLoading,
  } = useCommentActions();
  const {
    likeCount,
    userLiked,
    loading: likesLoading,
  } = useCommentLikes(comment.id);

  // Configuración de animación
  const animationConfig = {
    duration: 200,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  };

  // Cargar datos del autor
  useEffect(() => {
    let isMounted = true;

    const loadAuthor = async () => {
      if (!comment.authorId || authorData) return;

      setLoadingAuthor(true);
      try {
        const author = await getCommentAuthor(comment.authorId);
        if (isMounted) {
          setAuthorData(author);
        }
      } catch (error) {
        console.error("Error cargando autor:", error);
      } finally {
        if (isMounted) {
          setLoadingAuthor(false);
        }
      }
    };

    loadAuthor();

    return () => {
      isMounted = false;
    };
  }, [comment.authorId]);

  // Verificar si el contenido necesita expansión
  useEffect(() => {
    if (contentHeight > 0) {
      const lineHeight = 20;
      const maxLines = 6;
      const maxHeight = lineHeight * maxLines;
      setNeedsExpansion(contentHeight > maxHeight);
    }
  }, [contentHeight]);

  // Obtener nombre del autor
  const getAuthorName = () => {
    if (comment.authorName) return comment.authorName;
    if (authorData) {
      const name = authorData.name || {};
      const fullName = `${name.name || ""} ${name.apellidopat || ""}`.trim();
      if (fullName) return fullName;
      return authorData.email || "Usuario";
    }
    return "Usuario";
  };

  // Obtener especialidad del autor
  const getAuthorSpecialty = () => {
    if (!authorData) return null;
    return authorData.professionalInfo?.specialty || null;
  };

  // Obtener foto del autor
  const getAuthorPhoto = () => {
    if (!authorData) return null;
    return authorData.photoURL || null;
  };

  // Verificar si el autor está verificado
  const isAuthorVerified = () => {
    if (!authorData) return false;
    return (
      authorData.verificationStatus === "verified" ||
      authorData.role === "doctor"
    );
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Ahora mismo";
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        if (diffDays < 7) return `Hace ${diffDays} d`;
        return date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        });
      }
      return new Date(timestamp).toLocaleDateString("es-ES");
    } catch {
      return "";
    }
  };

  // Manejar like en comentario
  const handleLike = async () => {
    if (!currentUser || actionLoading || likesLoading) return;

    try {
      const result = await likeComment(comment.id);
      if (!result.success) {
        Alert.alert("Error", "No se pudo registrar tu like");
      }
    } catch (error) {
      console.error("Error en like:", error);
      Alert.alert("Error", "Ocurrió un error al registrar tu like");
    }
  };

  // Manejar clic en responder
  const handleReply = () => {
    if (onReply) {
      onReply(comment);
    }
  };

  // Manejar edición
  const handleEdit = () => {
    setShowEditModal(true);
    setShowPopover(false);
  };

  // Manejar eliminación
  const handleDelete = () => {
    setShowDeleteModal(true);
    setShowPopover(false);
  };

  // Manejar actualización exitosa del comentario
  const handleCommentUpdated = () => {
    setShowEditModal(false);
  };

  // Manejar eliminación exitosa del comentario
  const handleCommentDeleted = (deletionType) => {
    setShowDeleteModal(false);
    if (onCommentDeleted) {
      onCommentDeleted(comment.id, deletionType);
    }
  };

  // Toggle para expandir/contraer contenido
  const toggleContent = () => {
    LayoutAnimation.configureNext(animationConfig);
    setShowFullContent(!showFullContent);
  };

  // Manejar clic en el botón de menú
  const handleMenuPress = () => {
    if (menuButtonRef.current) {
      menuButtonRef.current.measureInWindow((x, y, width, height) => {
        // Calcular posición para el popover
        const screenWidth = Dimensions.get("window").width || 375;
        const popoverWidth = 160;

        // Calcular posición X (evitar que se salga de la pantalla)
        let popoverX = x - popoverWidth / 2 + width / 2;

        // Ajustar si se sale por la derecha
        if (popoverX + popoverWidth > screenWidth - 10) {
          popoverX = screenWidth - popoverWidth - 10;
        }

        // Ajustar si se sale por la izquierda
        if (popoverX < 10) {
          popoverX = 10;
        }

        // Posición Y (debajo del botón)
        const popoverY = y + height + 5;

        setPopoverPosition({ x: popoverX, y: popoverY });
        setShowPopover(true);
      });
    }
  };

  // Verificar permisos del usuario actual
  const getUserPermissions = () => {
    if (!currentUser) {
      return {
        isAuthor: false,
        canEdit: false,
        canDelete: false,
        canReply: false,
      };
    }

    const isAuthor = currentUser.uid === comment.authorId;
    const canEdit = isAuthor;
    const canDelete = isAuthor;
    const canReply = true;

    return {
      isAuthor,
      canEdit,
      canDelete,
      canReply,
    };
  };

  const permissions = getUserPermissions();

  // Renderizar foto de perfil del autor
  const renderAuthorAvatar = () => {
    const authorPhoto = getAuthorPhoto();

    if (authorPhoto) {
      return (
        <Image source={{ uri: authorPhoto }} style={styles.authorAvatar} />
      );
    }

    return (
      <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
        <IconButton icon="account" size={16} iconColor="#fff" />
      </View>
    );
  };

  // Renderizar contenido del comentario
  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.contentWrapper}>
        <Text
          ref={contentRef}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setContentHeight(height);
          }}
          style={[
            styles.commentContent,
            !showFullContent && needsExpansion && styles.collapsedContent,
          ]}
          numberOfLines={
            showFullContent ? undefined : needsExpansion ? 6 : undefined
          }
        >
          {comment.content}
        </Text>
      </View>

      {/* Botón para expandir/contraer si es necesario */}
      {needsExpansion && (
        <TouchableOpacity style={styles.expandButton} onPress={toggleContent}>
          <Text style={styles.expandButtonText}>
            {showFullContent ? "Mostrar menos" : "Mostrar más"}
          </Text>
          <IconButton
            icon={showFullContent ? "chevron-up" : "chevron-down"}
            size={16}
            iconColor="#3b82f6"
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // Renderizar popover/menú personalizado
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
            {/* Contenido del popover */}
            <View style={styles.popoverContent}>
              <TouchableOpacity
                style={styles.popoverItem}
                onPress={() => {
                  setShowPopover(false);
                  handleEdit();
                }}
              >
                <IconButton icon="pencil" size={18} iconColor="#4b5563" />
                <Text style={styles.popoverItemText}>Editar</Text>
              </TouchableOpacity>

              <View style={styles.popoverDivider} />

              <TouchableOpacity
                style={[styles.popoverItem, styles.popoverDeleteItem]}
                onPress={() => {
                  setShowPopover(false);
                  handleDelete();
                }}
              >
                <IconButton icon="delete" size={18} iconColor="#ef4444" />
                <Text
                  style={[styles.popoverItemText, styles.popoverDeleteText]}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Flecha indicadora (opcional) */}
            <View style={styles.popoverArrow} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Renderizar acciones del comentario
  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {/* Like button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleLike}
        disabled={actionLoading || likesLoading || !currentUser}
      >
        <IconButton
          icon={userLiked ? "heart" : "heart-outline"}
          size={18}
          iconColor={userLiked ? "#ef4444" : "#6b7280"}
        />
        {likeCount > 0 && (
          <Text style={[styles.likeCount, userLiked && styles.likedCount]}>
            {likeCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Reply button */}
      {permissions.canReply && (
        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
          <IconButton icon="reply" size={18} iconColor="#6b7280" />
          <Text style={styles.actionText}>Responder</Text>
        </TouchableOpacity>
      )}

      {/* Menú contextual SOLO para autores - POPOVER PERSONALIZADO */}
      {permissions.isAuthor && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            ref={menuButtonRef}
            onPress={handleMenuPress}
            style={styles.menuButton}
          >
            <IconButton icon="dots-horizontal" size={20} iconColor="#6b7280" />
          </TouchableOpacity>

          {/* Renderizar popover si está activo */}
          {renderPopover()}
        </View>
      )}
    </View>
  );

  return (
    <>
      <View
        style={[
          styles.container,
          isReply && styles.replyContainer,
          loadingAuthor && styles.loadingContainer,
        ]}
      >
        {/* Header con información del autor */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            {renderAuthorAvatar()}

            <View style={styles.authorDetails}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {getAuthorName()}
                </Text>

                {/* Badge de verificado */}
                {isAuthorVerified() && (
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
              {getAuthorSpecialty() && (
                <Text style={styles.authorSpecialty} numberOfLines={1}>
                  {getAuthorSpecialty()}
                </Text>
              )}

              {/* Fecha del comentario */}
              <View style={styles.dateRow}>
                <IconButton icon="calendar" size={12} iconColor="#9ca3af" />
                <Text style={styles.commentDate}>
                  {formatDate(comment.createdAt)}
                </Text>
                {comment.updatedAt && (
                  <>
                    <Text style={styles.dateSeparator}>•</Text>
                    <Text style={styles.editedText}>Editado</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Contenido del comentario */}
        {renderContent()}

        {/* Acciones */}
        {renderActions()}
      </View>

      {/* Modales */}
      <EditCommentModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        comment={comment}
        onCommentUpdated={handleCommentUpdated}
      />

      <DeleteCommentModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        comment={comment}
        onCommentDeleted={handleCommentDeleted}
        isModeratorAction={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  replyContainer: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  loadingContainer: {
    opacity: 0.7,
  },
  header: {
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
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
  verifiedBadge: {
    marginLeft: 6,
    padding: 0,
  },
  authorSpecialty: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginLeft: -8,
  },
  dateSeparator: {
    fontSize: 11,
    color: "#d1d5db",
    marginHorizontal: 4,
  },
  editedText: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  contentContainer: {
    marginBottom: 12,
  },
  contentWrapper: {
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  collapsedContent: {
    maxHeight: 120,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "500",
    marginRight: 2,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    paddingVertical: 4,
  },
  likeCount: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: -4,
  },
  likedCount: {
    color: "#ef4444",
  },
  actionText: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 2,
  },
  menuContainer: {
    marginLeft: "auto",
    zIndex: 10,
  },
  menuButton: {
    padding: 4,
  },

  // Estilos para el Popover
  popoverOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  popoverContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  popoverArrow: {
    position: "absolute",
    top: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#ffffff",
  },
  popoverContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  popoverItemText: {
    fontSize: 15,
    color: "#374151",
    marginLeft: 12,
    fontWeight: "500",
  },
  popoverDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 4,
  },
  popoverDeleteItem: {
    backgroundColor: "#fef2f2",
  },
  popoverDeleteText: {
    color: "#dc2626",
  },
});

export default CommentCard;
