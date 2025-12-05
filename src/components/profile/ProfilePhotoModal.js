import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { IconButton } from "react-native-paper";
import { useProfilePhoto } from "../../hooks/useProfilePhoto";

const ProfilePhotoModal = ({
  isVisible,
  onClose,
  currentPhoto,
  onPhotoUpdated,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUri, setPreviewUri] = useState(currentPhoto);

  const {
    pickImage,
    takePhoto,
    uploadProfilePhoto,
    deleteProfilePhoto,
    uploading,
    error,
    clearError,
  } = useProfilePhoto();

  const handleSelectFromGallery = async () => {
    clearError();
    const imageUri = await pickImage();
    if (imageUri) {
      setSelectedImage(imageUri);
      setPreviewUri(imageUri);
    }
  };

  const handleTakePhoto = async () => {
    clearError();
    const imageUri = await takePhoto();
    if (imageUri) {
      setSelectedImage(imageUri);
      setPreviewUri(imageUri);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage && currentPhoto) {
      // Si no hay imagen nueva pero hay una actual, solo cierra
      onClose();
      return;
    }

    if (selectedImage) {
      const cloudinaryUrl = await uploadProfilePhoto(selectedImage);
      if (cloudinaryUrl && onPhotoUpdated) {
        onPhotoUpdated(cloudinaryUrl);
      }
    }

    if (!error) {
      onClose();
    }
  };

  const handleRemovePhoto = async () => {
    const success = await deleteProfilePhoto();
    if (success && onPhotoUpdated) {
      onPhotoUpdated(null);
      setPreviewUri(null);
    }

    if (!error) {
      onClose();
    }
  };

  const handleClose = () => {
    clearError();
    setSelectedImage(null);
    setPreviewUri(currentPhoto);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Foto de perfil</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
              disabled={uploading}
            />
          </View>

          {/* Preview de imagen */}
          <View style={styles.previewContainer}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.emptyPreview}>
                <IconButton icon="account" size={60} iconColor="#9ca3af" />
              </View>
            )}
          </View>

          {/* Mensaje de error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Opciones de selección */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleSelectFromGallery}
              disabled={uploading}
            >
              <IconButton icon="image" size={24} iconColor="#2a55ff" />
              <Text style={styles.optionText}>Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              <IconButton icon="camera" size={24} iconColor="#2a55ff" />
              <Text style={styles.optionText}>Cámara</Text>
            </TouchableOpacity>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
            {currentPhoto && (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={handleRemovePhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <IconButton icon="delete" size={20} iconColor="white" />
                    <Text style={styles.removeButtonText}>Eliminar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <IconButton icon="check" size={20} iconColor="white" />
                  <Text style={styles.uploadButtonText}>
                    {selectedImage ? "Subir foto" : "Guardar"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Información */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Formatos: JPG, PNG, WEBP • Máximo 5MB
            </Text>
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
    width: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  previewContainer: {
    alignItems: "center",
    padding: 30,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#2a55ff",
  },
  emptyPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#e5e7eb",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  optionButton: {
    alignItems: "center",
    padding: 16,
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  removeButton: {
    backgroundColor: "#ef4444",
  },
  uploadButton: {
    backgroundColor: "#2a55ff",
  },
  removeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  infoText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default ProfilePhotoModal;
