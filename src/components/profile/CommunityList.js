import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { IconButton, Card } from "react-native-paper";

const CommunityList = ({ communities, onCommunityPress }) => {
  const formatDate = (date) => {
    if (!date) return "Fecha no disponible";
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString("es-ES");
      }
      return new Date(date).toLocaleDateString("es-ES");
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  if (communities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="forum" size={48} iconColor="#d1d5db" />
            <Text style={styles.emptyTitle}>
              Aún no participas en comunidades
            </Text>
            <Text style={styles.emptyText}>
              Únete a comunidades médicas para empezar a participar
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {communities.map((community) => (
        <TouchableOpacity
          key={community.id}
          style={styles.communityCard}
          onPress={() => onCommunityPress && onCommunityPress(community)}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.communityInfo}>
                  <Text style={styles.communityName} numberOfLines={1}>
                    {community.name}
                  </Text>
                  <View style={styles.dateRow}>
                    <IconButton
                      icon="calendar"
                      size={14}
                      iconColor="#22c55e"
                      style={styles.dateIcon}
                    />
                    <Text style={styles.dateText} numberOfLines={1}>
                      Se unió el {formatDate(community.joinDate)}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon="chevron-right"
                  size={20}
                  iconColor="#9ca3af"
                  style={styles.arrowIcon}
                />
              </View>

              {/* Estadísticas */}
              <View style={styles.statsContainer}>
                <View
                  style={[styles.statBadge, { backgroundColor: "#eff6ff" }]}
                >
                  <IconButton
                    icon="file-document"
                    size={14}
                    iconColor="#2a55ff"
                    style={styles.statIcon}
                  />
                  <Text
                    style={[styles.statText, { color: "#2a55ff" }]}
                    numberOfLines={1}
                  >
                    {community.posts || 0} pubs
                  </Text>
                </View>

                <View
                  style={[styles.statBadge, { backgroundColor: "#f0fdf4" }]}
                >
                  <IconButton
                    icon="comment"
                    size={14}
                    iconColor="#22c55e"
                    style={styles.statIcon}
                  />
                  <Text
                    style={[styles.statText, { color: "#22c55e" }]}
                    numberOfLines={1}
                  >
                    {community.comments || 0} coms
                  </Text>
                </View>

                {community.memberCount && (
                  <View
                    style={[styles.statBadge, { backgroundColor: "#faf5ff" }]}
                  >
                    <IconButton
                      icon="account-group"
                      size={14}
                      iconColor="#8b5cf6"
                      style={styles.statIcon}
                    />
                    <Text
                      style={[styles.statText, { color: "#8b5cf6" }]}
                      numberOfLines={1}
                    >
                      {community.memberCount} mbrs
                    </Text>
                  </View>
                )}
              </View>

              {/* Descripción */}
              {community.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {truncateText(community.description, 100)}
                </Text>
              )}

              {/* Última actividad */}
              {community.lastActivity && (
                <View style={styles.lastActivity}>
                  <Text style={styles.lastActivityText} numberOfLines={1}>
                    Últ. actividad: {formatDate(community.lastActivity)}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  communityCard: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 1,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  communityInfo: {
    flex: 1,
    marginRight: 8,
  },
  communityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    flex: 1,
  },
  arrowIcon: {
    margin: 0,
    padding: 0,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 8,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 1,
    maxWidth: "45%",
  },
  statIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },
  description: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  lastActivity: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  lastActivityText: {
    fontSize: 11,
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

export default CommunityList;
