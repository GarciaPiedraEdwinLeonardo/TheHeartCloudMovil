import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../../config/firebase";
import CommentList from "./CommentList";
import { useComments } from "../../hooks/useComments";
import { useUserPermissions } from "../../hooks/useUserPermissions";
import { useCommentActions } from "../../hooks/useCommentActions";

const { height, width } = Dimensions.get("window");

const CommentsModal = ({ visible, onClose, post, onCommentDeleted }) => {
  const [replyToComment, setReplyToComment] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const modalContentRef = useRef(null);
  const modalHeight = useRef(new Animated.Value(0)).current;

  const currentUser = auth.currentUser;
  const { comments, loading, error } = useComments(post?.id);
  const { permissions } = useUserPermissions();
  const { createComment } = useCommentActions();

  // Animación de entrada del modal
  useEffect(() => {
    if (visible) {
      Animated.timing(modalHeight, {
        toValue: height * 0.85,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Enfocar el input después de un breve delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 350);
    } else {
      Animated.timing(modalHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  // Efecto para manejar el teclado
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        // Desplazar un poco hacia arriba cuando aparece el teclado
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Manejar clic fuera del modal
  const handleOverlayPress = (event) => {
    // Solo cerrar si se hizo clic en el overlay (no en el contenido del modal)
    if (modalContentRef.current) {
      modalContentRef.current.measure((fx, fy, width, height, px, py) => {
        const tapX = event.nativeEvent.pageX;
        const tapY = event.nativeEvent.pageY;

        // Verificar si el tap está fuera del contenido del modal
        if (tapY < py || tapY > py + height || tapX < px || tapX > px + width) {
          onClose();
        }
      });
    }
  };

  // Manejar envío de comentario
  const handleSubmitComment = async () => {
    if (!commentInput.trim() || isSubmitting || !permissions.canComment) {
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "Debes iniciar sesión para comentar");
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData = {
        content: commentInput.trim(),
        postId: post?.id,
        parentCommentId: replyToComment?.id || null,
      };

      const result = await createComment(commentData);

      if (result.success) {
        // Éxito: limpiar input
        setCommentInput("");
        setReplyToComment(null);

        // Ocultar teclado
        Keyboard.dismiss();

        // Desplazar al final suavemente
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 300);
      } else {
        Alert.alert("Error", result.error || "No se pudo enviar el comentario");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al enviar el comentario");
      console.error("Error en handleSubmitComment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar clic en "Responder"
  const handleReplyToComment = (comment) => {
    setReplyToComment(comment);
    // Enfocar el input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Cancelar respuesta
  const handleCancelReply = () => {
    setReplyToComment(null);
  };

  // Renderizar header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <IconButton icon="close" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comentarios</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.commentCount}>
          {comments.length || 0}{" "}
          {comments.length === 1 ? "comentario" : "comentarios"}
        </Text>
      </View>
    </View>
  );

  // Renderizar indicador de respuesta
  const renderReplyIndicator = () => {
    if (!replyToComment) return null;

    return (
      <View style={styles.replyIndicator}>
        <View style={styles.replyIndicatorContent}>
          <IconButton icon="reply" size={16} iconColor="#3b82f6" />
          <Text style={styles.replyIndicatorText} numberOfLines={1}>
            Respondiendo a: {replyToComment.authorName || "usuario"}
          </Text>
          <TouchableOpacity onPress={handleCancelReply}>
            <IconButton icon="close" size={16} iconColor="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Renderizar input para comentar
  const renderCommentInput = () => {
    if (!currentUser) {
      return (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            Inicia sesión para comentar
          </Text>
        </View>
      );
    }

    if (!permissions.canComment) {
      return (
        <View style={styles.unverifiedPrompt}>
          <IconButton icon="alert-circle" size={20} iconColor="#f59e0b" />
          <Text style={styles.unverifiedText}>
            Solo usuarios verificados pueden comentar
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        {renderReplyIndicator()}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            placeholder={
              replyToComment
                ? `Escribe tu respuesta a ${
                    replyToComment.authorName || "este comentario"
                  }...`
                : "Escribe un comentario..."
            }
            placeholderTextColor="#9ca3af"
            value={commentInput}
            onChangeText={setCommentInput}
            multiline
            maxLength={500}
            editable={!isSubmitting}
            blurOnSubmit={false}
            onSubmitEditing={() => {
              // Enviar al presionar "enter" en iOS/Android
              if (commentInput.trim() && !isSubmitting) {
                handleSubmitComment();
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentInput.trim() || isSubmitting) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentInput.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size={20} color="#ffffff" />
            ) : (
              <IconButton icon="send" size={20} iconColor="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Renderizar contenido de comentarios
  const renderCommentsContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando comentarios...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <IconButton icon="alert-circle" size={48} iconColor="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (comments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <IconButton icon="comment-outline" size={64} iconColor="#cbd5e1" />
          <Text style={styles.emptyTitle}>No hay comentarios aún</Text>
          <Text style={styles.emptyText}>
            Sé el primero en comentar esta publicación
          </Text>
        </View>
      );
    }

    return (
      <CommentList
        comments={comments}
        postId={post?.id}
        onReply={handleReplyToComment}
        onCommentDeleted={onCommentDeleted}
        scrollViewRef={scrollViewRef}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.safeArea}>
        {/* Overlay que NO cierra al tocar el teclado */}
        <TouchableWithoutFeedback
          onPress={handleOverlayPress}
          accessible={false}
        >
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Contenedor del modal animado */}
        <Animated.View
          ref={modalContentRef}
          style={[styles.modalContent, { height: modalHeight }]}
        >
          {/* Indicador de arrastre */}
          <View style={styles.dragIndicator} />

          {/* Header */}
          {renderHeader()}

          {/* Lista de comentarios */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.commentsScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {renderCommentsContent()}
              {/* Espacio para que el input no tape los comentarios */}
              <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Input para comentar - FIJO en la parte inferior */}
            <View style={styles.fixedInputContainer}>
              {renderCommentInput()}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  closeButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  headerRight: {
    marginLeft: 12,
  },
  commentCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  commentsScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espacio para el input
  },
  fixedInputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    backgroundColor: "#ffffff",
  },
  replyIndicator: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  replyIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyIndicatorText: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "500",
    flex: 1,
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    maxHeight: 100,
    paddingVertical: 8,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  loginPrompt: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  loginPromptText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  unverifiedPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  unverifiedText: {
    fontSize: 13,
    color: "#92400e",
    fontWeight: "500",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  bottomSpacing: {
    height: 80, // Espacio para que el input no tape el último comentario
  },
});

export default CommentsModal;
