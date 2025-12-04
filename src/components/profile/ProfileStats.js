// src/components/profile/ProfileStats.js
import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { IconButton, Card } from "react-native-paper";

const { width, height } = Dimensions.get("window");

const ProfileStats = ({ stats, onClose }) => {
  const calculateLevel = (aura) => {
    if (aura >= 1000)
      return { level: "Experto", color: "#8b5cf6", bg: "#f5f3ff" };
    if (aura >= 500)
      return { level: "Avanzado", color: "#2a55ff", bg: "#eff6ff" };
    if (aura >= 100)
      return { level: "Intermedio", color: "#22c55e", bg: "#f0fdf4" };
    return { level: "Principiante", color: "#64748b", bg: "#f8fafc" };
  };

  const levelInfo = calculateLevel(stats?.aura || 0);
  const totalInteractions =
    (stats?.postsCount || 0) + (stats?.commentsCount || 0);
  const auraPerInteraction =
    totalInteractions > 0
      ? Math.round((stats?.aura || 0) / totalInteractions)
      : 0;

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas Detalladas</Text>
        <IconButton
          icon="close"
          size={24}
          onPress={onClose}
          style={styles.closeButton}
        />
      </View>

      {/* Contenido con ScrollView */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Nivel del usuario */}
        <View
          style={[
            styles.levelSection,
            { backgroundColor: levelInfo.bg, borderColor: levelInfo.color },
          ]}
        >
          <IconButton
            icon="trophy"
            size={28}
            iconColor={levelInfo.color}
            style={styles.levelIcon}
          />
          <View style={styles.levelContent}>
            <Text style={[styles.levelText, { color: levelInfo.color }]}>
              Nivel {levelInfo.level}
            </Text>
            <Text style={styles.auraValue}>{stats?.aura || 0}</Text>
            <Text style={styles.auraLabel}>Puntos de Aura Total</Text>
          </View>
        </View>

        {/* Estadísticas principales en grid 2x2 */}
        <View style={styles.mainStatsGrid}>
          <View style={[styles.mainStatCard, { backgroundColor: "#fef2f2" }]}>
            <View style={styles.mainStatHeader}>
              <IconButton
                icon="heart"
                size={24}
                iconColor="#ef4444"
                style={styles.mainStatIcon}
              />
              <Text style={styles.mainStatTitle}>Aura</Text>
            </View>
            <Text style={styles.mainStatValue}>{stats?.aura || 0}</Text>
            <Text style={styles.mainStatDesc}>
              Tu reputación en la comunidad
            </Text>
          </View>

          <View style={[styles.mainStatCard, { backgroundColor: "#eff6ff" }]}>
            <View style={styles.mainStatHeader}>
              <IconButton
                icon="comment-multiple"
                size={24}
                iconColor="#2a55ff"
                style={styles.mainStatIcon}
              />
              <Text style={styles.mainStatTitle}>Interacciones</Text>
            </View>
            <Text style={styles.mainStatValue}>{totalInteractions}</Text>
            <Text style={styles.mainStatDesc}>Publicaciones + Comentarios</Text>
          </View>

          <View style={[styles.mainStatCard, { backgroundColor: "#f0f9ff" }]}>
            <View style={styles.mainStatHeader}>
              <IconButton
                icon="calendar"
                size={24}
                iconColor="#0ea5e9"
                style={styles.mainStatIcon}
              />
              <Text style={styles.mainStatTitle}>Días activo</Text>
            </View>
            <Text style={styles.mainStatValue}>{stats?.daysActive || 0}</Text>
            <Text style={styles.mainStatDesc}>Tiempo en la plataforma</Text>
          </View>

          <View style={[styles.mainStatCard, { backgroundColor: "#faf5ff" }]}>
            <View style={styles.mainStatHeader}>
              <IconButton
                icon="account-group"
                size={24}
                iconColor="#8b5cf6"
                style={styles.mainStatIcon}
              />
              <Text style={styles.mainStatTitle}>Comunidades</Text>
            </View>
            <Text style={styles.mainStatValue}>
              {stats?.communitiesCount || 0}
            </Text>
            <Text style={styles.mainStatDesc}>
              Comunidades donde participas
            </Text>
          </View>
        </View>

        {/* Desglose detallado */}
        <View style={styles.detailedSection}>
          <Text style={styles.sectionTitle}>Desglose de Actividad</Text>
          <View style={styles.detailedGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>{stats?.postsCount || 0}</Text>
              <Text style={styles.detailLabel}>Publicaciones</Text>
              <IconButton
                icon="file-document"
                size={16}
                iconColor="#4b5563"
                style={styles.detailIcon}
              />
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>
                {stats?.commentsCount || 0}
              </Text>
              <Text style={styles.detailLabel}>Comentarios</Text>
              <IconButton
                icon="comment"
                size={16}
                iconColor="#4b5563"
                style={styles.detailIcon}
              />
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>
                {stats?.contributionCount || 0}
              </Text>
              <Text style={styles.detailLabel}>Contribuciones</Text>
              <IconButton
                icon="star"
                size={16}
                iconColor="#4b5563"
                style={styles.detailIcon}
              />
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>{auraPerInteraction}</Text>
              <Text style={styles.detailLabel}>Aura/prom</Text>
              <IconButton
                icon="trending-up"
                size={16}
                iconColor="#4b5563"
                style={styles.detailIcon}
              />
            </View>
          </View>
        </View>

        {/* Ratio de actividad */}
        {stats?.postsCount > 0 && (
          <View style={styles.ratioSection}>
            <Text style={styles.ratioTitle}>Ratio de actividad</Text>
            <View style={styles.ratioBar}>
              <View
                style={[
                  styles.ratioFill,
                  {
                    width: `${Math.min(
                      100,
                      (stats.postsCount / Math.max(1, totalInteractions)) * 100
                    )}%`,
                    backgroundColor: "#2a55ff",
                  },
                ]}
              />
            </View>
            <View style={styles.ratioLabels}>
              <Text style={styles.ratioLabel}>
                Publicaciones: {stats.postsCount} (
                {Math.round((stats.postsCount / totalInteractions) * 100)}%)
              </Text>
              <Text style={styles.ratioLabel}>
                Comentarios: {stats.commentsCount || 0} (
                {Math.round(
                  ((stats.commentsCount || 0) / totalInteractions) * 100
                )}
                %)
              </Text>
            </View>
          </View>
        )}

        {/* Espacio al final para que se vea bien */}
        <View style={styles.bottomSpacing} />
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  levelSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  levelIcon: {
    margin: 0,
    marginRight: 12,
  },
  levelContent: {
    flex: 1,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  auraValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  auraLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  mainStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  mainStatCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    minHeight: 140,
  },
  mainStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  mainStatIcon: {
    margin: 0,
    marginRight: 8,
    padding: 0,
  },
  mainStatTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  mainStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  mainStatDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  detailedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  detailedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
    minHeight: 80,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  detailIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    margin: 0,
    padding: 0,
  },
  ratioSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  ratioTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  ratioBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  ratioFill: {
    height: "100%",
    borderRadius: 4,
  },
  ratioLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  ratioLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ProfileStats;
