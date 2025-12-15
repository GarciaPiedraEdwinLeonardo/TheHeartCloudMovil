import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { IconButton } from "react-native-paper";
import CommentCard from "./CommentCard";

const CommentList = ({
  comments,
  postId,
  onReply,
  onCommentDeleted,
  scrollViewRef,
}) => {
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [showAllReplies, setShowAllReplies] = useState(new Set());

  // Límite de profundidad para móvil (2 niveles)
  const MAX_DEPTH = 2;

  // Organizar comentarios en estructura jerárquica con límite de profundidad
  const organizedComments = useMemo(() => {
    const commentMap = new Map();
    const rootComments = [];

    // Primero, crear mapa de todos los comentarios
    comments.forEach((comment) => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
        replyCount: 0,
        depth: 0,
        canReply: true,
      });
    });

    // Calcular profundidad de cada comentario y construir jerarquía
    comments.forEach((comment) => {
      const commentNode = commentMap.get(comment.id);

      // Calcular profundidad real
      let depth = 0;
      let currentId = comment.parentCommentId;

      while (currentId) {
        depth++;
        const parent = commentMap.get(currentId);
        if (!parent) break;
        currentId = parent.parentCommentId;
      }

      commentNode.depth = depth;

      // Determinar si se puede responder (basado en profundidad)
      commentNode.canReply = depth < MAX_DEPTH - 1;

      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent && depth < MAX_DEPTH) {
          parent.replies.push(commentNode);
          parent.replyCount = (parent.replyCount || 0) + 1;
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    // Ordenar respuestas por fecha (más recientes primero)
    commentMap.forEach((comment) => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateA - dateB; // Ascendente (más antiguos primero)
        });
      }
    });

    return rootComments;
  }, [comments]);

  // Toggle para expandir/colapsar hilos
  const toggleThread = (commentId) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
        collapseAllChildThreads(commentId, newSet);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Función recursiva para colapsar hilos hijos
  const collapseAllChildThreads = (commentId, set) => {
    const findComment = (commentsList, targetId) => {
      for (const comment of commentsList) {
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

    // Solo renderizar si el padre está expandido
    if (depth > 0 && !parentExpanded) {
      return null;
    }

    // Calcular margen izquierdo con límite visual
    const maxVisualDepth = 4;
    const effectiveDepth = Math.min(depth, maxVisualDepth);
    const marginLeft = effectiveDepth * 16;

    // Para respuestas anidadas, mostrar máximo 2 inicialmente
    const visibleReplies = showAll
      ? comment.replies
      : comment.replies.slice(0, 2);
    const hasHiddenReplies = comment.replies.length > 2 && !showAll;

    return (
      <View key={comment.id} style={[styles.commentContainer, { marginLeft }]}>
        {/* Línea vertical para hilos anidados */}
        {depth > 0 && <View style={styles.threadLine} />}

        {/* Comentario principal */}
        <CommentCard
          comment={comment}
          postId={postId}
          onReply={comment.canReply ? onReply : null}
          onCommentDeleted={onCommentDeleted}
          isReply={depth > 0}
          depth={depth}
        />

        {/* Controles de hilo */}
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

            {/* Indicador de límite de profundidad */}
            {comment.depth >= MAX_DEPTH - 1 && hasReplies && (
              <View style={styles.depthWarning}>
                <IconButton icon="information" size={14} iconColor="#f59e0b" />
                <Text style={styles.depthWarningText}>
                  Límite de respuestas alcanzado
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Renderizar respuestas si el hilo está expandido */}
        {hasReplies && isThreadExpanded && (
          <View style={styles.repliesContainer}>
            {visibleReplies.map((reply) =>
              renderCommentWithReplies(reply, depth + 1, isThreadExpanded)
            )}

            {/* Botón para mostrar más respuestas */}
            {hasHiddenReplies && (
              <View style={styles.moreRepliesContainer}>
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => toggleShowAllReplies(comment.id)}
                >
                  <IconButton
                    icon="chevron-down"
                    size={16}
                    iconColor="#3b7280"
                  />
                  <Text style={styles.showMoreText}>
                    Ver {comment.replies.length - 2} respuestas más
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botón para mostrar menos */}
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

  // Estado vacío
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

  // Contar total de comentarios visibles (dentro del límite de profundidad)
  const visibleCommentsCount = comments.length;

  return (
    <View style={styles.container}>
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

        {/* Espacio al final */}
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
  statsLeft: {
    flexDirection: "row",
    alignItems: "center",
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
    marginLeft: 12,
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  limitIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  limitText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 4,
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
  depthWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  depthWarningText: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "500",
    marginLeft: 4,
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
