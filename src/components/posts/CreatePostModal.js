import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { IconButton, Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { usePostActions } from "../../hooks/usePostActions";

const CreatePostModal = ({
  visible,
  onClose,
  forumId,
  forumName,
  requiresPostApproval,
  canPostWithoutApproval,
  onPostCreated,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { createPost, uploadImages } = usePostActions();

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (visible) {
      setTitle("");
      setContent("");
      setImage(null);
      setUploadProgress(0);
    }
  }, [visible]);

  // Seleccionar imagen
  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permisos requeridos",
          "Se necesitan permisos para acceder a la galería"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  // Eliminar imagen
  const removeImage = () => {
    setImage(null);
  };

  // Crear publicación
  const handleCreatePost = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "El título es requerido");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Error", "El contenido es requerido");
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert("Error", "El título debe tener al menos 5 caracteres");
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert("Error", "El contenido debe tener al menos 10 caracteres");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0.1);

      let uploadedImages = [];

      // Subir imagen si hay
      if (image) {
        setUploadProgress(0.3);
        const uploadResult = await uploadImages([image]);

        if (uploadResult.success) {
          uploadedImages = uploadResult.images || [];
          setUploadProgress(0.6);
        } else {
          throw new Error(uploadResult.error || "Error subiendo la imagen");
        }
      }

      // Determinar estado del post
      const postStatus =
        requiresPostApproval && !canPostWithoutApproval ? "pending" : "active";

      setUploadProgress(0.8);
      const result = await createPost({
        title: title.trim(),
        content: content.trim(),
        forumId: forumId,
        images: uploadedImages,
        status: postStatus,
      });

      if (result.success) {
        setUploadProgress(1);

        // Mostrar mensaje de éxito
        const successMessage =
          requiresPostApproval && !canPostWithoutApproval
            ? "Tu publicación ha sido enviada y está pendiente de aprobación"
            : "Publicación creada exitosamente";

        Alert.alert("Éxito", successMessage, [
          {
            text: "OK",
            onPress: () => {
              if (onPostCreated) {
                onPostCreated();
              }
              handleClose();
            },
          },
        ]);
      } else {
        throw new Error(result.error || "Error creando la publicación");
      }
    } catch (error) {
      console.error("Error creando post:", error);
      Alert.alert("Error", error.message || "No se pudo crear la publicación");
    } finally {
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  // Cerrar modal
  const handleClose = () => {
    if (loading) {
      Alert.alert(
        "Creando publicación",
        "Espera a que termine de crear la publicación antes de cerrar",
        [{ text: "OK" }]
      );
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Crear Publicación</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
              disabled={loading}
            />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Información del foro */}
            <View style={styles.forumInfo}>
              <Text style={styles.forumName}>{forumName}</Text>
              {requiresPostApproval && !canPostWithoutApproval && (
                <View style={styles.approvalNotice}>
                  <IconButton
                    icon="shield-alert"
                    size={16}
                    iconColor="#f59e0b"
                  />
                  <Text style={styles.approvalText}>
                    Requiere aprobación de moderador
                  </Text>
                </View>
              )}
            </View>

            {/* Indicador de progreso */}
            {loading && uploadProgress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${uploadProgress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {uploadProgress < 0.5
                    ? "Subiendo imagen..."
                    : "Creando publicación..."}
                </Text>
              </View>
            )}

            {/* Título */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Título de la publicación"
                placeholderTextColor="#9ca3af"
                maxLength={200}
                editable={!loading}
              />
              <Text style={styles.charCount}>{title.length}/200</Text>
            </View>

            {/* Contenido */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contenido *</Text>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="Escribe el contenido de tu publicación..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.charCount}>{content.length}/5000</Text>
            </View>

            {/* Imagen */}
            <View style={styles.imageContainer}>
              <Text style={styles.label}>Imagen (opcional)</Text>

              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}
                    disabled={loading}
                  >
                    <IconButton
                      icon="close"
                      size={16}
                      iconColor="#ffffff"
                      style={styles.removeIcon}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={pickImage}
                  disabled={loading}
                >
                  <IconButton icon="image-plus" size={24} iconColor="#3b82f6" />
                  <Text style={styles.addImageText}>Agregar imagen</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.imageHint}>
                Máximo 1 imagen • Formatos: JPEG, PNG • Máximo 5MB
              </Text>
            </View>

            {/* Información adicional */}
            {requiresPostApproval && !canPostWithoutApproval && (
              <View style={styles.infoBox}>
                <IconButton icon="information" size={20} iconColor="#3b82f6" />
                <Text style={styles.infoText}>
                  Tu publicación será revisada por un moderador antes de ser
                  visible para la comunidad.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={loading}
              labelStyle={styles.cancelButtonText}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreatePost}
              style={[
                styles.createButton,
                (!title.trim() || !content.trim()) &&
                  styles.createButtonDisabled,
              ]}
              disabled={loading || !title.trim() || !content.trim()}
              loading={loading}
              labelStyle={styles.createButtonText}
            >
              {loading
                ? "Creando..."
                : requiresPostApproval && !canPostWithoutApproval
                ? "Enviar para aprobación"
                : "Publicar"}
            </Button>
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
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: "70%",
  },
  forumInfo: {
    marginBottom: 20,
  },
  forumName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  approvalNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  approvalText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    color: "#1f2937",
  },
  contentInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    minHeight: 140,
    color: "#1f2937",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 6,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    marginBottom: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#ef4444",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  removeIcon: {
    margin: 0,
    padding: 0,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#dbeafe",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    backgroundColor: "#eff6ff",
  },
  addImageText: {
    fontSize: 15,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 8,
  },
  imageHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#1d4ed8",
    flex: 1,
    lineHeight: 20,
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
    backgroundColor: "#ffffff",
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
  createButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    borderWidth: 0,
  },
  createButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default CreatePostModal;
