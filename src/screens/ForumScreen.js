import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import {
  IconButton,
  ActivityIndicator,
  Button,
  Avatar,
} from "react-native-paper";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import PostList from "../components/profile/PostList";
import CreatePostModal from "../components/posts/CreatePostModal";
import { useForumActions } from "../hooks/useForumsActions";
import { usePosts } from "../hooks/usePosts";

const ForumScreen = ({ navigation, route }) => {
  // Obtener parámetros de navegación
  const { forum: initialForumData, forumId } = route.params || {};

  const [forumDetails, setForumDetails] = useState(initialForumData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userMembership, setUserMembership] = useState({
    isMember: false,
    role: null,
  });
  const [userData, setUserData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  const {
    joinForum,
    leaveForum,
    checkUserMembership,
    getForumData,
    isUserBannedFromForum,
  } = useForumActions();
  const { posts, loading: postsLoading } = usePosts(forumDetails?.id);
  const currentUser = auth.currentUser;

  // Variables computadas
  const isOwner = userMembership.role === "owner";
  const isModerator = userMembership.role === "moderator";
  const isVerified = userData?.role !== "unverified";
  const canPost =
    userMembership.isMember &&
    (userData?.role === "doctor" ||
      userData?.role === "moderator" ||
      userData?.role === "admin") &&
    !isUserBanned;
  const requiresApproval = forumDetails?.membershipSettings?.requiresApproval;
  const requiresPostApproval = forumDetails?.requiresPostApproval;
  const isUserPending = hasPendingRequest && !userMembership.isMember;

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
  }, [initialForumData, forumId]);

  // Cargar todos los datos del foro
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Si solo tenemos ID, cargar datos del foro
      if ((!forumDetails || !forumDetails.id) && forumId) {
        const forumResult = await getForumData(forumId);
        if (forumResult.success) {
          setForumDetails(forumResult.data);
        } else {
          throw new Error(forumResult.error || "Comunidad no encontrada");
        }
      }

      // Cargar datos del usuario actual
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }

      // Si ya tenemos datos del foro, cargar membresía y otros datos
      if (forumDetails?.id) {
        // Verificar membresía del usuario
        const membership = await checkUserMembership(forumDetails.id);
        setUserMembership(membership);

        // Verificar si el usuario está baneado
        if (currentUser) {
          const banned = await isUserBannedFromForum(
            forumDetails.id,
            currentUser.uid
          );
          setIsUserBanned(banned);
        }

        // Verificar solicitud pendiente
        const forumDoc = await getDoc(doc(db, "forums", forumDetails.id));
        if (forumDoc.exists()) {
          const forumData = forumDoc.data();
          if (forumData.pendingMembers && currentUser) {
            setHasPendingRequest(!!forumData.pendingMembers[currentUser.uid]);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando datos del foro:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los datos del foro"
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  };

  // Manejar unirse/salir del foro
  const handleJoinLeave = async () => {
    if (!currentUser) {
      Alert.alert(
        "Inicio de sesión requerido",
        "Debes iniciar sesión para unirte a comunidades"
      );
      return;
    }

    // Verificar si está baneado
    if (isUserBanned) {
      Alert.alert(
        "Acción no permitida",
        "No puedes unirte a esta comunidad porque has sido baneado"
      );
      return;
    }

    // Verificar si no está verificado
    if (!isVerified) {
      Alert.alert(
        "Verificación requerida",
        "Solo usuarios verificados pueden unirse a comunidades. Por favor, verifica tu cuenta en la versión web primero."
      );
      return;
    }

    setActionLoading(true);

    try {
      if (userMembership.isMember) {
        // Si es el dueño, mostrar advertencia
        if (isOwner) {
          Alert.alert(
            "No puedes abandonar",
            "Como dueño de la comunidad, no puedes abandonarla."
          );
          setActionLoading(false);
          return;
        }

        // Confirmar salida
        Alert.alert(
          "Abandonar comunidad",
          "¿Estás seguro de que quieres abandonar esta comunidad?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Abandonar",
              style: "destructive",
              onPress: async () => {
                const result = await leaveForum(forumDetails.id);
                if (result.success) {
                  setUserMembership({ isMember: false, role: null });
                  await loadAllData();
                  Alert.alert(
                    "Éxito",
                    result.message || "Has abandonado la comunidad"
                  );
                } else {
                  Alert.alert(
                    "Error",
                    result.error || "No se pudo abandonar la comunidad"
                  );
                }
              },
            },
          ]
        );
      } else {
        // Unirse al foro
        const result = await joinForum(forumDetails.id);

        if (result.success) {
          if (result.requiresApproval) {
            Alert.alert("Solicitud enviada", result.message);
            setHasPendingRequest(true);
          } else {
            setUserMembership({ isMember: true, role: "member" });
            Alert.alert(
              "Éxito",
              result.message || "Te has unido a la comunidad"
            );
          }
          await loadAllData();
        } else {
          Alert.alert(
            "Error",
            result.error || "No se pudo unir a la comunidad"
          );
        }
      }
    } catch (error) {
      console.error("Error en join/leave:", error);
      Alert.alert("Error", "Ocurrió un error al procesar la acción");
    } finally {
      setActionLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString("es-ES");
      }
      return new Date(timestamp).toLocaleDateString("es-ES");
    } catch {
      return "";
    }
  };

  // Navegar al perfil de un usuario
  const navigateToProfile = (userId) => {
    if (userId === currentUser?.uid) {
      navigation.navigate("Profile");
    } else {
      navigation.navigate("Profile", { userId });
    }
  };

  // Navegar a un post
  const navigateToPost = (post) => {
    Alert.alert(
      "Detalles del post",
      `Verías los detalles del post: "${post.title}"\n\nEsta funcionalidad estará disponible próximamente.`,
      [{ text: "OK" }]
    );
  };

  // Manejar publicación creada
  const handlePostCreated = () => {
    // Recargar posts después de crear uno nuevo
    onRefresh();
  };

  // Render loading
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a55ff" />
        <Text style={styles.loadingText}>Cargando comunidad...</Text>
      </View>
    );
  }

  // Render si no hay datos del foro
  if (!forumDetails) {
    return (
      <View style={styles.errorContainer}>
        <IconButton icon="alert-circle" size={48} iconColor="#ef4444" />
        <Text style={styles.errorTitle}>Comunidad no encontrada</Text>
        <Text style={styles.errorText}>
          La comunidad que buscas no existe o ha sido eliminada
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Volver
        </Button>
      </View>
    );
  }

  // Render header del foro
  const renderForumHeader = () => (
    <View style={styles.headerContainer}>
      {/* Botón volver */}
      <TouchableOpacity
        style={styles.backButtonHeader}
        onPress={() => navigation.goBack()}
      >
        <IconButton icon="arrow-left" size={24} />
      </TouchableOpacity>

      {/* Información del foro */}
      <View style={styles.forumInfo}>
        <View style={styles.forumIconContainer}>
          <IconButton icon="account-group" size={28} iconColor="#2a55ff" />
        </View>
        <View style={styles.forumTextContainer}>
          <Text style={styles.forumName}>{forumDetails.name}</Text>
          <Text style={styles.forumDescription} numberOfLines={2}>
            {forumDetails.description}
          </Text>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <IconButton icon="account" size={16} iconColor="#6b7280" />
          <Text style={styles.statText}>{forumDetails.memberCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <IconButton icon="file-document" size={16} iconColor="#6b7280" />
          <Text style={styles.statText}>{forumDetails.postCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <IconButton icon="calendar" size={16} iconColor="#6b7280" />
          <Text style={styles.statText}>
            {formatDate(forumDetails.createdAt)}
          </Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.badgesContainer}>
        {requiresApproval && (
          <View style={[styles.badge, styles.approvalBadge]}>
            <IconButton icon="lock" size={12} iconColor="#f59e0b" />
            <Text style={[styles.badgeText, styles.approvalBadgeText]}>
              Requiere aprobación
            </Text>
          </View>
        )}
        {userMembership.role === "owner" && (
          <View style={[styles.badge, styles.ownerBadge]}>
            <IconButton icon="crown" size={12} iconColor="#f59e0b" />
            <Text style={[styles.badgeText, styles.ownerBadgeText]}>Dueño</Text>
          </View>
        )}
        {userMembership.role === "moderator" && (
          <View style={[styles.badge, styles.moderatorBadge]}>
            <IconButton icon="shield-account" size={12} iconColor="#3b82f6" />
            <Text style={[styles.badgeText, styles.moderatorBadgeText]}>
              Moderador
            </Text>
          </View>
        )}
        {isUserBanned && (
          <View style={[styles.badge, styles.bannedBadge]}>
            <IconButton icon="cancel" size={12} iconColor="#ef4444" />
            <Text style={[styles.badgeText, styles.bannedBadgeText]}>
              Baneado
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render mensaje de bienvenida para no miembros
  const renderWelcomeMessage = () => {
    if (userMembership.isMember || !isVerified || isUserBanned) return null;

    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeIcon}>
          <IconButton icon="account-group" size={24} iconColor="#2a55ff" />
        </View>
        <View style={styles.welcomeText}>
          <Text style={styles.welcomeTitle}>
            {requiresApproval
              ? "Solicitar unirse a la comunidad"
              : "Únete a la comunidad"}
          </Text>
          <Text style={styles.welcomeDescription}>
            {requiresApproval
              ? "Envíe una solicitud para unirse. Los moderadores la revisarán pronto."
              : "Forma parte de esta comunidad médica y participa en las discusiones."}
          </Text>
        </View>
      </View>
    );
  };

  // Render reglas del foro
  const renderRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.rulesTitle}>Reglas de la comunidad</Text>
      <View style={styles.rulesContent}>
        <Text style={styles.rulesText}>
          {forumDetails.rules ||
            "• Respeto hacia todos los miembros\n• Contenido médico verificado\n• No spam ni autopromoción\n• Confidencialidad de pacientes\n• Lenguaje profesional"}
        </Text>
      </View>
    </View>
  );

  // Render botón de acción principal
  const renderActionButton = () => {
    // Usuario baneado
    if (isUserBanned) {
      return (
        <View style={styles.bannedMessage}>
          <IconButton icon="cancel" size={20} iconColor="#ef4444" />
          <Text style={styles.bannedText}>
            Has sido baneado de esta comunidad
          </Text>
        </View>
      );
    }

    // Usuario no verificado
    if (!isVerified) {
      return (
        <Button
          mode="outlined"
          style={[styles.actionButton, styles.disabledButton]}
          disabled={true}
          icon="account-alert"
        >
          Solo usuarios verificados
        </Button>
      );
    }

    // Usuario con solicitud pendiente
    if (isUserPending) {
      return (
        <Button
          mode="outlined"
          style={[styles.actionButton, styles.pendingButton]}
          disabled={true}
          icon="clock"
        >
          Solicitud enviada
        </Button>
      );
    }

    // Botón unirse/abandonar
    const buttonText = userMembership.isMember
      ? isOwner
        ? "Eres el dueño"
        : "Abandonar comunidad"
      : requiresApproval
      ? "Solicitar unirse"
      : "Unirse a la comunidad";

    return (
      <Button
        mode={userMembership.isMember ? "outlined" : "contained"}
        style={[
          styles.actionButton,
          userMembership.isMember ? styles.leaveButton : styles.joinButton,
        ]}
        onPress={handleJoinLeave}
        loading={actionLoading}
        disabled={actionLoading || isOwner}
        icon={userMembership.isMember ? "logout" : "account-plus"}
      >
        {actionLoading ? "Procesando..." : buttonText}
      </Button>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      {renderForumHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Mensaje de bienvenida */}
        {renderWelcomeMessage()}

        {/* Reglas del foro */}
        {renderRules()}

        {/* Lista de posts */}
        <View style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <Text style={styles.postsTitle}>Publicaciones</Text>
            {canPost && (
              <TouchableOpacity
                style={styles.createPostButton}
                onPress={() => setShowCreatePostModal(true)}
              >
                <IconButton icon="plus" size={20} iconColor="#ffffff" />
                <Text style={styles.createPostText}>Nueva</Text>
              </TouchableOpacity>
            )}
          </View>

          {postsLoading ? (
            <ActivityIndicator style={styles.postsLoading} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <IconButton
                icon="file-document-outline"
                size={48}
                iconColor="#cbd5e1"
              />
              <Text style={styles.emptyPostsTitle}>No hay publicaciones</Text>
              <Text style={styles.emptyPostsText}>
                {canPost
                  ? "Sé el primero en publicar en esta comunidad"
                  : "Aún no hay publicaciones en esta comunidad"}
              </Text>
            </View>
          ) : (
            <PostList
              key={posts.id}
              posts={posts}
              onAuthorPress={navigateToProfile}
              onForumPress={(forumId) => {
                // Ya estamos en el foro, no hacer nada
                Alert.alert("Información", "Ya estás en esta comunidad");
              }}
            />
          )}
        </View>

        {/* Espacio para el botón flotante */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón de acción flotante */}
      <View style={styles.floatingAction}>{renderActionButton()}</View>

      {/* Modal para crear post */}
      <CreatePostModal
        visible={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        forumId={forumDetails.id}
        forumName={forumDetails.name}
        requiresPostApproval={requiresPostApproval && !isOwner && !isModerator}
        canPostWithoutApproval={isOwner || isModerator}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#2a55ff",
  },
  // Header styles
  headerContainer: {
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButtonHeader: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  forumInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  forumIconContainer: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    marginRight: 12,
  },
  forumTextContainer: {
    flex: 1,
  },
  forumName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  forumDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: -8,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  approvalBadge: {
    backgroundColor: "#fef3c7",
  },
  ownerBadge: {
    backgroundColor: "#fef3c7",
  },
  moderatorBadge: {
    backgroundColor: "#dbeafe",
  },
  bannedBadge: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  approvalBadgeText: {
    color: "#d97706",
  },
  ownerBadgeText: {
    color: "#d97706",
  },
  moderatorBadgeText: {
    color: "#1d4ed8",
  },
  bannedBadgeText: {
    color: "#dc2626",
  },
  // Content styles
  content: {
    flex: 1,
  },
  welcomeContainer: {
    backgroundColor: "#eff6ff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeIcon: {
    marginRight: 12,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  welcomeDescription: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  rulesContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  rulesContent: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rulesText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 22,
  },
  postsSection: {
    marginBottom: 100, // Espacio para el botón flotante
  },
  postsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  createPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a55ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createPostText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  postsLoading: {
    marginVertical: 40,
  },
  emptyPosts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPostsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyPostsText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  // Action button styles
  floatingAction: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    borderRadius: 8,
  },
  joinButton: {
    backgroundColor: "#10b981",
  },
  leaveButton: {
    borderColor: "#ef4444",
  },
  disabledButton: {
    borderColor: "#d1d5db",
  },
  pendingButton: {
    borderColor: "#f59e0b",
  },
  bannedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  bannedText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ForumScreen;
