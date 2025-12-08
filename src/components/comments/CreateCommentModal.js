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

const CreateCommentModal = ({
  visible,
  onClose,
  postId,
  postTitle,
  parentCommentId = null,
  parentCommentAuthor = null,
  onCommentCreated,
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [inputHeight, setInputHeight] = useState(80);
  const scrollViewRef = useRef(null);

  const currentUser = auth.currentUser;
  const { createComment, loading, error, clearError } = useCommentActions();
  const { permissions, userData } = useUserPermissions();

  // Constantes de validación
  const MIN_LENGTH = 2;
  const MAX_LENGTH = 500;
  const CHAR_WARNING_THRESHOLD = 450;

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (visible) {
      setContent("");
      setCharCount(0);
      setInputHeight(80);
      clearError();

      // Desplazar al final cuando el teclado aparezca
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [visible]);

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

  // Manejar envío del comentario
  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert("Error", "Debes iniciar sesión para comentar");
      return;
    }

    if (!permissions.canComment) {
      Alert.alert(
        "Permiso denegado",
        "Solo usuarios verificados pueden comentar"
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
      const commentData = {
        content: content.trim(),
        postId: postId,
        parentCommentId: parentCommentId,
      };

      const result = await createComment(commentData);

      if (result.success) {
        // Éxito: cerrar modal y limpiar
        setContent("");
        setCharCount(0);

        if (onCommentCreated) {
          onCommentCreated();
        }

        onClose();
      } else {
        Alert.alert("Error", result.error || "No se pudo crear el comentario");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al crear el comentario");
      console.error("Error en handleSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular si está cerca del límite
  const isNearLimit = charCount >= CHAR_WARNING_THRESHOLD;
  const remainingChars = MAX_LENGTH - charCount;
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  // Obtener título del modal
  const getModalTitle = () => {
    if (parentCommentId) {
      return `Responder a ${parentCommentAuthor || "usuario"}`;
    }
    return "Nuevo comentario";
  };

  // Obtener subtítulo del modal
  const getModalSubtitle = () => {
    if (parentCommentId) {
      return "Escribe tu respuesta";
    }
    return postTitle ? `En: ${postTitle}` : "Escribe tu comentario";
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

  // Renderizar información del post/comentario padre
  const renderContextInfo = () => {
    if (parentCommentId) {
      return (
        <View style={styles.contextContainer}>
          <View style={styles.contextHeader}>
            <IconButton icon="reply" size={16} iconColor="#3b82f6" />
            <Text style={styles.contextTitle}>
              Respondiendo a {parentCommentAuthor || "un comentario"}
            </Text>
          </View>
          <View style={styles.contextNote}>
            <Text style={styles.contextNoteText}>
              Tu respuesta se agregará como un hilo bajo este comentario
            </Text>
          </View>
        </View>
      );
    }

    if (postTitle) {
      return (
        <View style={styles.contextContainer}>
          <View style={styles.contextHeader}>
            <IconButton icon="comment" size={16} iconColor="#3b82f6" />
            <Text style={styles.contextTitle}>Comentando en: {postTitle}</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // Renderizar información para usuarios no verificados
  const renderUnverifiedWarning = () => {
    if (currentUser && !permissions.canComment) {
      return (
        <View style={styles.warningContainer}>
          <View style={styles.warningHeader}>
            <IconButton icon="alert-circle" size={20} iconColor="#f59e0b" />
            <Text style={styles.warningTitle}>Permiso requerido</Text>
          </View>
          <Text style={styles.warningText}>
            Solo usuarios verificados (médicos, moderadores, administradores)
            pueden comentar.
          </Text>
          <Text style={styles.warningSubtext}>
            Por favor, verifica tu cuenta en la versión web para habilitar esta
            función.
          </Text>
        </View>
      );
    }
    return null;
  };

  // Renderizar sugerencias de formato
  const renderFormattingTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.tipsTitle}>Sugerencias:</Text>
      <View style={styles.tipsList}>
        <View style={styles.tipItem}>
          <IconButton icon="check-circle" size={12} iconColor="#10b981" />
          <Text style={styles.tipText}>
            Mínimo {MIN_LENGTH} caracteres, máximo {MAX_LENGTH}
          </Text>
        </View>
        <View style={styles.tipItem}>
          <IconButton icon="check-circle" size={12} iconColor="#10b981" />
          <Text style={styles.tipText}>Sé respetuoso y profesional</Text>
        </View>
        <View style={styles.tipItem}>
          <IconButton icon="check-circle" size={12} iconColor="#10b981" />
          <Text style={styles.tipText}>Mantén el enfoque médico</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
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
                onPress={onClose}
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
                <Text style={styles.title}>{getModalTitle()}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {getModalSubtitle()}
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
            {/* Información de contexto */}
            {renderContextInfo()}

            {/* Advertencia para usuarios no verificados */}
            {renderUnverifiedWarning()}

            {/* Área de texto del comentario */}
            <View style={styles.contentContainer}>
              <Text style={styles.contentLabel}>
                Tu comentario {parentCommentId ? "(respuesta)" : ""} *
              </Text>

              <TextInput
                style={[
                  styles.contentInput,
                  { height: inputHeight },
                  (!currentUser || !permissions.canComment) &&
                    styles.disabledInput,
                ]}
                value={content}
                onChangeText={handleContentChange}
                onContentSizeChange={handleContentSizeChange}
                placeholder={
                  !currentUser
                    ? "Inicia sesión para comentar..."
                    : !permissions.canComment
                    ? "Solo usuarios verificados pueden comentar"
                    : parentCommentId
                    ? "Escribe tu respuesta aquí..."
                    : "Escribe tu comentario aquí..."
                }
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                editable={
                  currentUser && permissions.canComment && !isSubmitting
                }
                maxLength={MAX_LENGTH}
                autoFocus={true}
              />

              {/* Indicador de caracteres */}
              {renderCharIndicator()}
            </View>

            {/* Sugerencias de formato */}
            {renderFormattingTips()}

            {/* Espacio para el teclado */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValid ||
                  isSubmitting ||
                  !currentUser ||
                  !permissions.canComment) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                !isValid ||
                isSubmitting ||
                !currentUser ||
                !permissions.canComment
              }
            >
              {isSubmitting ? (
                <ActivityIndicator size={20} color="#ffffff" />
              ) : (
                <>
                  <IconButton
                    icon={parentCommentId ? "reply" : "send"}
                    size={20}
                    iconColor="#ffffff"
                  />
                  <Text style={styles.submitButtonText}>
                    {parentCommentId ? "Responder" : "Publicar"}
                  </Text>
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
  contextContainer: {
    backgroundColor: "#f0f9ff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369a1",
    marginLeft: 8,
  },
  contextNote: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  contextNoteText: {
    fontSize: 13,
    color: "#0c4a6e",
    fontStyle: "italic",
  },
  warningContainer: {
    backgroundColor: "#fef3c7",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
    marginLeft: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 12,
    color: "#92400e",
    fontStyle: "italic",
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
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
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
  tipsContainer: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  tipsList: {
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  tipText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
    flex: 1,
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

export default CreateCommentModal;
