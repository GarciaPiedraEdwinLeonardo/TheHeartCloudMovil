import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card, IconButton } from "react-native-paper";

const PublicationList = ({ posts, onPostPress }) => {
  const formatDate = (date) => {
    if (!date) return "";
    try {
      if (date.toDate) {
        const now = new Date();
        const postDate = date.toDate();
        const diffMs = now - postDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Ayer";
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return postDate.toLocaleDateString("es-ES");
      }
      return new Date(date).toLocaleDateString("es-ES");
    } catch (error) {
      return "";
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="file-document" size={48} iconColor="#d1d5db" />
            <Text style={styles.emptyTitle}>
              Aún no has creado publicaciones
            </Text>
            <Text style={styles.emptyText}>
              Cuando crees publicaciones en las comunidades, aparecerán aquí.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {posts.map((post) => (
        <TouchableOpacity
          key={post.id}
          style={styles.postCard}
          onPress={() => onPostPress && onPostPress(post)}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.postTitle} numberOfLines={2}>
                {post.title || "Sin título"}
              </Text>
              <Text style={styles.postContent} numberOfLines={3}>
                {truncateText(post.content || "Sin contenido")}
              </Text>

              <View style={styles.postFooter}>
                <View style={styles.postStats}>
                  <View style={styles.statItem}>
                    <IconButton
                      icon="heart"
                      size={16}
                      iconColor="#ef4444"
                      style={styles.statIcon}
                    />
                    <Text style={styles.statText}>
                      {post.likes?.length || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <IconButton
                      icon="comment"
                      size={16}
                      iconColor="#64748b"
                      style={styles.statIcon}
                    />
                    <Text style={styles.statText}>
                      {post.commentCount || 0}
                    </Text>
                  </View>
                </View>

                <Text style={styles.postDate}>
                  {formatDate(post.createdAt)}
                </Text>
              </View>

              {post.forumName && (
                <View style={styles.forumBadge}>
                  <Text style={styles.forumBadgeText} numberOfLines={1}>
                    {post.forumName}
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
  postCard: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 1,
    overflow: "hidden",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 20,
  },
  postContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    marginBottom: 8,
  },
  postStats: {
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
  postDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  forumBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  forumBadgeText: {
    fontSize: 12,
    color: "#2a55ff",
    fontWeight: "500",
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

export default PublicationList;
