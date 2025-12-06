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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Cargar datos del usuario y TODOS los posts
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Cargar datos del usuario actual
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData({ id: currentUser.uid, ...userDoc.data() });
        }
      }

      // Cargar TODOS los posts ordenados por fecha (más reciente primero)
      const postsQuery = query(
        collection(db, "posts"),
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

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
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
      navigation.navigate("Forum", { forum: forumData });
    } else {
      Alert.alert("Información", "Este foro no está disponible");
    }
  };

  const navigateToPost = (postData) => {
    navigation.navigate("Post", { post: postData });
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
      <TouchableOpacity
        style={styles.createPostButton}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <Text style={styles.createPostButtonText}>
          Crear primera publicación
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render posts list
  const renderPosts = () => (
    <View style={styles.postsContainer}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onCommentClick={() => navigateToPost(post)}
          onAuthorPress={() => navigateToProfile(post.authorId)}
          onForumPress={() => navigateToForum(post.forumData)}
          onViewPost={() => navigateToPost(post)}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
        />
      ))}
    </View>
  );

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

            {/* Menú principal */}
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
                navigation.navigate("CreatePost");
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="plus-circle" size={20} />
              <Text style={styles.sidebarItemText}>Crear Publicación</Text>
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

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                navigation.navigate("MyPosts");
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="file-document" size={20} />
              <Text style={styles.sidebarItemText}>Mis Publicaciones</Text>
            </TouchableOpacity>

            <View style={styles.sidebarDivider} />

            <Text style={styles.sidebarSectionTitle}>Comunidades</Text>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                navigation.navigate("Forums");
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="forum" size={20} />
              <Text style={styles.sidebarItemText}>Ver todos los foros</Text>
            </TouchableOpacity>

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

      {/* Bottom Navigation - CAMBIADO: "Buscar" en vez de "Crear" */}
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
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: "#2a55ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  createPostButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
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
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: "#ef4444",
  },
});

export default HomeScreen;
