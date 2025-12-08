import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  StatusBar,
} from "react-native";
import { IconButton } from "react-native-paper";
import CommentCard from "./CommentCard";
import { auth } from "../../config/firebase";
import { useComments } from "../../hooks/useComments";
import { useCommentActions } from "../../hooks/useCommentActions";

const CommentsModal = ({ visible, onClose, post, onCommentDeleted }) => {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);

  const currentUser = auth.currentUser;
  const { comments, loading, loadMoreComments, hasMore } = useComments(post.id);
  const { addComment, loading: addingComment } = useCommentActions();

  // Manejar altura del teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Desplazar al final cuando se agregan comentarios
  useEffect(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const result = await addComment(
        post.id,
        newComment.trim(),
        replyingTo?.id
      );

      if (result.success) {
        setNewComment("");
        setReplyingTo(null);
        Keyboard.dismiss();
      } else {
        Alert.alert("Error", "No se pudo agregar el comentario");
      }
    } catch (error) {
      console.error("Error al agregar comentario:", error);
      Alert.alert("Error", "Ocurrió un error al agregar el comentario");
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    // El foco se manejará automáticamente al renderizar
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    Keyboard.dismiss();
  };

  const renderComment = ({ item }) => (
    <CommentCard
      comment={item}
      postId={post.id}
      onReply={handleReply}
      onCommentDeleted={onCommentDeleted}
      isReply={item.parentCommentId !== null}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Comentarios</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <IconButton icon="close" size={24} iconColor="#374151" />
      </TouchableOpacity>
    </View>
  );

  const renderInput = () => (
    <View
      style={[
        styles.inputContainer,
        {
          marginBottom: keyboardHeight > 0 ? 0 : Platform.OS === "ios" ? 20 : 0,
        },
      ]}
    >
      {replyingTo && (
        <View style={styles.replyIndicator}>
          <View style={styles.replyIndicatorContent}>
            <Text style={styles.replyIndicatorText} numberOfLines={1}>
              Respondiendo a {replyingTo.authorName || "Usuario"}
            </Text>
            <TouchableOpacity onPress={handleCancelReply}>
              <IconButton icon="close" size={16} iconColor="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={
            replyingTo ? "Escribe tu respuesta..." : "Escribe un comentario..."
          }
          placeholderTextColor="#9ca3af"
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={1000}
          blurOnSubmit={false}
          onSubmitEditing={handleSubmitComment}
          editable={!!currentUser && !addingComment}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newComment.trim() || addingComment || !currentUser) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || addingComment || !currentUser}
        >
          {addingComment ? (
            <IconButton icon="loading" size={20} iconColor="#9ca3af" />
          ) : (
            <IconButton icon="send" size={20} iconColor="#3b82f6" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : StatusBar.currentHeight
        }
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.overlayTouchable} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalContainer,
              { maxHeight: Dimensions.get("window").height * 0.85 },
            ]}
          >
            {renderHeader()}

            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onEndReached={hasMore ? loadMoreComments : null}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                !loading && (
                  <View style={styles.emptyState}>
                    <IconButton
                      icon="comment-outline"
                      size={48}
                      iconColor="#d1d5db"
                    />
                    <Text style={styles.emptyStateText}>
                      Sé el primero en comentar
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                loading ? (
                  <View style={styles.loadingFooter}>
                    <IconButton icon="loading" size={24} iconColor="#3b82f6" />
                  </View>
                ) : null
              }
            />

            {renderInput()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Agrega esta importación al inicio si no la tienes
import { Dimensions } from "react-native";

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
    fontWeight: "500",
  },
  loadingFooter: {
    alignItems: "center",
    paddingVertical: 16,
  },
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
  },
  replyIndicator: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  replyIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyIndicatorText: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f9fafb",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    maxHeight: 100,
    minHeight: 40,
    paddingVertical: 8,
    textAlignVertical: "center",
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default CommentsModal;
