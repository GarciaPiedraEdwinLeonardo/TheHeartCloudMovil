import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  Card,
  IconButton,
  Avatar,
  ActivityIndicator,
} from "react-native-paper";

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
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para navegación
  const [currentView, setCurrentView] = useState("main");
  const [selectedForum, setSelectedForum] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setTimeout(() => {
        setUserData({
          displayName: "Dr. Usuario",
          photoURL: "https://via.placeholder.com/40",
          role: "doctor",
          isVerified: true,
        });
        setLoading(false);
      }, 1000);
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Funciones de navegación
  const navigateToForum = (forumData) => {
    setSelectedForum(forumData);
    setCurrentView("forum");
  };

  const navigateToPost = (postData) => {
    setSelectedPost(postData);
    setCurrentView("post");
  };

  const navigateToProfile = (userId = null) => {
    navigation.navigate("Profile", {
      userId: userId, // Si es null, será el perfil propio
    });
  };

  const navigateToSearch = () => {
    setCurrentView("search");
  };

  const navigateToMain = () => {
    setCurrentView("main");
  };

  // Componente de vista principal
  const renderMainView = () => (
    <ScrollView
      style={styles.mainContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Título de sección */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Publicaciones Recientes</Text>
      </View>

      {/* Publicaciones recientes - Placeholder */}
      {[1, 2, 3].map((item) => (
        <Card key={item} style={styles.postCard}>
          <Card.Content>
            <TouchableOpacity
              style={styles.postHeader}
              onPress={() =>
                navigateToPost({ id: item, title: `Publicación ${item}` })
              }
            >
              <View style={styles.postUserInfo}>
                <Avatar.Image
                  size={40}
                  source={{ uri: "https://via.placeholder.com/40" }}
                />
                <View style={styles.postUserDetails}>
                  <Text style={styles.postAuthor}>Dr. Ejemplo {item}</Text>
                  <Text style={styles.postTime}>Hace {item} horas</Text>
                </View>
              </View>
              <IconButton icon="check-decagram" size={20} iconColor="#2a55ff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigateToPost({ id: item })}>
              <Text style={styles.postTitle}>
                Título de la publicación médica #{item}
              </Text>
              <Text style={styles.postContent} numberOfLines={3}>
                Contenido de ejemplo para mostrar cómo se verían las
                publicaciones en la aplicación móvil de TheHeartCloud...
              </Text>

              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>#cardiología</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>#casoclínico</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.postFooter}>
              <View style={styles.postActions}>
                <IconButton
                  icon="heart-outline"
                  size={20}
                  onPress={() => console.log("Like")}
                />
                <Text style={styles.actionText}>24</Text>

                <IconButton
                  icon="comment-outline"
                  size={20}
                  onPress={() => navigateToPost({ id: item })}
                />
                <Text style={styles.actionText}>8</Text>
              </View>

              <TouchableOpacity onPress={() => navigateToForum({ id: item })}>
                <View style={styles.forumBadge}>
                  <Text style={styles.forumBadgeText}>Cardiología</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  const renderForumView = () => (
    <View style={styles.fullScreenView}>
      <View style={styles.viewHeader}>
        <TouchableOpacity onPress={navigateToMain} style={styles.backButton}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.viewTitle}>
          Foro: {selectedForum?.name || "Foro"}
        </Text>
        <View style={styles.viewHeaderPlaceholder} />
      </View>
      <View style={styles.viewContent}>
        <Text style={styles.placeholderText}>
          Aquí se mostrarán las publicaciones del foro
        </Text>
      </View>
    </View>
  );

  const renderPostView = () => (
    <View style={styles.fullScreenView}>
      <View style={styles.viewHeader}>
        <TouchableOpacity onPress={navigateToMain} style={styles.backButton}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Publicación</Text>
        <View style={styles.viewHeaderPlaceholder} />
      </View>
      <View style={styles.viewContent}>
        <Text style={styles.placeholderText}>
          Aquí se mostrarán los detalles de la publicación
        </Text>
      </View>
    </View>
  );

  const renderProfileView = () => (
    <View style={styles.fullScreenView}>
      <View style={styles.viewHeader}>
        <TouchableOpacity onPress={navigateToMain} style={styles.backButton}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Perfil</Text>
        <View style={styles.viewHeaderPlaceholder} />
      </View>
      <View style={styles.viewContent}>
        <Text style={styles.placeholderText}>
          Aquí se mostrará el perfil del usuario
        </Text>
      </View>
    </View>
  );

  const renderSearchView = () => (
    <View style={styles.fullScreenView}>
      <View style={styles.viewHeader}>
        <TouchableOpacity onPress={navigateToMain} style={styles.backButton}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Búsqueda</Text>
        <View style={styles.viewHeaderPlaceholder} />
      </View>
      <View style={styles.viewContent}>
        <Text style={styles.placeholderText}>
          Aquí se mostrarán los resultados de búsqueda
        </Text>
      </View>
    </View>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case "forum":
        return renderForumView();
      case "post":
        return renderPostView();
      case "profile":
        return renderProfileView();
      case "search":
        return renderSearchView();
      default:
        return renderMainView();
    }
  };

  // Render Sidebar
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
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                navigateToMain();
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="home" size={20} iconColor="#2a55ff" />
              <Text style={styles.sidebarItemTextActive}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                navigateToProfile();
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="account" size={20} />
              <Text style={styles.sidebarItemText}>Mi Perfil</Text>
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

            <Text style={styles.sidebarSectionTitle}>Mis comunidades</Text>

            {["Cardiología", "Neurología", "Pediatría", "Cirugía"].map(
              (forum, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sidebarItem}
                  onPress={() => {
                    navigateToForum({ name: forum });
                    setIsSidebarOpen(false);
                  }}
                >
                  <IconButton icon="forum" size={20} />
                  <Text style={styles.sidebarItemText}>{forum}</Text>
                </TouchableOpacity>
              )
            )}

            <View style={styles.sidebarDivider} />

            <TouchableOpacity
              style={[styles.sidebarItem, styles.logoutItem]}
              onPress={() => {
                handleLogout();
                setIsSidebarOpen(false);
              }}
            >
              <IconButton icon="logout" size={20} />
              <Text style={styles.sidebarItemText}>Cerrar Sesión</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a55ff" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <IconButton icon="menu" size={24} />
        </TouchableOpacity>

        {/* Componente Logo */}
        <Logo />

        {/* Espacio vacío para mantener la simetría */}
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Contenido principal */}
      {renderCurrentView()}

      {/* Bottom Navigation - Solo en vista principal */}
      {currentView === "main" && (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={navigateToMain}>
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
      )}

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
  headerPlaceholder: {
    width: 40,
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
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  postUserDetails: {
    marginLeft: 12,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  postTime: {
    fontSize: 12,
    color: "#64748b",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: "#475569",
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 16,
  },
  forumBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  forumBadgeText: {
    fontSize: 12,
    color: "#2a55ff",
    fontWeight: "600",
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
    width: 280,
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
  // Full screen views
  fullScreenView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  viewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    marginRight: 12,
  },
  viewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  viewHeaderPlaceholder: {
    width: 40,
  },
  viewContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
});

export default HomeScreen;
