import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { IconButton, Button, ActivityIndicator } from "react-native-paper";
import { usePostActions } from "../../hooks/usePostActions";
import * as ImagePicker from "expo-image-picker";

const EditPostModal = ({ visible, onClose, post, onPostUpdated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const { editPost, uploadImages } = usePostActions();

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setExistingImages(post.images || []);
    }
  }, [post]);

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
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error("Error seleccionando imágenes:", error);
      Alert.alert("Error", "No se pudieron seleccionar las imágenes");
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const removeExistingImage = (index) => {
    const newImages = [...existingImages];
    newImages.splice(index, 1);
    setExistingImages(newImages);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "El título es requerido");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Error", "El contenido es requerido");
      return;
    }

    try {
      setLoading(true);

      let uploadedImageUrls = [];

      // Subir nuevas imágenes
      if (images.length > 0) {
        const uploadResult = await uploadImages(images);
        if (uploadResult.success) {
          uploadedImageUrls = uploadResult.urls;
        } else {
          throw new Error(uploadResult.error);
        }
      }

      // Combinar imágenes existentes (que no se eliminaron) con las nuevas
      const allImages = [...existingImages, ...uploadedImageUrls];

      const updates = {
        title: title.trim(),
        content: content.trim(),
        images: allImages,
        lastUpdated: new Date(),
      };

      const result = await editPost(post.id, updates);

      if (result.success) {
        Alert.alert("Éxito", "La publicación se actualizó correctamente");
        if (onPostUpdated) {
          onPostUpdated();
        }
        handleClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error actualizando post:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudo actualizar la publicación"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setExistingImages([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Editar Publicación</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
              disabled={loading}
            />
          </View>

          <ScrollView style={styles.content}>
            {/* Título */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Título de la publicación"
                maxLength={200}
                editable={!loading}
              />
              <Text style={styles.charCount}>{title.length}/200</Text>
            </View>

            {/* Contenido */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contenido</Text>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="Escribe el contenido de tu publicación..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.charCount}>{content.length}/5000</Text>
            </View>

            {/* Imágenes existentes */}
            {existingImages.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={styles.label}>Imágenes existentes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imagesRow}>
                    {existingImages.map((image, index) => (
                      <View
                        key={`existing-${index}`}
                        style={styles.imageWrapper}
                      >
                        <Image
                          source={{ uri: image }}
                          style={styles.thumbnail}
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeExistingImage(index)}
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
                    ))}
                  </View>
                </ScrollView>
                <Text style={styles.imageHint}>
                  Toca la X para eliminar imágenes
                </Text>
              </View>
            )}

            {/* Nuevas imágenes */}
            {images.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={styles.label}>Nuevas imágenes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imagesRow}>
                    {images.map((image, index) => (
                      <View key={`new-${index}`} style={styles.imageWrapper}>
                        <Image
                          source={{ uri: image }}
                          style={styles.thumbnail}
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
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
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Botón para agregar imágenes */}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={pickImage}
              disabled={loading}
            >
              <IconButton icon="image-plus" size={24} iconColor="#3b82f6" />
              <Text style={styles.addImageText}>Agregar imágenes</Text>
            </TouchableOpacity>

            <Text style={styles.imageHint}>
              Puedes agregar hasta 10 imágenes (máximo 5MB cada una)
            </Text>
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.saveButton}
              disabled={loading || !title.trim() || !content.trim()}
              loading={loading}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  contentInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  imagesRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  imageWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  removeIcon: {
    margin: 0,
    padding: 0,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  addImageText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 8,
  },
  imageHint: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: "#d1d5db",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
  },
});

export default EditPostModal;
