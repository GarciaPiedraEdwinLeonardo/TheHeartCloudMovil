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
} from "react-native";
import { IconButton, Menu, Divider } from "react-native-paper";
import { auth } from "../../config/firebase";
import { useCommentActions } from "../../hooks/useCommentActions";
import { useCommentLikes } from "../../hooks/useCommentLikes";
import { useUserPermissions } from "../../hooks/useUserPermissions";
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
  userData,
  onReply,
  onCommentDeleted,
  onCommentCreated,
  isReply = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [authorData, setAuthorData] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

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
  const { checkCommentPermissions } = useUserPermissions();

  // Configuración de animación para expandir/contraer
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

  // Cargar datos del autor del comentario
  useEffect(() => {
    const loadAuthor = async () => {
      if (!comment.authorId) return;

      setLoadingAuthor(true);
      try {
        const author = await getCommentAuthor(comment.authorId);
        setAuthorData(author);
      } catch (error) {
        console.error("Error cargando autor:", error);
      } finally {
        setLoadingAuthor(false);
      }
    };

    loadAuthor();
  }, [comment.authorId]);

  // Verificar si el contenido necesita expansión
  useEffect(() => {
    if (contentHeight > 0) {
      const lineHeight = 20; // Altura aproximada de línea en React Native
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
      const fullName = `${name.name || ""} ${name.apellidopat || ""} ${
        name.apellidomat || ""
      }`.trim();
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
    setShowMenu(false);
  };

  // Manejar eliminación
  const handleDelete = () => {
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  // Manejar reporte
  const handleReport = () => {
    Alert.alert(
      "Reportar comentario",
      "¿Estás seguro de que quieres reportar este comentario?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reportar",
          style: "destructive",
          onPress: () => {
            // Aquí se integraría la lógica de reporte
            Alert.alert(
              "Reporte enviado",
              "El comentario ha sido reportado a los moderadores"
            );
          },
        },
      ]
    );
    setShowMenu(false);
  };

  // Manejar actualización exitosa del comentario
  const handleCommentUpdated = () => {
    setShowEditModal(false);
    if (onCommentCreated) {
      onCommentCreated();
    }
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

  // Verificar permisos del usuario actual sobre este comentario
  const getUserPermissions = () => {
    if (!currentUser || !userData) {
      return {
        isAuthor: false,
        canEdit: false,
        canDelete: false,
        canReply: false,
        canReport: false,
        canModerate: false,
      };
    }

    const isAuthor = currentUser.uid === comment.authorId;
    const isVerified = userData.role !== "unverified";
    const canReply =
      isVerified && ["doctor", "moderator", "admin"].includes(userData.role);
    const canEdit = isAuthor;
    const canDelete =
      isAuthor || ["moderator", "admin"].includes(userData.role);
    const canReport =
      !isAuthor && !["moderator", "admin"].includes(userData.role);
    const canModerate = ["moderator", "admin"].includes(userData.role);

    return {
      isAuthor,
      canEdit,
      canDelete,
      canReply,
      canReport,
      canModerate,
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

      {/* Reply button (solo usuarios verificados) */}
      {permissions.canReply && (
        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
          <IconButton icon="reply" size={18} iconColor="#6b7280" />
          <Text style={styles.actionText}>Responder</Text>
        </TouchableOpacity>
      )}

      {/* Menú contextual (solo si el usuario tiene algún permiso) */}
      {(permissions.isAuthor ||
        permissions.canDelete ||
        permissions.canReport) && (
        <View style={styles.menuContainer}>
          <Menu
            visible={showMenu}
            onDismiss={() => setShowMenu(false)}
            anchor={
              <TouchableOpacity onPress={() => setShowMenu(true)}>
                <IconButton
                  icon="dots-horizontal"
                  size={18}
                  iconColor="#6b7280"
                />
              </TouchableOpacity>
            }
            style={styles.menu}
          >
            {/* Acciones del autor */}
            {permissions.isAuthor && (
              <>
                <Menu.Item
                  leadingIcon="pencil"
                  onPress={handleEdit}
                  title="Editar"
                  titleStyle={styles.menuItemText}
                />
                <Divider />
                <Menu.Item
                  leadingIcon="delete"
                  onPress={handleDelete}
                  title="Eliminar"
                  titleStyle={[styles.menuItemText, styles.deleteText]}
                />
              </>
            )}

            {/* Reportar (solo usuarios normales, no autores ni moderadores) */}
            {permissions.canReport && (
              <Menu.Item
                leadingIcon="flag"
                onPress={handleReport}
                title="Reportar"
                titleStyle={[styles.menuItemText, styles.reportText]}
              />
            )}

            {/* Acciones de moderación */}
            {permissions.canModerate && !permissions.isAuthor && (
              <>
                <Divider />
                <Text style={styles.moderatorSectionTitle}>Moderación</Text>
                <Menu.Item
                  leadingIcon="delete"
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert(
                      "Eliminar como moderador",
                      "¿Eliminar este comentario como moderador?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Eliminar",
                          style: "destructive",
                          onPress: () => handleDelete(),
                        },
                      ]
                    );
                  }}
                  title="Eliminar como moderador"
                  titleStyle={[styles.menuItemText, styles.moderatorDeleteText]}
                />
              </>
            )}
          </Menu>
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
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => {
              // Aquí se podría navegar al perfil del autor
              Alert.alert("Perfil", `Ver perfil de ${getAuthorName()}`);
            }}
            disabled={loadingAuthor}
          >
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
          </TouchableOpacity>
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
        isModeratorAction={permissions.canModerate && !permissions.isAuthor}
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
  },
  menu: {
    marginTop: 40,
  },
  menuItemText: {
    fontSize: 14,
  },
  deleteText: {
    color: "#ef4444",
  },
  reportText: {
    color: "#f59e0b",
  },
  moderatorSectionTitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  moderatorDeleteText: {
    color: "#dc2626",
    fontWeight: "600",
  },
});

export default CommentCard;
