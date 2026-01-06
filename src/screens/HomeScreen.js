import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { IconButton, Avatar, ActivityIndicator } from "react-native-paper";
import PostCard from "../components/posts/PostCard";

// Componente Logo
const Logo = () => (
  <View style={styles.logoContainer}>
    <Image
      source={require("../../assets/images/logoprincipal.png")}
      style={styles.logoImage}
      resizeMode="contain"
    />
    <Text style={styles.logoText}>TheHeartCloud</Text>
  </View>
);

const HomeScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userForums, setUserForums] = useState([]); // Foros del usuario
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    console.log("🚀 HomeScreen montado - cargando datos iniciales");
    loadAllData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("🔄 HomeScreen enfocado - recargando datos");
      loadAllData();
    });

    return unsubscribe;
  }, [navigation]);

  // Cargar datos del usuario y TODOS los posts
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Cargar datos del usuario actual
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = { id: currentUser.uid, ...userDoc.data() };
          setUserData(userData);

          // Cargar foros del usuario
          if (userData.joinedForums && userData.joinedForums.length > 0) {
            await loadUserForums(userData.joinedForums);
          }
        }
      }

      // Cargar TODOS los posts ordenados por fecha (más reciente primero)
      const postsQuery = query(
        collection(db, "posts"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );

      const postsSnapshot = await getDocs(postsQuery);
      const postsData = [];

      for (const postDoc of postsSnapshot.docs) {
        const post = {
          id: postDoc.id,
          ...postDoc.data(),
        };

        // Cargar datos del autor
        if (post.authorId) {
          try {
            const authorDoc = await getDoc(doc(db, "users", post.authorId));
            if (authorDoc.exists()) {
              const authorData = authorDoc.data();
              post.authorData = authorData;

              // Obtener nombre del autor (usar email si name es null)
              const authorName =
                authorData.name?.name || authorData.email || "Usuario";
              const authorLastName = authorData.name?.apellidopat || "";
              post.authorName = `${authorName} ${authorLastName}`.trim();

              post.authorPhoto = authorData.photoURL;
              post.authorSpecialty = authorData.professionalInfo?.specialty;
              post.authorVerified =
                authorData.verificationStatus === "verified";
              post.authorEmail = authorData.email; // Guardar email para PostCard
            }
          } catch (error) {
            console.error("Error cargando autor:", error);
          }
        }

        // Cargar datos del foro
        if (post.forumId) {
          try {
            const forumDoc = await getDoc(doc(db, "forums", post.forumId));
            if (forumDoc.exists()) {
              const forumData = forumDoc.data();
              post.forumData = { id: forumDoc.id, ...forumData };
              post.forumName = forumData.name;
            }
          } catch (error) {
            console.error("Error cargando foro:", error);
          }
        }

        postsData.push(post);
      }

      setPosts(postsData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar las publicaciones. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  // Cargar foros del usuario
  const loadUserForums = async (forumIds) => {
    try {
      const forumsData = [];

      for (const forumId of forumIds) {
        try {
          const forumDoc = await getDoc(doc(db, "forums", forumId));
          if (forumDoc.exists()) {
            forumsData.push({
              id: forumDoc.id,
              ...forumDoc.data(),
            });
          }
        } catch (error) {
          console.error(`Error cargando foro ${forumId}:`, error);
        }
      }

      setUserForums(forumsData);
    } catch (error) {
      console.error("Error cargando foros del usuario:", error);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
    }
  };

  // Funciones de navegación
  const navigateToProfile = (userId = null) => {
    navigation.navigate("Profile", { userId });
  };

  const navigateToSearch = () => {
    navigation.navigate("Search");
  };

  const navigateToForum = (forumData) => {
    if (forumData) {
      navigation.navigate("Forum", { forum: forumData, forumId: forumData.id });
    } else {
      Alert.alert("Información", "Este foro no está disponible");
    }
  };

  // Handlers para refrescar datos después de acciones en PostCard
  const handlePostUpdated = () => {
    loadAllData();
  };

  const handlePostDeleted = () => {
    loadAllData();
  };

  // Render loading
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a55ff" />
        <Text style={styles.loadingText}>Cargando publicaciones...</Text>
      </View>
    );
  }

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconButton icon="comment-outline" size={64} iconColor="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>No hay publicaciones</Text>
      <Text style={styles.emptyStateText}>
        Sé el primero en publicar contenido en la comunidad
      </Text>
    </View>
  );

  // Render posts list
  const renderPosts = () => (
    <View style={styles.postsContainer}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onAuthorPress={() => navigateToProfile(post.authorId)}
          onForumPress={() => navigateToForum(post.forumData)}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
        />
      ))}
    </View>
  );

  const renderVerificationBanner = () => {
    // Solo mostrar si el usuario tiene role "unverified"
    if (!userData || userData.role !== "unverified") {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.verificationBanner}
        onPress={() => {
          Alert.alert(
            "Verificación de Cuenta",
            "Para verificarte como médico, necesitas acceder a la versión web de TheHeartCloud.\n\n¿Deseas abrir el sitio web ahora?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Abrir Web",
                onPress: () => {
                  // En React Native, puedes usar Linking para abrir URLs
                  const { Linking } = require("react-native");
                  Linking.openURL("https://theheartcloud-a11a0.web.app/").catch(
                    (err) =>
                      Alert.alert("Error", "No se pudo abrir el navegador")
                  );
                },
              },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          {/* Icono de alerta */}
          <View style={styles.bannerIconContainer}>
            <IconButton
              icon="shield-alert"
              size={32}
              iconColor="#d97706"
              style={styles.bannerIcon}
            />
          </View>

          {/* Contenido del banner */}
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Cuenta No Verificada</Text>
            <Text style={styles.bannerDescription}>
              Para publicar, comentar y unirte a foros necesitas verificarte
              como médico en nuestra página web.
            </Text>

            {/* Botón de acción */}
            <View style={styles.bannerActionContainer}>
              <View style={styles.bannerButton}>
                <IconButton
                  icon="open-in-new"
                  size={16}
                  iconColor="#ffffff"
                  style={styles.bannerButtonIcon}
                />
                <Text style={styles.bannerButtonText}>Verificarme Ahora</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Indicador visual de que es clickeable */}
        <View style={styles.bannerChevron}>
          <IconButton icon="chevron-right" size={24} iconColor="#92400e" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render sidebar
  const renderSidebar = () => {
    if (!isSidebarOpen) return null;

    return (
      <View style={styles.sidebarContainer}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(false)}
              style={styles.closeSidebarButton}
            >
              <IconButton icon="close" size={24} />
            </TouchableOpacity>
            <View style={styles.sidebarLogoContainer}>
              <Image
                source={require("../../assets/images/logoprincipal.png")}
                style={styles.sidebarLogoImage}
                resizeMode="contain"
              />
              <View style={styles.sidebarTitleContainer}>
                <Text style={styles.sidebarTitle}>TheHeartCloud</Text>
                <Text style={styles.sidebarSubtitle}>Comunidad médica</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.sidebarContent}>
            {/* Información del usuario */}
            {userData && (
              <TouchableOpacity
                style={styles.userInfoSection}
                onPress={() => {
                  navigateToProfile();
                  setIsSidebarOpen(false);
                }}
              >
                {userData.photoURL ? (
                  <Avatar.Image size={60} source={{ uri: userData.photoURL }} />
                ) : (
                  <Avatar.Text
                    size={60}
                    label={
                      userData.name?.name?.charAt(0) ||
                      userData.email?.charAt(0) ||
                      "U"
                    }
                    style={styles.sidebarAvatar}
                  />
                )}
                <View style={styles.userInfoText}>
                  <Text style={styles.userName}>
                    {userData.name?.name || userData.email || "Usuario"}
                  </Text>
                  <Text style={styles.userRole}>
                    {userData.role === "doctor"
                      ? "Médico Verificado"
                      : "Usuario"}
                  </Text>
                  {userData.professionalInfo?.specialty && (
                    <Text style={styles.userSpecialty}>
                      {userData.professionalInfo.specialty}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.sidebarDivider} />

            {/* Menú principal - SOLO INICIO Y BUSCAR */}
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="home" size={20} iconColor="#2a55ff" />
              <Text style={styles.sidebarItemTextActive}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                navigateToSearch();
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="magnify" size={20} />
              <Text style={styles.sidebarItemText}>Buscar</Text>
            </TouchableOpacity>

            <View style={styles.sidebarDivider} />

            {/* MIS COMUNIDADES - SOLO ESTO */}
            <Text style={styles.sidebarSectionTitle}>Mis comunidades</Text>

            {userForums.length > 0 &&
              userForums.map((forum) => (
                <TouchableOpacity
                  key={forum.id}
                  style={styles.forumItem}
                  onPress={() => {
                    navigateToForum(forum);
                    setIsSidebarOpen(false);
                  }}
                >
                  <View style={styles.forumItemContent}>
                    <Text style={styles.forumItemName} numberOfLines={1}>
                      {forum.name}
                    </Text>
                    {forum.description && (
                      <Text
                        style={styles.forumItemDescription}
                        numberOfLines={1}
                      >
                        {forum.description}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.forumMemberCount}>
                    {forum.memberCount || 0} miembros
                  </Text>
                </TouchableOpacity>
              ))}

            <View style={styles.sidebarDivider} />

            <TouchableOpacity
              style={[styles.sidebarItem, styles.logoutItem]}
              onPress={() => {
                Alert.alert(
                  "Cerrar Sesión",
                  "¿Estás seguro de que quieres cerrar sesión?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Cerrar Sesión",
                      style: "destructive",
                      onPress: () => {
                        handleLogout();
                        setIsSidebarOpen(false);
                      },
                    },
                  ]
                );
              }}
            >
              <IconButton icon="logout" size={20} iconColor="#ef4444" />
              <Text style={[styles.sidebarItemText, styles.logoutText]}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Overlay para cerrar sidebar al tocar fuera */}
        <TouchableOpacity
          style={styles.sidebarOverlay}
          onPress={() => setIsSidebarOpen(false)}
          activeOpacity={1}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <IconButton icon="menu" size={24} />
        </TouchableOpacity>

        <Logo />

        <TouchableOpacity onPress={() => navigateToProfile()}>
          {userData?.photoURL ? (
            <Avatar.Image size={40} source={{ uri: userData.photoURL }} />
          ) : (
            <Avatar.Text
              size={40}
              label={
                userData?.name?.name?.charAt(0) ||
                userData?.email?.charAt(0) ||
                "U"
              }
              style={styles.userAvatar}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <ScrollView
        style={styles.mainContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderVerificationBanner()}

        {/* Título de sección */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Publicaciones Recientes</Text>
          <Text style={styles.sectionSubtitle}>
            Todas las publicaciones de la comunidad médica
          </Text>
        </View>

        {/* Lista de publicaciones */}
        {posts.length === 0 ? renderEmptyState() : renderPosts()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <IconButton icon="home" size={24} iconColor="#2a55ff" />
          <Text style={styles.navTextActive}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={navigateToSearch}>
          <IconButton icon="magnify" size={24} iconColor="#64748b" />
          <Text style={styles.navText}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToProfile()}
        >
          <IconButton icon="account" size={24} iconColor="#64748b" />
          <Text style={styles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      {renderSidebar()}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    zIndex: 10,
  },
  // Estilos del componente Logo
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2a55ff",
  },
  userAvatar: {
    backgroundColor: "#2a55ff",
  },
  mainContent: {
    flex: 1,
    paddingTop: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  postsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  navTextActive: {
    fontSize: 12,
    color: "#2a55ff",
    fontWeight: "600",
    marginTop: 2,
  },
  // Sidebar styles
  sidebarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: "row",
  },
  sidebar: {
    width: 300,
    backgroundColor: "white",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 1001,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sidebarHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
  },
  closeSidebarButton: {
    marginRight: 12,
  },
  sidebarLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sidebarLogoImage: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  sidebarSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: 20,
  },
  userInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  sidebarAvatar: {
    backgroundColor: "#2a55ff",
  },
  userInfoText: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  userSpecialty: {
    fontSize: 14,
    color: "#2a55ff",
    fontWeight: "500",
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sidebarItemText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
    fontWeight: "500",
  },
  sidebarItemTextActive: {
    fontSize: 16,
    color: "#2a55ff",
    marginLeft: 12,
    fontWeight: "600",
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
    marginHorizontal: 20,
  },
  sidebarSectionTitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  // Estilos para foros
  forumItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  forumItemContent: {
    marginBottom: 4,
  },
  forumItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  forumItemDescription: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  forumMemberCount: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  noForumsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  noForumsText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  joinForumsButton: {
    backgroundColor: "#2a55ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinForumsButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: "#ef4444",
  },
  verificationBanner: {
    backgroundColor: "#fef3c7",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#fbbf24",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bannerIconContainer: {
    marginRight: 12,
    marginTop: 4,
  },
  bannerIcon: {
    margin: 0,
    padding: 0,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  bannerDescription: {
    fontSize: 14,
    color: "#78350f",
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: "500",
  },
  bannerActionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  bannerButtonIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  bannerButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  bannerChevron: {
    marginLeft: 8,
  },
});

export default HomeScreen;
