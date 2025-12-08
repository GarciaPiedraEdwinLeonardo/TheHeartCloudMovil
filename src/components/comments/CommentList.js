import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { IconButton } from "react-native-paper";
import CommentCard from "./CommentCard";
import { useUserPermissions } from "../../hooks/useUserPermissions";

const CommentList = ({
  comments,
  postId,
  userData,
  onReply,
  onCommentCreated,
  onCommentDeleted,
  scrollViewRef,
}) => {
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [showAllReplies, setShowAllReplies] = useState(new Set());
  const [loadingComments, setLoadingComments] = useState({});
  const { checkCommentPermissions } = useUserPermissions();

  // Organizar comentarios en estructura jerárquica
  const organizeComments = (comments) => {
    const commentMap = new Map();
    const rootComments = [];

    // Primero, crear mapa de todos los comentarios
    comments.forEach((comment) => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
        replyCount: 0,
        depth: 0,
      });
    });

    // Luego, construir la jerarquía
    comments.forEach((comment) => {
      const commentNode = commentMap.get(comment.id);

      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(commentNode);
          parent.replyCount = (parent.replyCount || 0) + 1;
          commentNode.depth = parent.depth + 1;
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  };

  const organizedComments = organizeComments(comments);

  // Toggle para expandir/colapsar hilos
  const toggleThread = (commentId) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
        // Colapsar todos los hilos hijos
        collapseAllChildThreads(commentId, newSet);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Función recursiva para colapsar hilos hijos
  const collapseAllChildThreads = (commentId, set) => {
    const findComment = (comments, targetId) => {
      for (const comment of comments) {
        if (comment.id === targetId) return comment;
        if (comment.replies.length > 0) {
          const found = findComment(comment.replies, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const comment = findComment(organizedComments, commentId);
    if (comment && comment.replies) {
      comment.replies.forEach((reply) => {
        set.delete(reply.id);
        collapseAllChildThreads(reply.id, set);
      });
    }
  };

  // Toggle para mostrar todas las respuestas
  const toggleShowAllReplies = (commentId) => {
    setShowAllReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Función recursiva para renderizar comentarios con sus respuestas
  const renderCommentWithReplies = (
    comment,
    depth = 0,
    parentExpanded = true
  ) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isThreadExpanded = expandedThreads.has(comment.id);
    const showAll = showAllReplies.has(comment.id);

    // Solo renderizar si el padre está expandido (para hilos anidados)
    if (depth > 0 && !parentExpanded) {
      return null;
    }

    // Calcular margen izquierdo basado en la profundidad (máximo 4 niveles)
    const maxDepth = 4;
    const effectiveDepth = Math.min(depth, maxDepth);
    const marginLeft = effectiveDepth * 16; // 16px por nivel

    // Para respuestas anidadas, mostrar máximo 2 inicialmente
    const visibleReplies = showAll
      ? comment.replies
      : comment.replies.slice(0, 2);
    const hasHiddenReplies = comment.replies.length > 2 && !showAll;

    // Función para manejar respuesta a un comentario
    const handleReply = () => {
      if (onReply) {
        onReply(comment);
      }
    };

    // Función para manejar eliminación de comentario
    const handleCommentDeleted = (deletionType) => {
      if (onCommentDeleted) {
        onCommentDeleted(comment.id, deletionType);
      }
    };

    return (
      <View key={comment.id} style={[styles.commentContainer, { marginLeft }]}>
        {/* Línea vertical para hilos anidados */}
        {depth > 0 && <View style={styles.threadLine} />}

        {/* Comentario principal */}
        <CommentCard
          comment={comment}
          postId={postId}
          userData={userData}
          onReply={handleReply}
          onCommentDeleted={handleCommentDeleted}
          onCommentCreated={onCommentCreated}
          isReply={depth > 0}
        />

        {/* Controles de hilo - mostrar para cualquier comentario con respuestas */}
        {hasReplies && (
          <View style={styles.threadControls}>
            <TouchableOpacity
              style={styles.threadToggleButton}
              onPress={() => toggleThread(comment.id)}
            >
              <View style={styles.threadToggleContent}>
                <IconButton
                  icon={isThreadExpanded ? "chevron-down" : "chevron-right"}
                  size={16}
                  iconColor="#3b82f6"
                />
                <Text style={styles.threadToggleText}>
                  {isThreadExpanded ? "Ocultar" : "Ver"} {comment.replyCount}{" "}
                  {comment.replyCount === 1 ? "respuesta" : "respuestas"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Indicador visual de que es un hilo anidado */}
            {depth > 0 && (
              <View style={styles.nestedIndicator}>
                <IconButton
                  icon="reply"
                  size={12}
                  iconColor="#9ca3af"
                  style={styles.replyIcon}
                />
                <Text style={styles.nestedText}>Hilo anidado</Text>
              </View>
            )}
          </View>
        )}

        {/* Renderizar respuestas VISIBLES si el hilo está expandido */}
        {hasReplies && isThreadExpanded && (
          <View style={styles.repliesContainer}>
            {visibleReplies.map((reply) =>
              renderCommentWithReplies(reply, depth + 1, isThreadExpanded)
            )}

            {/* Botón para mostrar más respuestas si hay más de 2 */}
            {hasHiddenReplies && (
              <View style={styles.moreRepliesContainer}>
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => toggleShowAllReplies(comment.id)}
                >
                  <IconButton
                    icon="chevron-down"
                    size={16}
                    iconColor="#3b82f6"
                  />
                  <Text style={styles.showMoreText}>
                    Ver {comment.replies.length - 2} respuestas más
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botón para mostrar menos si estamos mostrando todas */}
            {showAll && comment.replies.length > 2 && (
              <View style={styles.moreRepliesContainer}>
                <TouchableOpacity
                  style={styles.showLessButton}
                  onPress={() => toggleShowAllReplies(comment.id)}
                >
                  <IconButton icon="chevron-up" size={16} iconColor="#6b7280" />
                  <Text style={styles.showLessText}>Mostrar menos</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Estado de carga inicial
  if (!comments || comments.length === 0) {
    return (
      <View style={styles.emptyState}>
        <IconButton icon="comment-outline" size={48} iconColor="#cbd5e1" />
        <Text style={styles.emptyStateTitle}>No hay comentarios aún</Text>
        <Text style={styles.emptyStateText}>
          Sé el primero en comentar esta publicación
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado de estadísticas */}
      <View style={styles.statsHeader}>
        <Text style={styles.statsText}>
          {comments.length}{" "}
          {comments.length === 1 ? "comentario" : "comentarios"}
        </Text>
        {organizedComments.length > 0 && (
          <Text style={styles.threadsText}>
            {organizedComments.length}{" "}
            {organizedComments.length === 1 ? "hilo" : "hilos"}
          </Text>
        )}
      </View>

      {/* Lista de comentarios */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        <View style={styles.commentsList}>
          {organizedComments.map((comment) =>
            renderCommentWithReplies(comment)
          )}
        </View>

        {/* Espacio al final para mejor scroll */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  threadsText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  commentsList: {
    padding: 16,
  },
  bottomSpacing: {
    height: 100,
  },
  commentContainer: {
    marginBottom: 16,
    position: "relative",
  },
  threadLine: {
    position: "absolute",
    left: -8,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#e5e7eb",
  },
  threadControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginLeft: 8,
  },
  threadToggleButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  threadToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  threadToggleText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 4,
  },
  nestedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  replyIcon: {
    margin: 0,
    padding: 0,
    transform: [{ rotate: "180deg" }],
  },
  nestedText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
    marginLeft: 2,
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  moreRepliesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  showMoreText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 4,
  },
  showLessButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  showLessText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: 4,
  },
});

export default CommentList;
