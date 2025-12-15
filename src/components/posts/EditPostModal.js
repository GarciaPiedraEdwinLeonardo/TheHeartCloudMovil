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
  Dimensions,
} from "react-native";
import { IconButton, Button } from "react-native-paper";
import { usePostActions } from "../../hooks/usePostActions";
import * as ImagePicker from "expo-image-picker";
import { serverTimestamp } from "firebase/firestore";

const { width } = Dimensions.get("window");

// 🔥 CONSTANTES DE VALIDACIÓN 🔥
const VALIDATION = {
  TITLE: {
    MIN: 5,
    MAX: 200,
  },
  CONTENT: {
    MIN: 10,
    MAX: 5000,
  },
};

const EditPostModal = ({ visible, onClose, post, onPostUpdated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    content: "",
  });

  const { editPost, uploadImages } = usePostActions();

  // Inicializar con datos del post
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");

      // Manejar la imagen del post (solo UNA imagen permitida)
      const imagesArray = post.images || [];

      if (imagesArray.length > 0) {
        const img = imagesArray[0];

        if (typeof img === "object" && img.url) {
          setExistingImage(img);
        } else if (typeof img === "string") {
          setExistingImage({
            url: img,
            thumbnailUrl: img,
            storagePath: `posts/${post.id}/${Date.now()}`,
            filename: `image_${Date.now()}.jpg`,
            size: 0,
            dimensions: { width: 0, height: 0 },
            uploadedAt: new Date(),
          });
        }
      } else {
        setExistingImage(null);
      }

      setNewImage(null);
      setUploadProgress(0);
      setFieldErrors({ title: "", content: "" });
    }
  }, [post]);

  // 🔥 VALIDAR TÍTULO 🔥
  const validateTitle = (text) => {
    if (!text || text.trim().length === 0) {
      return "El título es requerido";
    }
    if (text.trim().length < VALIDATION.TITLE.MIN) {
      return `El título debe tener al menos ${VALIDATION.TITLE.MIN} caracteres`;
    }
    if (text.length > VALIDATION.TITLE.MAX) {
      return `El título no puede exceder ${VALIDATION.TITLE.MAX} caracteres`;
    }
    return "";
  };

  // 🔥 VALIDAR CONTENIDO 🔥
  const validateContent = (text) => {
    if (!text || text.trim().length === 0) {
      return "El contenido es requerido";
    }
    if (text.trim().length < VALIDATION.CONTENT.MIN) {
      return `El contenido debe tener al menos ${VALIDATION.CONTENT.MIN} caracteres`;
    }
    if (text.length > VALIDATION.CONTENT.MAX) {
      return `El contenido no puede exceder ${VALIDATION.CONTENT.MAX} caracteres`;
    }
    return "";
  };

  // 🔥 VERIFICAR SI EL FORMULARIO ES VÁLIDO 🔥
  const isFormValid = () => {
    const titleError = validateTitle(title);
    const contentError = validateContent(content);
    return !titleError && !contentError;
  };

  // 🔥 MANEJAR CAMBIO DE TÍTULO CON VALIDACIÓN 🔥
  const handleTitleChange = (text) => {
    const limitedText = text.slice(0, VALIDATION.TITLE.MAX);
    setTitle(limitedText);

    if (limitedText.length > 0) {
      const error = validateTitle(limitedText);
      setFieldErrors((prev) => ({ ...prev, title: error }));
    } else {
      setFieldErrors((prev) => ({ ...prev, title: "" }));
    }
  };

  // 🔥 MANEJAR CAMBIO DE CONTENIDO CON VALIDACIÓN 🔥
  const handleContentChange = (text) => {
    const limitedText = text.slice(0, VALIDATION.CONTENT.MAX);
    setContent(limitedText);

    if (limitedText.length > 0) {
      const error = validateContent(limitedText);
      setFieldErrors((prev) => ({ ...prev, content: error }));
    } else {
      setFieldErrors((prev) => ({ ...prev, content: "" }));
    }
  };

  // 🔥 OBTENER COLOR DEL CONTADOR DE CARACTERES 🔥
  const getCharCountColor = (length, max) => {
    const percentage = (length / max) * 100;
    if (percentage >= 95) return "#ef4444";
    if (percentage >= 80) return "#f59e0b";
    return "#9ca3af";
  };

  // Seleccionar imagen de la galería
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
        const selectedImage = result.assets[0].uri;

        Alert.alert(
          "Imagen seleccionada",
          "La imagen se cambiará al guardar la publicación",
          [{ text: "OK" }]
        );

        setNewImage(selectedImage);
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  // Tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permisos requeridos",
          "Se necesitan permisos para acceder a la cámara"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenImage = result.assets[0].uri;

        Alert.alert(
          "Foto tomada",
          "La foto se cambiará al guardar la publicación",
          [{ text: "OK" }]
        );

        setNewImage(takenImage);
      }
    } catch (error) {
      console.error("Error tomando foto:", error);
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  // Eliminar imagen existente
  const removeExistingImage = () => {
    Alert.alert(
      "Eliminar imagen",
      "¿Estás seguro de que quieres eliminar la imagen de esta publicación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => setExistingImage(null),
        },
      ]
    );
  };

  // Eliminar nueva imagen seleccionada
  const removeNewImage = () => {
    setNewImage(null);
  };

  // Subir imagen y guardar cambios
  const handleSave = async () => {
    // 🔥 VALIDACIÓN FINAL ANTES DE GUARDAR 🔥
    const titleError = validateTitle(title);
    const contentError = validateContent(content);

    if (titleError || contentError) {
      setFieldErrors({
        title: titleError,
        content: contentError,
      });
      Alert.alert("Error de validación", titleError || contentError);
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0.1);

      let finalImage = null;

      // Caso 1: Hay una nueva imagen para subir
      if (newImage) {
        setUploadProgress(0.3);

        // Obtener dimensiones de la nueva imagen
        let dimensions = { width: 0, height: 0 };
        try {
          dimensions = await new Promise((resolve) => {
            Image.getSize(
              newImage,
              (width, height) => resolve({ width, height }),
              () => resolve({ width: 0, height: 0 })
            );
          });
        } catch (dimError) {
          console.warn("Error obteniendo dimensiones:", dimError);
        }

        const uploadResult = await uploadImages([newImage], [dimensions]);

        if (uploadResult.success) {
          if (uploadResult.images && uploadResult.images.length > 0) {
            finalImage = uploadResult.images[0];
          } else if (uploadResult.urls && uploadResult.urls.length > 0) {
            const filename =
              newImage.split("/").pop() || `image_${Date.now()}.jpg`;
            finalImage = {
              url: uploadResult.urls[0],
              thumbnailUrl: uploadResult.urls[0],
              storagePath: `posts/${post.id}/${Date.now()}`,
              filename: filename,
              size: 0,
              dimensions: dimensions,
              uploadedAt: new Date(),
            };
          }
          setUploadProgress(0.6);
        } else {
          throw new Error(uploadResult.error || "Error subiendo la imagen");
        }
      }
      // Caso 2: Mantener la imagen existente
      else if (existingImage) {
        finalImage = existingImage;
        setUploadProgress(0.6);
      }

      const imagesArray = finalImage ? [finalImage] : [];

      const updates = {
        title: title.trim(),
        content: content.trim(),
        images: imagesArray,
        updatedAt: serverTimestamp(),
      };

      setUploadProgress(0.8);
      const result = await editPost(post.id, updates);

      if (result.success) {
        setUploadProgress(1);

        setTimeout(() => {
          Alert.alert("Éxito", "La publicación se actualizó correctamente", [
            {
              text: "OK",
              onPress: () => {
                if (onPostUpdated) {
                  onPostUpdated();
                }
                handleClose();
              },
            },
          ]);
        }, 500);
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
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  // Cerrar modal y resetear estado
  const handleClose = () => {
    if (loading) {
      Alert.alert(
        "Guardando cambios",
        "Espera a que termine de guardar antes de cerrar",
        [{ text: "OK" }]
      );
      return;
    }

    setTitle("");
    setContent("");
    setNewImage(null);
    setExistingImage(null);
    setUploadProgress(0);
    setFieldErrors({ title: "", content: "" });
    onClose();
  };

  // Renderizar vista previa de imagen
  const renderImagePreview = () => {
    if (newImage) {
      return (
        <View style={styles.imagePreviewContainer}>
          <Text style={styles.imageLabel}>Nueva imagen seleccionada</Text>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: newImage }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeNewImage}
              disabled={loading}
            >
              <IconButton
                icon="close"
                size={16}
                iconColor="#ffffff"
                style={styles.removeIcon}
              />
            </TouchableOpacity>
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>NUEVA</Text>
            </View>
          </View>
          <Text style={styles.imageHint}>
            Esta imagen reemplazará a la actual al guardar
          </Text>
        </View>
      );
    }

    if (existingImage) {
      const imageUrl =
        typeof existingImage === "string" ? existingImage : existingImage.url;

      return (
        <View style={styles.imagePreviewContainer}>
          <Text style={styles.imageLabel}>Imagen actual</Text>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeExistingImage}
              disabled={loading}
            >
              <IconButton
                icon="close"
                size={16}
                iconColor="#ffffff"
                style={styles.removeIcon}
              />
            </TouchableOpacity>
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>ACTUAL</Text>
            </View>
          </View>
          <Text style={styles.imageHint}>
            Toca la X para eliminar esta imagen
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.imagePreviewContainer}>
        <Text style={styles.imageLabel}>Imagen de la publicación</Text>
        <View style={styles.noImageContainer}>
          <IconButton icon="image-outline" size={40} iconColor="#9ca3af" />
          <Text style={styles.noImageText}>Sin imagen</Text>
          <Text style={styles.noImageSubtext}>
            Puedes agregar una imagen opcional
          </Text>
        </View>
      </View>
    );
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
            <Text style={styles.title}>Editar Publicación</Text>
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
            keyboardShouldPersistTaps="handled"
          >
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
                    : "Guardando cambios..."}
                </Text>
              </View>
            )}

            {/* Título */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={[
                  styles.titleInput,
                  fieldErrors.title && styles.inputError,
                ]}
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Título de la publicación"
                placeholderTextColor="#9ca3af"
                maxLength={VALIDATION.TITLE.MAX}
                editable={!loading}
              />
              <View style={styles.inputFooter}>
                {fieldErrors.title ? (
                  <Text style={styles.errorText}>{fieldErrors.title}</Text>
                ) : (
                  <Text style={styles.hintText}>
                    Mínimo {VALIDATION.TITLE.MIN} caracteres
                  </Text>
                )}
                <Text
                  style={[
                    styles.charCount,
                    {
                      color: getCharCountColor(
                        title.length,
                        VALIDATION.TITLE.MAX
                      ),
                    },
                  ]}
                >
                  {title.length}/{VALIDATION.TITLE.MAX}
                </Text>
              </View>
            </View>

            {/* Contenido */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contenido *</Text>
              <TextInput
                style={[
                  styles.contentInput,
                  fieldErrors.content && styles.inputError,
                ]}
                value={content}
                onChangeText={handleContentChange}
                placeholder="Escribe el contenido de tu publicación..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={VALIDATION.CONTENT.MAX}
                editable={!loading}
              />
              <View style={styles.inputFooter}>
                {fieldErrors.content ? (
                  <Text style={styles.errorText}>{fieldErrors.content}</Text>
                ) : (
                  <Text style={styles.hintText}>
                    Mínimo {VALIDATION.CONTENT.MIN} caracteres
                  </Text>
                )}
                <Text
                  style={[
                    styles.charCount,
                    {
                      color: getCharCountColor(
                        content.length,
                        VALIDATION.CONTENT.MAX
                      ),
                    },
                  ]}
                >
                  {content.length}/{VALIDATION.CONTENT.MAX}
                </Text>
              </View>
            </View>

            {/* Vista previa de imagen */}
            {renderImagePreview()}

            {/* Botones para agregar imagen */}
            <View style={styles.imageButtonsContainer}>
              <Text style={styles.label}>Agregar o cambiar imagen</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.imageButton, styles.galleryButton]}
                  onPress={pickImage}
                  disabled={loading}
                >
                  <IconButton icon="image" size={24} iconColor="#3b82f6" />
                  <Text
                    style={[styles.imageButtonText, styles.galleryButtonText]}
                  >
                    Galería
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageButton, styles.cameraButton]}
                  onPress={takePhoto}
                  disabled={loading}
                >
                  <IconButton icon="camera" size={24} iconColor="#10b981" />
                  <Text
                    style={[styles.imageButtonText, styles.cameraButtonText]}
                  >
                    Cámara
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Información de imagen */}
            <View style={styles.limitsContainer}>
              <Text style={styles.limitsTitle}>Información importante:</Text>
              <Text style={styles.limitsText}>
                • Solo se permite UNA imagen por publicación
              </Text>
              <Text style={styles.limitsText}>• La imagen es opcional</Text>
              <Text style={styles.limitsText}>• Tamaño máximo: 5MB</Text>
              <Text style={styles.limitsText}>
                • Formatos: JPEG, PNG, GIF, WebP
              </Text>
              <Text style={styles.limitsText}>• Recomendado: Relación 4:3</Text>
            </View>
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
              onPress={handleSave}
              style={[
                styles.saveButton,
                !isFormValid() && styles.saveButtonDisabled,
              ]}
              disabled={loading || !isFormValid()}
              loading={loading}
              labelStyle={styles.saveButtonText}
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
    maxHeight: "80%",
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
    marginBottom: 24,
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
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 1.5,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
  },
  charCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  imagePreviewContainer: {
    marginBottom: 24,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  imageWrapper: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  removeIcon: {
    margin: 0,
    padding: 0,
  },
  imageBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageBadgeText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  imageHint: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
  },
  noImageContainer: {
    width: "100%",
    height: 150,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  noImageText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 8,
  },
  noImageSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  imageButtonsContainer: {
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  galleryButton: {
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
  },
  cameraButton: {
    borderColor: "#d1fae5",
    backgroundColor: "#ecfdf5",
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  galleryButtonText: {
    color: "#3b82f6",
  },
  cameraButtonText: {
    color: "#10b981",
  },
  limitsContainer: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  limitsText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    lineHeight: 18,
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
  saveButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    borderWidth: 0,
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default EditPostModal;
