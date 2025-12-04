import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Avatar, IconButton } from "react-native-paper";

const ProfileHeader = ({ userData, onShowStats, isOwnProfile = true }) => {
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

  // Obtener datos del usuario con valores por defecto
  const userName = userData?.nombreCompleto || "Usuario";
  const specialty =
    userData?.especialidad ||
    userData?.professionalInfo?.specialty ||
    "Especialidad no especificada";
  const photoURL =
    userData?.photoURL ||
    userData?.profileMedia ||
    "https://via.placeholder.com/100";
  const joinDate = userData?.joinDate || userData?.fechaRegistro;
  const university =
    userData?.professionalInfo?.university || userData?.university;

  const getVerificationBadge = () => {
    const verificationStatus =
      userData?.professionalInfo?.verificationStatus ||
      userData?.verificationStatus;

    if (verificationStatus === "verified") {
      return (
        <View style={styles.verifiedBadge}>
          <IconButton icon="check-decagram" size={16} iconColor="#2a55ff" />
          <Text style={styles.verifiedText}>Doctor Verificado</Text>
        </View>
      );
    } else if (verificationStatus === "pending") {
      return (
        <View style={styles.pendingBadge}>
          <IconButton icon="clock" size={16} iconColor="#f59e0b" />
          <Text style={styles.pendingText}>En verificación</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.photoContainer}>
          <Avatar.Image
            size={100}
            source={{
              uri: photoURL,
            }}
          />
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => console.log("Cambiar foto")}
            >
              <IconButton
                icon="camera"
                size={16}
                iconColor="white"
                style={styles.cameraIcon}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>
              {userName}
            </Text>
            {getVerificationBadge()}
          </View>

          <Text style={styles.specialty} numberOfLines={2}>
            {specialty}
          </Text>
        </View>
      </View>

      {/* Información adicional */}
      <View style={styles.metaSection}>
        <Text style={styles.metaText}>
          Miembro desde {formatDate(joinDate)}
        </Text>

        {university && (
          <View style={styles.universityBadge}>
            <Text style={styles.universityText}>{university}</Text>
          </View>
        )}

        {userData?.professionalInfo?.titulationYear && (
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>
              Graduado {userData.professionalInfo.titulationYear}
            </Text>
          </View>
        )}
      </View>

      {/* Estadísticas rápidas */}
      <View style={styles.statsSection}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Estadísticas</Text>
          <TouchableOpacity onPress={onShowStats}>
            <IconButton icon="chart-bar" size={20} iconColor="#2a55ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.estadisticas?.publicaciones ||
                userData?.stats?.postsCount ||
                0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Publicaciones
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.estadisticas?.comentarios ||
                userData?.stats?.commentsCount ||
                0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Comentarios
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.estadisticas?.temasParticipacion ||
                userData?.stats?.communitiesCount ||
                0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Comunidades
            </Text>
          </View>

          <View style={[styles.statItem, styles.auraItem]}>
            <Text style={styles.auraValue}>
              {userData?.estadisticas?.aura || userData?.stats?.aura || 0}
            </Text>
            <Text style={styles.auraLabel} numberOfLines={1}>
              Aura
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    padding: 20,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  photoContainer: {
    position: "relative",
    marginRight: 16,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2a55ff",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  cameraIcon: {
    margin: 0,
    padding: 0,
  },
  nameSection: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginRight: 8,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  verifiedText: {
    fontSize: 12,
    color: "#2a55ff",
    fontWeight: "600",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  pendingText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  specialty: {
    fontSize: 16,
    color: "#2a55ff",
    fontWeight: "600",
  },
  metaSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  metaText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 10,
  },
  universityBadge: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  universityText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  yearBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  yearText: {
    fontSize: 14,
    color: "#2a55ff",
    fontWeight: "500",
  },
  statsSection: {
    marginTop: 8,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
    minHeight: 80,
  },
  auraItem: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    width: "100%",
  },
  auraValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2a55ff",
    marginBottom: 4,
  },
  auraLabel: {
    fontSize: 12,
    color: "#2a55ff",
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
});

export default ProfileHeader;
