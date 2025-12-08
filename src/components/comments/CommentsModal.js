import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Image,
  Keyboard,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../../config/firebase";
import CommentList from "./CommentList";
import CreateCommentModal from "./CreateCommentModal";
import { useComments } from "../../hooks/useComments";
import { useUserPermissions } from "../../hooks/useUserPermissions";

const { height, width } = Dimensions.get("window");

const CommentsModal = ({
  visible,
  onClose,
  post,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const [showCreateCommentModal, setShowCreateCommentModal] = useState(false);
  const [replyToComment, setReplyToComment] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);
  const modalHeight = useRef(new Animated.Value(0)).current;

  const currentUser = auth.currentUser;
  const { comments, loading, error } = useComments(post?.id);
  const { permissions, userData, checkCommentPermissions } =
    useUserPermissions();

  // Animación de entrada del modal
  useEffect(() => {
    if (visible) {
      Animated.timing(modalHeight, {
        toValue: height * 0.85,
        duration: 300,
        useNativeDriver: false,
      }).start();
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

  // Función para obtener el nombre del autor del post
  const getPostAuthorName = () => {
    if (post?.authorName) return post.authorName;
    if (post?.authorData?.name) {
      const name = post.authorData.name;
      return `${name.name || ""} ${name.apellidopat || ""}`.trim();
    }
    return post?.authorEmail || "Usuario";
  };

  // Función para formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString("es-ES");
      }
      return new Date(timestamp).toLocaleDateString("es-ES");
    } catch {
      return "";
    }
  };

  // Manejar envío de comentario desde input rápido
  const handleSubmitComment = async () => {
    if (!commentInput.trim() || isSubmitting || !permissions.canComment) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Aquí se integrará con useCommentActions.createComment
      // Por ahora solo mostramos el modal completo
      setShowCreateCommentModal(true);
      setCommentInput("");
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar clic en "Responder" desde un comentario
  const handleReplyToComment = (comment) => {
    setReplyToComment(comment);
    setShowCreateCommentModal(true);
  };

  // Manejar creación exitosa de comentario
  const handleCommentCreated = () => {
    setShowCreateCommentModal(false);
    setReplyToComment(null);
    if (onCommentAdded) {
      onCommentAdded();
    }
    // Desplazar al final de la lista
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 500);
  };

  // Renderizar header del modal
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

  // Renderizar información del post
  const renderPostInfo = () => (
    <View style={styles.postInfoContainer}>
      <View style={styles.postAuthorRow}>
        {post?.authorPhoto ? (
          <Image
            source={{ uri: post.authorPhoto }}
            style={styles.postAuthorAvatar}
          />
        ) : (
          <View style={[styles.postAuthorAvatar, styles.avatarPlaceholder]}>
            <IconButton icon="account" size={16} iconColor="#fff" />
          </View>
        )}
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{getPostAuthorName()}</Text>
          {post?.authorSpecialty && (
            <Text style={styles.postAuthorSpecialty}>
              {post.authorSpecialty}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.postTitle} numberOfLines={2}>
        {post?.title}
      </Text>

      <View style={styles.postMeta}>
        <IconButton icon="calendar" size={14} iconColor="#6b7280" />
        <Text style={styles.postDate}>{formatDate(post?.createdAt)}</Text>
      </View>
    </View>
  );

  // Renderizar input rápido para comentar (solo para usuarios verificados)
  const renderQuickCommentInput = () => {
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
      <View style={styles.quickInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Escribe un comentario..."
          placeholderTextColor="#9ca3af"
          value={commentInput}
          onChangeText={setCommentInput}
          multiline
          maxLength={500}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!commentInput.trim() || isSubmitting) && styles.sendButtonDisabled,
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
          <TouchableOpacity style={styles.retryButton} onPress={() => {}}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
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
        userData={userData}
        onReply={handleReplyToComment}
        onCommentCreated={handleCommentCreated}
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
      <SafeAreaView style={styles.safeArea}>
        {/* Overlay para cerrar al tocar fuera */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Contenedor del modal animado */}
        <Animated.View
          style={[
            styles.modalContent,
            { height: modalHeight },
            { marginBottom: keyboardHeight > 0 ? 0 : -20 },
          ]}
        >
          {/* Indicador de arrastre */}
          <View style={styles.dragIndicator} />

          {/* Header */}
          {renderHeader()}

          {/* Información del post */}
          {renderPostInfo()}

          {/* Separador */}
          <View style={styles.separator} />

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
            >
              {renderCommentsContent()}
            </ScrollView>

            {/* Input rápido para comentar (siempre visible) */}
            <View style={styles.fixedInputContainer}>
              {renderQuickCommentInput()}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>

      {/* Modal para crear comentario/responder (con más opciones) */}
      <CreateCommentModal
        visible={showCreateCommentModal}
        onClose={() => {
          setShowCreateCommentModal(false);
          setReplyToComment(null);
        }}
        postId={post?.id}
        postTitle={post?.title}
        parentCommentId={replyToComment?.id}
        parentCommentAuthor={replyToComment?.authorName}
        onCommentCreated={handleCommentCreated}
      />
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
  postInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  postAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  postAuthorSpecialty: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  postTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  postDate: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: -8,
  },
  separator: {
    height: 8,
    backgroundColor: "#f9fafb",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  commentsScrollView: {
    flex: 1,
  },
  fixedInputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickInputContainer: {
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
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
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
});

export default CommentsModal;
