import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { IconButton, Button, ActivityIndicator } from "react-native-paper";
import { usePostActions } from "../../hooks/usePostActions";

const DeletePostModal = ({ visible, onClose, post, onPostDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState("");
  const { deletePost } = usePostActions();

  const handleDelete = async () => {
    try {
      setLoading(true);
      setDeletionProgress("Iniciando eliminación...");

      const result = await deletePost(post.id);

      if (result.success) {
        // Mostrar estadísticas de lo que se eliminó
        let successMessage = "La publicación se eliminó correctamente";

        if (result.deletedComments > 0) {
          successMessage += `\n• ${result.deletedComments} comentario(s) eliminado(s)`;
        }

        if (result.updatedAuthors > 0) {
          successMessage += `\n• Estadísticas de ${result.updatedAuthors} usuario(s) actualizadas`;
        }

        Alert.alert("Éxito", successMessage, [
          {
            text: "OK",
            onPress: () => {
              if (onPostDeleted) {
                onPostDeleted();
              }
              handleClose();
            },
          },
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error eliminando post:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudo eliminar la publicación"
      );
    } finally {
      setLoading(false);
      setDeletionProgress("");
    }
  };

  const handleClose = () => {
    if (loading) {
      Alert.alert(
        "Eliminando publicación",
        "Espera a que termine de eliminar antes de cerrar",
        [{ text: "OK" }]
      );
      return;
    }
    onClose();
  };

  // Calcular estadísticas para mostrar
  const getPostStats = () => {
    if (!post) return { images: 0, comments: 0, likes: 0, dislikes: 0 };

    return {
      images: post.images?.length || 0,
      comments: post.stats?.commentCount || 0,
      likes: post.likes?.length || 0,
      dislikes: post.dislikes?.length || 0,
    };
  };

  const stats = getPostStats();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Icono de advertencia */}
          <View style={styles.iconContainer}>
            <IconButton
              icon="alert-circle"
              size={48}
              iconColor="#ef4444"
              style={styles.warningIcon}
            />
          </View>

          {/* Título y mensaje */}
          <Text style={styles.title}>¿Eliminar publicación?</Text>

          <Text style={styles.message}>
            Esta acción no se puede deshacer. La publicación "{post?.title}" se
            eliminará permanentemente junto con todo su contenido asociado.
          </Text>

          {/* Estadísticas de lo que se eliminará */}
          <View style={styles.statsContainer}>
            {stats.images > 0 && (
              <View style={styles.statItem}>
                <IconButton icon="image" size={16} iconColor="#6b7280" />
                <Text style={styles.statText}>
                  {stats.images} imagen(es) adjunta(s)
                </Text>
              </View>
            )}

            {stats.comments > 0 && (
              <View style={styles.statItem}>
                <IconButton icon="comment" size={16} iconColor="#6b7280" />
                <Text style={styles.statText}>
                  {stats.comments} comentario(s)
                </Text>
              </View>
            )}

            {(stats.likes > 0 || stats.dislikes > 0) && (
              <View style={styles.statItem}>
                <IconButton icon="thumb-up" size={16} iconColor="#6b7280" />
                <Text style={styles.statText}>
                  {stats.likes} like(s) y {stats.dislikes} dislike(s)
                </Text>
              </View>
            )}

            <Text style={styles.statsNote}>
              • También se actualizarán las estadísticas del foro
            </Text>
            <Text style={styles.statsNote}>
              • Se ajustará el contador de posts del autor
            </Text>
          </View>

          {/* Progreso durante la eliminación */}
          {loading && deletionProgress && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.progressText}>{deletionProgress}</Text>
            </View>
          )}

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={loading}
              contentStyle={styles.buttonContent}
              labelStyle={styles.cancelButtonText}
            >
              Cancelar
            </Button>

            <Button
              mode="contained"
              onPress={handleDelete}
              style={styles.deleteButton}
              disabled={loading}
              contentStyle={styles.buttonContent}
              loading={loading}
              labelStyle={styles.deleteButtonText}
            >
              {loading ? "Eliminando..." : "Eliminar Publicación"}
            </Button>
          </View>

          {/* Información adicional */}
          <Text style={styles.note}>
            Solo puedes eliminar publicaciones que hayas creado tú.
          </Text>
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
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  warningIcon: {
    margin: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: "100%",
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
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  progressText: {
    fontSize: 13,
    color: "#dc2626",
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    borderColor: "#d1d5db",
    borderWidth: 1.5,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    borderWidth: 0,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  buttonContent: {
    height: 48,
  },
  note: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
    lineHeight: 16,
  },
});

export default DeletePostModal;
