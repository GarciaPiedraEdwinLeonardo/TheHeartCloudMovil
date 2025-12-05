import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card, IconButton } from "react-native-paper";

const CommentList = ({ comments, onCommentPress }) => {
  const formatDate = (date) => {
    if (!date) return "";
    try {
      if (date.toDate) {
        const now = new Date();
        const commentDate = date.toDate();
        const diffHours = Math.floor((now - commentDate) / (1000 * 60 * 60));

        if (diffHours < 1) return "Hace unos minutos";
        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffHours < 168) return `Hace ${Math.floor(diffHours / 24)} días`;
        return commentDate.toLocaleDateString("es-ES");
      }
      return new Date(date).toLocaleDateString("es-ES");
    } catch (error) {
      return "";
    }
  };

  const truncateText = (text, maxLength = 120) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // ✅ ADAPTACIÓN: Verificar y formatear comentarios
  const getFormattedComments = () => {
    if (!comments || comments.length === 0) return [];

    return comments.map((comment) => {
      // Usar los campos del nuevo formato de useUserProfile
      return {
        id: comment.id,
        content: comment.contenido || comment.content || "Sin contenido",
        createdAt: comment.fecha || comment.createdAt,
        likes: comment.likes || [],
        // ✅ Campo nuevo: publicacionTitulo
        postTitle:
          comment.publicacionTitulo || comment.postTitle || "Publicación",
        // Campos adicionales para referencia
        postId: comment.postId,
        tema: comment.tema || "General",
      };
    });
  };

  const formattedComments = getFormattedComments();

  if (formattedComments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="comment" size={48} iconColor="#d1d5db" />
            <Text style={styles.emptyTitle}>Aún no has comentado</Text>
            <Text style={styles.emptyText}>
              Cuando comentes en publicaciones, aparecerán aquí.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {formattedComments.map((comment) => (
        <TouchableOpacity
          key={comment.id}
          style={styles.commentCard}
          onPress={() => onCommentPress && onCommentPress(comment)}
        >
          <Card style={styles.card}>
            <Card.Content>
              {/* ✅ Título del post donde se comentó */}
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

              {/* Contenido del comentario */}
              <Text style={styles.commentContent} numberOfLines={3}>
                {truncateText(comment.content)}
              </Text>

              {/* ✅ Tema/Foro */}
              {comment.tema && comment.tema !== "General" && (
                <View style={styles.topicBadge}>
                  <IconButton
                    icon="tag"
                    size={12}
                    iconColor="#8b5cf6"
                    style={styles.topicIcon}
                  />
                  <Text style={styles.topicText} numberOfLines={1}>
                    {comment.tema}
                  </Text>
                </View>
              )}

              <View style={styles.commentFooter}>
                <View style={styles.commentStats}>
                  <View style={styles.statItem}>
                    <IconButton
                      icon="heart"
                      size={16}
                      iconColor="#ef4444"
                      style={styles.statIcon}
                    />
                    <Text style={styles.statText}>
                      {comment.likes?.length || 0}
                    </Text>
                  </View>
                </View>

                <Text style={styles.commentDate}>
                  {formatDate(comment.createdAt)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentCard: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 1,
    overflow: "hidden",
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
  commentContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  topicBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  topicIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  topicText: {
    fontSize: 11,
    color: "#7c3aed",
    fontWeight: "500",
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    marginBottom: 8,
  },
  commentStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    color: "#6b7280",
  },
  commentDate: {
    fontSize: 12,
    color: "#9ca3af",
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
  emptyContent: {
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
