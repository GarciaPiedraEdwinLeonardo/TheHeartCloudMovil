import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { IconButton } from "react-native-paper";

const { width } = Dimensions.get("window");

const ProfileStats = ({ stats, onClose }) => {
  const calculateLevel = (aura) => {
    if (aura >= 1000) return { level: "Experto", color: "#8b5cf6" };
    if (aura >= 500) return { level: "Avanzado", color: "#2a55ff" };
    if (aura >= 100) return { level: "Intermedio", color: "#22c55e" };
    return { level: "Principiante", color: "#64748b" };
  };

  const levelInfo = calculateLevel(stats?.aura || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas</Text>
        <IconButton icon="close" size={24} onPress={onClose} />
      </View>

      {/* Contenido */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Aura y nivel */}
        <View style={styles.auraSection}>
          <View
            style={[
              styles.auraCard,
              { backgroundColor: `${levelInfo.color}15` },
            ]}
          >
            <IconButton icon="trophy" size={32} iconColor={levelInfo.color} />
            <Text style={styles.auraValue}>{stats?.aura || 0}</Text>
            <Text style={styles.auraLabel}>Aura</Text>
            <Text style={[styles.levelText, { color: levelInfo.color }]}>
              Nivel {levelInfo.level}
            </Text>
          </View>
        </View>

        {/* Estadísticas principales en grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <IconButton icon="file-document" size={24} iconColor="#2a55ff" />
            <Text style={styles.statNumber}>{stats?.postsCount || 0}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
          </View>

          <View style={styles.statItem}>
            <IconButton icon="comment" size={24} iconColor="#22c55e" />
            <Text style={styles.statNumber}>{stats?.commentsCount || 0}</Text>
            <Text style={styles.statLabel}>Comentarios</Text>
          </View>

          <View style={styles.statItem}>
            <IconButton icon="forum" size={24} iconColor="#8b5cf6" />
            <Text style={styles.statNumber}>
              {stats?.communitiesCount || 0}
            </Text>
            <Text style={styles.statLabel}>Comunidades</Text>
          </View>

          <View style={styles.statItem}>
            <IconButton icon="calendar" size={24} iconColor="#f59e0b" />
            <Text style={styles.statNumber}>{stats?.daysActive || 0}</Text>
            <Text style={styles.statLabel}>Días activo</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  auraSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  auraCard: {
    alignItems: "center",
    padding: 30,
    borderRadius: 20,
    width: "100%",
    maxWidth: 300,
  },
  auraValue: {
    fontSize: 42,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  auraLabel: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
});

export default ProfileStats;
