import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { IconButton } from "react-native-paper";

const CommentList = ({ comments, onCommentPress }) => {
  const [expandedComments, setExpandedComments] = useState({});

  const formatDate = (date) => {
    if (!date) return "";
    try {
      if (date.toDate) {
        const now = new Date();
        const commentDate = date.toDate();
        const diffHours = Math.floor((now - commentDate) / (1000 * 60 * 60));

        if (diffHours < 1) return "Hace unos minutos";
        if (diffHours < 24) return `Hace ${diffHours} horas`;
        return commentDate.toLocaleDateString("es-ES");
      }
      return new Date(date).toLocaleDateString("es-ES");
    } catch (error) {
      return "";
    }
  };

  // Formatear comentarios
  const getFormattedComments = () => {
    if (!comments || comments.length === 0) return [];

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.contenido || comment.content || "Sin contenido",
      createdAt: comment.fecha || comment.createdAt || comment.createdAt,
      likes: comment.likes || [],
      postTitle:
        comment.publicacionTitulo || comment.postTitle || "Publicación",
      postId: comment.postId,
      tema: comment.tema || "General",
      usuarioComentarista: comment.usuarioComentarista || "Usuario",
      rolComentarista: comment.rolComentarista || "Médico",
    }));
  };

  const toggleCommentExpansion = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const formattedComments = getFormattedComments();

  const renderCommentItem = (comment) => {
    const isExpanded = expandedComments[comment.id];
    const shouldShowExpand = comment.content && comment.content.length > 150;

    return (
      <TouchableOpacity key={comment.id} style={styles.commentCard}>
        <View style={styles.card}>
          {/* Título del post */}
          {comment.postTitle && (
            <View style={styles.postTitleContainer}>
              <IconButton
                icon="file-document"
                size={14}
                iconColor="#3b82f6"
                style={styles.postTitleIcon}
              />
              <Text style={styles.postTitleText} numberOfLines={2}>
                En: {comment.postTitle}
              </Text>
            </View>
          )}

          {/* Contenido */}
          <View style={styles.contentContainer}>
            {shouldShowExpand && !isExpanded ? (
              <Text style={styles.commentContent} numberOfLines={4}>
                {comment.content}
              </Text>
            ) : (
              <ScrollView
                style={styles.commentScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <Text style={styles.commentContent}>{comment.content}</Text>
              </ScrollView>
            )}

            {shouldShowExpand && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleCommentExpansion(comment.id)}
              >
                <Text style={styles.expandButtonText}>
                  {isExpanded ? "Mostrar menos" : "Leer más"}
                </Text>
                <IconButton
                  icon={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  iconColor="#3b82f6"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Información */}
          <View style={styles.infoContainer}>
            <Text style={styles.commenterName}>
              {comment.usuarioComentarista}
              {comment.rolComentarista && ` • ${comment.rolComentarista}`}
            </Text>
            <Text style={styles.commentDate}>
              {formatDate(comment.createdAt)}
            </Text>
          </View>

          {/* Likes */}
          <View style={styles.likesContainer}>
            <IconButton
              icon="heart"
              size={14}
              iconColor="#ef4444"
              style={styles.heartIcon}
            />
            <Text style={styles.likesText}>{comment.likes?.length || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (formattedComments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <IconButton icon="comment" size={48} iconColor="#d1d5db" />
          <Text style={styles.emptyTitle}>Aún no has comentado</Text>
          <Text style={styles.emptyText}>
            Cuando comentes en publicaciones, aparecerán aquí.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {formattedComments.map((comment) => renderCommentItem(comment))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  commentCard: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  postTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  postTitleIcon: {
    margin: 0,
    padding: 0,
    marginRight: 6,
  },
  postTitleText: {
    fontSize: 13,
    color: "#1d4ed8",
    fontWeight: "500",
    flex: 1,
  },
  contentContainer: {
    marginBottom: 12,
  },
  commentContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  commentScrollView: {
    maxHeight: 200,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },

  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  commenterName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    flexShrink: 1,
  },
  commentDate: {
    fontSize: 12,
    color: "#9ca3af",
    flexShrink: 0,
  },
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heartIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  likesText: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyCard: {
    width: "100%",
    padding: 24,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default CommentList;
