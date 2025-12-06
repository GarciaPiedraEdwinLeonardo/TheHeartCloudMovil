import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { IconButton, Card } from "react-native-paper";

const CommunityList = ({
  communities,
  onCommunityPress,
  refreshing = false,
  onRefresh,
  scrollEnabled = true, // Nueva prop para controlar el scroll interno
}) => {
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

  // Formatear datos de las comunidades
  const getFormattedCommunities = () => {
    if (!communities || communities.length === 0) return [];

    return communities.map((community) => {
      return {
        id: community.id,
        name: community.nombre || community.name || "Comunidad",
        description: community.description || community.descripcion || "",
        joinDate:
          community.fechaUnion || community.joinDate || community.createdAt,
        posts: community.publicaciones || community.posts || 0,
        comments: community.comentarios || community.comments || 0,
        memberCount: community.memberCount || community.members || 0,
        lastActivity:
          community.lastActivity || community.lastPostAt || community.updatedAt,
        image: community.image || community.photoURL || null,
      };
    });
  };

  const formattedCommunities = getFormattedCommunities();

  const renderCommunityItem = (item) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => onCommunityPress && onCommunityPress(item)}
      key={item.id}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* Header con imagen */}
          <View style={styles.cardHeader}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.communityImage}
              />
            ) : (
              <View
                style={[
                  styles.communityImage,
                  styles.communityImagePlaceholder,
                ]}
              >
                <IconButton
                  icon="forum"
                  size={24}
                  iconColor="#9ca3af"
                  style={styles.placeholderIcon}
                />
              </View>
            )}

            <View style={styles.communityInfo}>
              <Text style={styles.communityName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.dateRow}>
                <IconButton
                  icon="calendar"
                  size={14}
                  iconColor="#22c55e"
                  style={styles.dateIcon}
                />
                <Text style={styles.dateText} numberOfLines={1}>
                  Se unió el {formatDate(item.joinDate)}
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

          {/* Descripción */}
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {truncateText(item.description, 100)}
            </Text>
          )}

          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <View style={[styles.statBadge, { backgroundColor: "#eff6ff" }]}>
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
                {item.posts} pubs
              </Text>
            </View>

            <View style={[styles.statBadge, { backgroundColor: "#f0fdf4" }]}>
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
                {item.comments} coms
              </Text>
            </View>

            {item.memberCount > 0 && (
              <View style={[styles.statBadge, { backgroundColor: "#faf5ff" }]}>
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
                  {item.memberCount} mbrs
                </Text>
              </View>
            )}
          </View>

          {/* Última actividad */}
          {item.lastActivity && (
            <View style={styles.lastActivity}>
              <Text style={styles.lastActivityText} numberOfLines={1}>
                Últ. actividad: {formatDate(item.lastActivity)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Estado vacío
  const renderEmptyState = () => (
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

  // Si scrollEnabled es true, usar FlatList (para uso independiente)
  if (scrollEnabled) {
    return (
      <FlatList
        data={formattedCommunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCommunityItem(item)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
      />
    );
  }

  // Si scrollEnabled es false, renderizar como View simple (para uso anidado)
  return (
    <View style={styles.listContent}>
      {formattedCommunities.length === 0
        ? renderEmptyState()
        : formattedCommunities.map((item) => renderCommunityItem(item))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
    alignItems: "center",
    marginBottom: 12,
  },
  communityImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  communityImagePlaceholder: {
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    margin: 0,
    padding: 0,
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
  description: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
    marginBottom: 12,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
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
