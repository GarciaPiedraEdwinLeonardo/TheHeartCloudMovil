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

  if (comments.length === 0) {
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
      {comments.map((comment) => (
        <TouchableOpacity
          key={comment.id}
          style={styles.commentCard}
          onPress={() => onCommentPress && onCommentPress(comment)}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.commentContent} numberOfLines={3}>
                {truncateText(comment.content || "Sin contenido")}
              </Text>

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

              {comment.postTitle && (
                <View style={styles.postReference}>
                  <IconButton
                    icon="file-document"
                    size={14}
                    iconColor="#64748b"
                    style={styles.postIcon}
                  />
                  <Text style={styles.postReferenceText} numberOfLines={1}>
                    En: {comment.postTitle}
                  </Text>
                </View>
              )}
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
  commentContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
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
  postReference: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  postIcon: {
    margin: 0,
    padding: 0,
    marginRight: 6,
  },
  postReferenceText: {
    fontSize: 12,
    color: "#64748b",
    flex: 1,
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
