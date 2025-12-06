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
  const { deletePost } = usePostActions();

  const handleDelete = async () => {
    try {
      setLoading(true);

      const result = await deletePost(post.id);

      if (result.success) {
        Alert.alert("Éxito", "La publicación se eliminó correctamente", [
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
    }
  };

  const handleClose = () => {
    onClose();
  };

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
            eliminará permanentemente.
          </Text>

          {post?.images && post.images.length > 0 && (
            <Text style={styles.warningText}>
              ⚠️ También se eliminarán {post.images.length} imagen(es)
              adjunta(s)
            </Text>
          )}

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={loading}
              contentStyle={styles.buttonContent}
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
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </Button>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={styles.loadingText}>Eliminando publicación...</Text>
            </View>
          )}
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
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
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
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 24,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    borderColor: "#d1d5db",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
  },
  buttonContent: {
    height: 48,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});

export default DeletePostModal;
