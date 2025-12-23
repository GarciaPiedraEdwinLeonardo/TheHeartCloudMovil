import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  Dimensions,
  Platform,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../../config/firebase";
import { useCommentActions } from "../../hooks/useCommentActions";
import { useUserPermissions } from "../../hooks/useUserPermissions";

const { width, height } = Dimensions.get("window");

const EditCommentModal = ({ visible, onClose, comment, onCommentUpdated }) => {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [inputHeight, setInputHeight] = useState(80);
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const scrollViewRef = useRef(null);

  const currentUser = auth.currentUser;
  const { editComment, loading, error, clearError } = useCommentActions();
  const { userData } = useUserPermissions();

  // Constantes de validación
  const MIN_LENGTH = 2;
  const MAX_LENGTH = 500;
  const CHAR_WARNING_THRESHOLD = 450;

  // Inicializar estado con datos del comentario
  useEffect(() => {
    if (visible && comment) {
      setContent(comment.content || "");
      setOriginalContent(comment.content || "");
      setCharCount(comment.content?.length || 0);
      setInputHeight(80);
      setShowHistory(false);
      clearError();

      // Cargar historial de ediciones
      if (comment.editHistory && Array.isArray(comment.editHistory)) {
        setEditHistory([...comment.editHistory].reverse()); // Orden inverso para mostrar más reciente primero
      } else {
        setEditHistory([]);
      }

      // Desplazar al final cuando el teclado aparezca
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [visible, comment]);

  // Manejar altura del teclado
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Validar contenido
  const validateContent = () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return "El contenido del comentario es obligatorio";
    }

    if (trimmedContent.length < MIN_LENGTH) {
      return `El comentario debe tener al menos ${MIN_LENGTH} caracteres`;
    }

    if (trimmedContent.length > MAX_LENGTH) {
      return `El comentario no puede tener más de ${MAX_LENGTH} caracteres`;
    }

    // Validación adicional: evitar comentarios con solo espacios o saltos de línea
    if (trimmedContent.replace(/\s/g, "").length === 0) {
      return "El comentario no puede contener solo espacios";
    }

    // Validación adicional: limitar saltos de línea excesivos
    const lineBreaks = (trimmedContent.match(/\n/g) || []).length;
    if (lineBreaks > 20) {
      return "El comentario tiene demasiados saltos de línea";
    }

    // Verificar si realmente hubo cambios
    if (trimmedContent === originalContent.trim()) {
      return "No hay cambios para guardar";
    }

    return null;
  };

  // Manejar cambio de contenido
  const handleContentChange = (text) => {
    if (text.length <= MAX_LENGTH) {
      setContent(text);
      setCharCount(text.length);
    }
  };

  // Ajustar altura del textarea dinámicamente
  const handleContentSizeChange = (event) => {
    const newHeight = Math.min(
      Math.max(event.nativeEvent.contentSize.height, 40),
      200
    );
    setInputHeight(newHeight);
  };

  // Manejar envío de la edición
  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert("Error", "Debes iniciar sesión para editar");
      return;
    }

    // Verificar que el usuario es el autor del comentario
    if (currentUser.uid !== comment.authorId) {
      Alert.alert(
        "Permiso denegado",
        "Solo el autor puede editar este comentario"
      );
      return;
    }

    const validationError = validateContent();
    if (validationError) {
      Alert.alert("Error de validación", validationError);
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const result = await editComment(comment.id, content.trim());

      if (result.success) {
        // Éxito: cerrar modal y notificar
        if (onCommentUpdated) {
          onCommentUpdated();
        }

        onClose();
      } else {
        Alert.alert(
          "Error",
          result.error || "No se pudo actualizar el comentario"
        );
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al actualizar el comentario");
      console.error("Error en handleSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    if (content.trim() !== originalContent.trim()) {
      Alert.alert(
        "Descartar cambios",
        "¿Estás seguro de que quieres descartar los cambios?",
        [
          { text: "Continuar editando", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => onClose(),
          },
        ]
      );
    } else {
      onClose();
    }
  };

  // Calcular si está cerca del límite
  const isNearLimit = charCount >= CHAR_WARNING_THRESHOLD;
  const remainingChars = MAX_LENGTH - charCount;
  const hasChanges = content.trim() !== originalContent.trim();
  const isValid =
    charCount >= MIN_LENGTH && charCount <= MAX_LENGTH && hasChanges;

  // Formatear fecha del historial
  const formatHistoryDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(timestamp).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha inválida";
    }
  };

  // Renderizar indicador de caracteres
  const renderCharIndicator = () => (
    <View style={styles.charIndicatorContainer}>
      <Text
        style={[
          styles.charCountText,
          isNearLimit && styles.charCountWarning,
          remainingChars === 0 && styles.charCountError,
        ]}
      >
        {charCount}/{MAX_LENGTH}
      </Text>
      {isNearLimit && remainingChars > 0 && (
        <Text style={styles.charWarningText}>
          ⚠️ Te quedan {remainingChars} caracteres
        </Text>
      )}
      {remainingChars === 0 && (
        <Text style={styles.charErrorText}>
          Has alcanzado el límite de caracteres
        </Text>
      )}
    </View>
  );

  // Renderizar botón de historial
  const renderHistoryButton = () => {
    if (editHistory.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => setShowHistory(!showHistory)}
        disabled={isSubmitting}
      >
        <IconButton
          icon={showHistory ? "history" : "history"}
          size={18}
          iconColor="#3b82f6"
        />
        <Text style={styles.historyButtonText}>
          {showHistory ? "Ocultar" : "Ver"} historial ({editHistory.length}{" "}
          {editHistory.length === 1 ? "edición" : "ediciones"})
        </Text>
      </TouchableOpacity>
    );
  };

  // Renderizar historial de ediciones
  const renderHistory = () => {
    if (!showHistory || editHistory.length === 0) return null;

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Historial de Ediciones</Text>
        <ScrollView
          style={styles.historyScrollView}
          showsVerticalScrollIndicator={false}
        >
          {editHistory.map((edit, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyItemHeader}>
                <Text style={styles.historyVersion}>
                  Versión {editHistory.length - index}
                </Text>
                <Text style={styles.historyDate}>
                  {formatHistoryDate(edit.editedAt)}
                </Text>
              </View>
              <View style={styles.historyContentContainer}>
                <Text style={styles.historyContent}>
                  {edit.previousContent}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renderizar información del comentario original
  const renderOriginalInfo = () => (
    <View style={styles.originalInfoContainer}>
      <Text style={styles.originalInfoTitle}>
        Editando comentario{" "}
        {comment?.createdAt
          ? `del ${formatHistoryDate(comment.createdAt)}`
          : ""}
      </Text>
      {!hasChanges && (
        <Text style={styles.noChangesText}>
          No se detectaron cambios en el comentario
        </Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
    >
      <View
        style={[
          styles.modalOverlay,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isSubmitting}
                style={styles.closeButton}
              >
                <IconButton
                  icon="close"
                  size={24}
                  iconColor="#6b7280"
                  disabled={isSubmitting}
                />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.title}>Editar Comentario</Text>
                <Text style={styles.subtitle}>
                  Actualiza el contenido de tu comentario
                </Text>
              </View>
            </View>
          </View>

          {/* Contenido desplazable */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Información del comentario original */}
            {renderOriginalInfo()}

            {/* Botón de historial */}
            {renderHistoryButton()}

            {/* Historial de ediciones */}
            {renderHistory()}

            {/* Área de texto del comentario */}
            <View style={styles.contentContainer}>
              <Text style={styles.contentLabel}>Tu comentario *</Text>

              <TextInput
                style={[styles.contentInput, { height: inputHeight }]}
                value={content}
                onChangeText={handleContentChange}
                onContentSizeChange={handleContentSizeChange}
                placeholder="Escribe tu comentario aquí..."
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
                maxLength={MAX_LENGTH}
                autoFocus={true}
              />

              {/* Indicador de caracteres */}
              {renderCharIndicator()}
            </View>

            {/* Espacio para el teclado */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValid || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size={20} color="#ffffff" />
              ) : (
                <>
                  <IconButton
                    icon="content-save"
                    size={20}
                    iconColor="#ffffff"
                  />
                  <Text style={styles.submitButtonText}>Guardar Cambios</Text>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  closeButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  scrollView: {
    maxHeight: "70%",
  },
  originalInfoContainer: {
    backgroundColor: "#f9fafb",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  originalInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  noChangesText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 4,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
    marginLeft: 8,
  },
  historyContainer: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 300,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  historyScrollView: {
    maxHeight: 250,
  },
  historyItem: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyVersion: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  historyContentContainer: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  historyContent: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    color: "#1f2937",
    textAlignVertical: "top",
    minHeight: 80,
    maxHeight: 200,
  },
  charIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  charCountWarning: {
    color: "#f59e0b",
  },
  charCountError: {
    color: "#ef4444",
  },
  charWarningText: {
    fontSize: 11,
    color: "#f59e0b",
    fontStyle: "italic",
  },
  charErrorText: {
    fontSize: 11,
    color: "#ef4444",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
    backgroundColor: "#ffffff",
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
  submitButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default EditCommentModal;
