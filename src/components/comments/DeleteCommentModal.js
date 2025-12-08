import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../../config/firebase";
import { useCommentActions } from "../../hooks/useCommentActions";
import { useUserPermissions } from "../../hooks/useUserPermissions";

const DeleteCommentModal = ({
  visible,
  onClose,
  comment,
  onCommentDeleted,
  isModeratorAction = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState("");
  const [stats, setStats] = useState({
    replies: 0,
    likes: 0,
    dislikes: 0,
  });

  const currentUser = auth.currentUser;
  const { deleteComment, loading, error, clearError } = useCommentActions();
  const { userData } = useUserPermissions();

  // Calcular estadísticas del comentario
  useEffect(() => {
    if (visible && comment) {
      // Estas estadísticas necesitarían ser calculadas con una función adicional
      // Por ahora usamos valores por defecto
      setStats({
        replies: comment.replyCount || 0,
        likes: comment.likes?.length || 0,
        dislikes: 0, // Los comentarios no tienen dislikes en tu estructura
      });
      clearError();
    }
  }, [visible, comment]);

  // Manejar eliminación
  const handleDelete = async () => {
    if (!currentUser) {
      Alert.alert("Error", "Debes iniciar sesión para eliminar");
      return;
    }

    setIsDeleting(true);
    setDeletionProgress("Iniciando eliminación...");

    try {
      const result = await deleteComment(comment.id, isModeratorAction);

      if (result.success) {
        // Construir mensaje de éxito
        let successMessage = "El comentario se eliminó correctamente";

        if (result.deletedCount > 1) {
          successMessage += `\n• Se eliminaron ${result.deletedCount} comentarios en total`;
        }

        if (stats.replies > 0) {
          successMessage += `\n• ${stats.replies} respuesta${
            stats.replies !== 1 ? "s" : ""
          } eliminada${stats.replies !== 1 ? "s" : ""}`;
        }

        if (stats.likes > 0) {
          successMessage += `\n• ${stats.likes} like${
            stats.likes !== 1 ? "s" : ""
          } eliminado${stats.likes !== 1 ? "s" : ""}`;
        }

        if (result.deletionType === "moderator") {
          successMessage += "\n• Acción registrada para auditoría del sistema";
        }

        Alert.alert("Éxito", successMessage, [
          {
            text: "OK",
            onPress: () => {
              if (onCommentDeleted) {
                onCommentDeleted(result.deletionType);
              }
              handleClose();
            },
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          result.error || "No se pudo eliminar el comentario"
        );
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al eliminar el comentario");
      console.error("Error en handleDelete:", error);
    } finally {
      setIsDeleting(false);
      setDeletionProgress("");
    }
  };

  // Manejar cierre del modal
  const handleClose = () => {
    if (isDeleting) {
      Alert.alert(
        "Eliminando comentario",
        "Espera a que termine de eliminar antes de cerrar",
        [{ text: "OK" }]
      );
      return;
    }
    onClose();
  };

  // Obtener título del modal
  const getModalTitle = () => {
    if (isModeratorAction) {
      return "Eliminar Comentario (Moderación)";
    }
    return "Eliminar Comentario";
  };

  // Obtener descripción del modal
  const getModalDescription = () => {
    if (isModeratorAction) {
      return "Esta acción se registrará para auditoría del sistema y puede conllevar sanciones para el autor.";
    }
    return "Esta acción no se puede deshacer. El comentario se eliminará permanentemente.";
  };

  // Obtener texto del botón principal
  const getButtonText = () => {
    if (isDeleting) {
      return "Eliminando...";
    }
    if (isModeratorAction) {
      return "Eliminar como Moderador";
    }
    return "Eliminar Comentario";
  };

  // Renderizar icono según tipo de eliminación
  const renderIcon = () => {
    if (isModeratorAction) {
      return (
        <View style={[styles.iconContainer, styles.moderatorIcon]}>
          <IconButton icon="shield-alert" size={36} iconColor="#dc2626" />
        </View>
      );
    }

    return (
      <View style={[styles.iconContainer, styles.userIcon]}>
        <IconButton icon="alert-circle" size={36} iconColor="#ef4444" />
      </View>
    );
  };

  // Renderizar estadísticas de lo que se eliminará
  const renderStats = () => {
    const hasStats = stats.replies > 0 || stats.likes > 0 || stats.dislikes > 0;

    if (!hasStats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Se eliminará también:</Text>

        {stats.replies > 0 && (
          <View style={styles.statItem}>
            <IconButton icon="reply" size={16} iconColor="#6b7280" />
            <Text style={styles.statText}>
              {stats.replies} respuesta{stats.replies !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {stats.likes > 0 && (
          <View style={styles.statItem}>
            <IconButton icon="heart" size={16} iconColor="#6b7280" />
            <Text style={styles.statText}>
              {stats.likes} like{stats.likes !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {stats.dislikes > 0 && (
          <View style={styles.statItem}>
            <IconButton icon="thumb-down" size={16} iconColor="#6b7280" />
            <Text style={styles.statText}>
              {stats.dislikes} dislike{stats.dislikes !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        <View style={styles.statsNote}>
          <IconButton icon="information" size={12} iconColor="#6b7280" />
          <Text style={styles.statsNoteText}>
            También se actualizarán las estadísticas del foro y del autor
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar progreso de eliminación
  const renderProgress = () => {
    if (!isDeleting || !deletionProgress) return null;

    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="small" color="#ef4444" />
        <Text style={styles.progressText}>{deletionProgress}</Text>
      </View>
    );
  };

  // Renderizar advertencia
  const renderWarning = () => (
    <View
      style={[
        styles.warningContainer,
        isModeratorAction ? styles.moderatorWarning : styles.userWarning,
      ]}
    >
      <View style={styles.warningHeader}>
        <IconButton
          icon="alert"
          size={20}
          iconColor={isModeratorAction ? "#dc2626" : "#ef4444"}
        />
        <Text
          style={[
            styles.warningTitle,
            isModeratorAction
              ? styles.moderatorWarningTitle
              : styles.userWarningTitle,
          ]}
        >
          {isModeratorAction
            ? "Acción de moderación"
            : "Eliminación permanente"}
        </Text>
      </View>

      <View style={styles.warningList}>
        {isModeratorAction ? (
          <>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#dc2626" />
              <Text style={styles.warningText}>
                El comentario se marcará como eliminado por moderación
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#dc2626" />
              <Text style={styles.warningText}>
                El autor será notificado sobre la eliminación
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#dc2626" />
              <Text style={styles.warningText}>
                La acción quedará registrada en el sistema
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#dc2626" />
              <Text style={styles.warningText}>
                Puede conllevar sanciones para el autor
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#ef4444" />
              <Text style={styles.warningText}>
                El comentario será eliminado permanentemente
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#ef4444" />
              <Text style={styles.warningText}>
                No podrás recuperar este comentario
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#ef4444" />
              <Text style={styles.warningText}>
                Las respuestas a este comentario también se eliminarán
              </Text>
            </View>
            <View style={styles.warningItem}>
              <IconButton icon="circle-small" size={16} iconColor="#ef4444" />
              <Text style={styles.warningText}>
                Esta acción no se puede deshacer
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Contenido desplazable */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Icono */}
            {renderIcon()}

            {/* Título y descripción */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{getModalTitle()}</Text>
              <Text style={styles.description}>{getModalDescription()}</Text>
            </View>

            {/* Información del comentario */}
            <View style={styles.commentInfoContainer}>
              <Text style={styles.commentInfoTitle}>
                Comentario a eliminar:
              </Text>
              <View style={styles.commentContentContainer}>
                <Text style={styles.commentContent} numberOfLines={3}>
                  {comment?.content || "Contenido no disponible"}
                </Text>
                {comment?.createdAt && (
                  <Text style={styles.commentDate}>
                    Creado el:{" "}
                    {comment.createdAt.toDate?.().toLocaleDateString("es-ES") ||
                      "Fecha no disponible"}
                  </Text>
                )}
              </View>
            </View>

            {/* Estadísticas */}
            {renderStats()}

            {/* Advertencia */}
            {renderWarning()}

            {/* Progreso */}
            {renderProgress()}

            {/* Nota final */}
            <Text style={styles.note}>
              {isModeratorAction
                ? "Esta acción es irreversible y será registrada en el sistema de moderación."
                : "Solo puedes eliminar comentarios que hayas creado tú."}
            </Text>
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                isModeratorAction
                  ? styles.moderatorDeleteButton
                  : styles.userDeleteButton,
                isDeleting && styles.deleteButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size={20} color="#ffffff" />
              ) : (
                <>
                  <IconButton icon="delete" size={20} iconColor="#ffffff" />
                  <Text style={styles.deleteButtonText}>{getButtonText()}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    maxHeight: "80%",
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  userIcon: {
    // Estilos por defecto
  },
  moderatorIcon: {
    // Estilos específicos para moderador
  },
  textContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 22,
  },
  commentInfoContainer: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  commentInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  commentContentContainer: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  commentContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  statsContainer: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 8,
  },
  statsNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  statsNoteText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginLeft: 8,
    flex: 1,
  },
  warningContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  userWarning: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  moderatorWarning: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  userWarningTitle: {
    color: "#dc2626",
  },
  moderatorWarningTitle: {
    color: "#dc2626",
  },
  warningList: {
    marginLeft: 8,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 18,
    marginLeft: 4,
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  progressText: {
    fontSize: 13,
    color: "#dc2626",
    marginLeft: 12,
  },
  note: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 24,
    fontStyle: "italic",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  deleteButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  userDeleteButton: {
    backgroundColor: "#ef4444",
  },
  moderatorDeleteButton: {
    backgroundColor: "#dc2626",
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default DeleteCommentModal;
