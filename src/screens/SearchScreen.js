// src/screens/SearchScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { IconButton, Avatar, Card, Chip, Searchbar } from "react-native-paper";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { debounce } from "lodash";

const { width } = Dimensions.get("window");

// Función para normalizar texto (quitar acentos)
const normalizeText = (text = "") => {
  return text
    .normalize("NFD") // Normalizar a forma de descomposición
    .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos (acentos)
    .toLowerCase();
};

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("publicaciones"); // publicaciones, comunidades, usuarios
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState({
    publicaciones: [],
    comunidades: [],
    usuarios: [],
  });

  // Tipos de búsqueda (sin iconos para no amontonar)
  const searchTabs = [
    { id: "publicaciones", label: "Publicaciones" },
    { id: "comunidades", label: "Comunidades" },
    { id: "usuarios", label: "Usuarios" },
  ];

  // Función de búsqueda con debounce y normalización
  const performSearch = useCallback(
    debounce(async (queryText) => {
      if (!queryText.trim()) {
        setResults({ publicaciones: [], comunidades: [], usuarios: [] });
        return;
      }

      setLoading(true);
      try {
        const normalizedSearchTerm = normalizeText(queryText);

        // 1. Buscar publicaciones
        const postsQuery = query(
          collection(db, "posts"),
          where("status", "==", "active"),
          limit(25)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const filteredPosts = [];

        postsSnapshot.forEach((doc) => {
          const post = { id: doc.id, ...doc.data() };

          // Normalizar datos para búsqueda
          const normalizedTitle = normalizeText(post.title);
          const normalizedContent = normalizeText(post.content);

          const matchesTitle = normalizedTitle.includes(normalizedSearchTerm);
          const matchesContent =
            normalizedContent.includes(normalizedSearchTerm);

          if (matchesTitle || matchesContent) {
            filteredPosts.push({
              ...post,
              highlightTitle: post.title,
              highlightContent: post.content,
            });
          }
        });

        // 2. Buscar comunidades
        const forumsQuery = query(
          collection(db, "forums"),
          where("isDeleted", "==", false),
          where("status", "==", "active"),
          limit(25)
        );
        const forumsSnapshot = await getDocs(forumsQuery);
        const filteredForums = [];

        forumsSnapshot.forEach((doc) => {
          const forum = { id: doc.id, ...doc.data() };

          // Normalizar datos para búsqueda
          const normalizedName = normalizeText(forum.name);
          const normalizedDesc = normalizeText(forum.description);

          const matchesName = normalizedName.includes(normalizedSearchTerm);
          const matchesDesc = normalizedDesc.includes(normalizedSearchTerm);

          if (matchesName || matchesDesc) {
            filteredForums.push({
              ...forum,
              highlightName: forum.name,
              highlightDescription: forum.description,
            });
          }
        });

        // 3. Buscar usuarios
        const usersQuery = query(collection(db, "users"), limit(35));
        const usersSnapshot = await getDocs(usersQuery);
        const filteredUsers = [];

        usersSnapshot.forEach((doc) => {
          const user = { id: doc.id, ...doc.data() };

          // Normalizar datos para búsqueda
          const email = user.email?.toLowerCase() || "";
          const name = normalizeText(user.name?.name || "");
          const lastName = normalizeText(user.name?.apellidopat || "");
          const fullName = `${name} ${lastName}`.trim();
          const specialty = normalizeText(
            user.professionalInfo?.specialty || ""
          );

          const normalizedEmail = normalizeText(email);
          const normalizedFullName = normalizeText(fullName);

          const matchesEmail = normalizedEmail.includes(normalizedSearchTerm);
          const matchesName =
            name.includes(normalizedSearchTerm) ||
            lastName.includes(normalizedSearchTerm) ||
            normalizedFullName.includes(normalizedSearchTerm);
          const matchesSpecialty = specialty.includes(normalizedSearchTerm);

          if (matchesEmail || matchesName || matchesSpecialty) {
            filteredUsers.push({
              ...user,
              userName: user.name
                ? `${user.name.name || ""} ${
                    user.name.apellidopat || ""
                  }`.trim()
                : user.email || "Usuario",
              highlightSpecialty: user.professionalInfo?.specialty,
            });
          }
        });

        setResults({
          publicaciones: filteredPosts,
          comunidades: filteredForums,
          usuarios: filteredUsers,
        });
      } catch (error) {
        console.error("Error en búsqueda:", error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Efecto para búsqueda cuando cambia el query
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await performSearch(searchQuery);
    setRefreshing(false);
  }, [searchQuery, performSearch]);

  // Renderizar resultados según pestaña activa
  const renderResults = () => {
    const currentResults = results[activeTab];

    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2a55ff" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.searchIconContainer}>
            <IconButton icon="magnify" size={80} iconColor="#dbeafe" />
          </View>
          <Text style={styles.emptyTitle}>Buscar en TheHeartCloud</Text>
          <Text style={styles.emptyText}>
            Encuentra publicaciones, comunidades y usuarios médicos
          </Text>
          <View style={styles.searchTips}>
            <Text style={styles.tipsTitle}>Ejemplos de búsqueda:</Text>
            <View style={styles.tipRow}>
              <View style={styles.tipBadge}>
                <Text style={styles.tipText}>cardiología</Text>
              </View>
              <View style={styles.tipBadge}>
                <Text style={styles.tipText}>pediatria</Text>
              </View>
            </View>
            <View style={styles.tipRow}>
              <View style={styles.tipBadge}>
                <Text style={styles.tipText}>diabetes</Text>
              </View>
              <View style={styles.tipBadge}>
                <Text style={styles.tipText}>cirugia</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (currentResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.noResultsIcon}>
            <IconButton
              icon="alert-circle-outline"
              size={64}
              iconColor="#cbd5e1"
            />
          </View>
          <Text style={styles.emptyTitle}>
            No se encontraron{" "}
            {activeTab === "publicaciones"
              ? "publicaciones"
              : activeTab === "comunidades"
              ? "comunidades"
              : "usuarios"}
          </Text>
          <Text style={styles.emptyText}>
            Intenta con otros términos de búsqueda
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearButtonText}>Limpiar búsqueda</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case "publicaciones":
        return renderPosts();
      case "comunidades":
        return renderForums();
      case "usuarios":
        return renderUsers();
      default:
        return null;
    }
  };

  const renderPosts = () => (
    <View style={styles.resultsList}>
      <Text style={styles.resultsCount}>
        {results.publicaciones.length} publicación
        {results.publicaciones.length !== 1 ? "es" : ""} encontrada
        {results.publicaciones.length !== 1 ? "s" : ""}
      </Text>
      {results.publicaciones.map((post) => (
        <TouchableOpacity
          key={post.id}
          style={styles.resultCard}
          onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
        >
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.postHeader}>
                <View style={styles.postTypeIndicator}>
                  <Text style={styles.postTypeText}>PUBLICACIÓN</Text>
                </View>
                <Text style={styles.postTitle} numberOfLines={2}>
                  {post.highlightTitle || "Sin título"}
                </Text>
                <Text style={styles.postContent} numberOfLines={3}>
                  {post.highlightContent?.substring(0, 150)}...
                </Text>
              </View>
              <View style={styles.postFooter}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <IconButton icon="comment" size={14} iconColor="#6b7280" />
                    <Text style={styles.statText}>
                      {post.stats?.commentCount || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <IconButton icon="heart" size={14} iconColor="#6b7280" />
                    <Text style={styles.statText}>
                      {post.likes?.length || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderForums = () => (
    <View style={styles.resultsList}>
      <Text style={styles.resultsCount}>
        {results.comunidades.length} comunidad
        {results.comunidades.length !== 1 ? "es" : ""} encontrada
        {results.comunidades.length !== 1 ? "s" : ""}
      </Text>
      {results.comunidades.map((forum) => (
        <TouchableOpacity
          key={forum.id}
          style={styles.resultCard}
          onPress={() =>
            navigation.navigate("Forum", { forum, forumId: forum.id })
          }
        >
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.forumHeader}>
                <View style={styles.forumTypeIndicator}>
                  <Text style={styles.forumTypeText}>COMUNIDAD</Text>
                </View>
                <Text style={styles.forumName} numberOfLines={1}>
                  {forum.highlightName}
                </Text>
                <Text style={styles.forumDescription} numberOfLines={2}>
                  {forum.highlightDescription || "Sin descripción"}
                </Text>
              </View>
              <View style={styles.forumFooter}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Miembros</Text>
                    <Text style={styles.statNumber}>
                      {forum.memberCount || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Publicaciones</Text>
                    <Text style={styles.statNumber}>
                      {forum.postCount || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.resultsList}>
      <Text style={styles.resultsCount}>
        {results.usuarios.length} usuario
        {results.usuarios.length !== 1 ? "s" : ""} encontrado
        {results.usuarios.length !== 1 ? "s" : ""}
      </Text>
      {results.usuarios.map((user) => {
        const isCurrentUser = user.id === auth.currentUser?.uid;

        return (
          <TouchableOpacity
            key={user.id}
            style={styles.resultCard}
            onPress={() => navigation.navigate("Profile", { userId: user.id })}
            disabled={isCurrentUser}
          >
            <Card
              style={[styles.card, isCurrentUser && styles.currentUserCard]}
            >
              <Card.Content>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatarContainer}>
                    {user.photoURL ? (
                      <Avatar.Image
                        source={{ uri: user.photoURL }}
                        size={56}
                        style={styles.userAvatar}
                      />
                    ) : (
                      <Avatar.Text
                        size={56}
                        label={user.userName?.charAt(0).toUpperCase() || "U"}
                        style={styles.avatarPlaceholder}
                      />
                    )}
                    {isCurrentUser && (
                      <View style={styles.currentUserBadge}>
                        <Text style={styles.currentUserBadgeText}>Tú</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.userName}
                      </Text>
                      {isCurrentUser && (
                        <View style={styles.youIndicator}>
                          <Text style={styles.youText}>(Tú)</Text>
                        </View>
                      )}
                    </View>
                    {user.highlightSpecialty && (
                      <Text style={styles.userSpecialty} numberOfLines={1}>
                        {user.highlightSpecialty}
                      </Text>
                    )}
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar publicaciones, comunidades, usuarios..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor="#2a55ff"
            loading={loading}
            autoFocus={true}
            maxLength={100}
          />
        </View>
      </View>

      {/* Tabs de filtro - SIMPLIFICADOS sin iconos */}
      <View style={styles.tabsContainer}>
        {searchTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
            {results[tab.id].length > 0 && (
              <View
                style={[
                  styles.resultCountBadge,
                  activeTab === tab.id && styles.activeResultCountBadge,
                ]}
              >
                <Text style={styles.resultCountText}>
                  {results[tab.id].length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Resultados */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderResults()}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 50,
  },
  searchInput: {
    fontSize: 15,
    color: "#1e293b",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    flexDirection: "row",
    gap: 6,
  },
  activeTab: {
    borderBottomColor: "#2a55ff",
    backgroundColor: "#f8fafc",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#2a55ff",
    fontWeight: "700",
  },
  resultCountBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeResultCountBadge: {
    backgroundColor: "#2a55ff",
  },
  resultCountText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  activeResultCountBadge: {
    backgroundColor: "#2a55ff",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  searchIconContainer: {
    marginBottom: 20,
  },
  noResultsIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  searchTips: {
    backgroundColor: "#f1f5f9",
    padding: 20,
    borderRadius: 12,
    width: "100%",
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 16,
    textAlign: "center",
  },
  tipRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  tipBadge: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tipText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  clearButton: {
    backgroundColor: "#2a55ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  clearButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  resultsList: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 16,
    paddingLeft: 4,
  },
  resultCard: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  currentUserCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbeafe",
    borderWidth: 1,
  },
  // Estilos para posts
  postHeader: {
    marginBottom: 12,
  },
  postTypeIndicator: {
    backgroundColor: "#eff6ff",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  postTypeText: {
    fontSize: 11,
    color: "#2a55ff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 24,
  },
  postContent: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: -8,
  },
  // Estilos para foros
  forumHeader: {
    marginBottom: 12,
  },
  forumTypeIndicator: {
    backgroundColor: "#f0f9ff",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  forumTypeText: {
    fontSize: 11,
    color: "#0ea5e9",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  forumName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  forumDescription: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  forumFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginRight: 6,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  // Estilos para usuarios
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  userAvatar: {
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: "#2a55ff",
    borderRadius: 28,
  },
  currentUserBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#2a55ff",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "white",
  },
  currentUserBadgeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginRight: 8,
  },
  youIndicator: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youText: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600",
  },
  userSpecialty: {
    fontSize: 15,
    color: "#2a55ff",
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "#64748b",
  },
  bottomSpacing: {
    height: 100,
  },
});

export default SearchScreen;
