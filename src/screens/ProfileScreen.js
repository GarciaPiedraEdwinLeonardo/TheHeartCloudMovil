import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../config/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfileStats from "../components/profile/ProfileStats";
import CommunityList from "../components/profile/CommunityList";
import PostList from "../components/profile/PostList";
import CommentList from "../components/profile/CommentList";

const { width, height } = Dimensions.get("window");

const ProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [activeTab, setActiveTab] = useState("posts");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isOwnProfile = !userId || userId === auth.currentUser?.uid;
  const profileUserId = userId || auth.currentUser?.uid;

  const { userData, loading, error, refetch, updateProfilePhoto } =
    useUserProfile(profileUserId);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCommunityPress = (community) => {
    navigation.navigate("Forum", { forum: community, forumId: community.id });
  };

  const handlePostPress = (post) => {
    navigation.navigate("PostDetail", { postId: post.id });
  };

  const handleCommentClick = (post) => {
    navigation.navigate("PostDetail", {
      postId: post.id,
      focusComments: true,
    });
  };

  const handleAuthorPress = (authorId) => {
    if (authorId === auth.currentUser?.uid) return;
    navigation.navigate("Profile", { userId: authorId });
  };

  const handleForumPress = (forumId) => {
    navigation.navigate("Forum", { forumId });
  };

  const handlePhotoUpdated = (newPhotoUrl) => {
    if (updateProfilePhoto) {
      updateProfilePhoto(newPhotoUrl);
    }
    setTimeout(() => {
      refetch();
    }, 1000);
  };

  // Animación para el header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  const renderTabContent = () => {
    if (!userData) return null;

    switch (activeTab) {
      case "posts":
        return (
          <View style={styles.tabContent}>
            <PostList
              posts={userData.posts || []}
              onPostPress={handlePostPress}
              onCommentClick={handleCommentClick}
              onAuthorPress={handleAuthorPress}
              onForumPress={handleForumPress}
              onPostUpdated={() => refetch()}
              onPostDeleted={() => refetch()}
            />
          </View>
        );
      case "comments":
        return (
          <View style={styles.tabContent}>
            <CommentList
              comments={userData.comments || []}
              onCommentPress={handlePostPress}
            />
          </View>
        );
      case "communities":
        return (
          <View style={styles.tabContent}>
            <CommunityList
              communities={userData.communities || []}
              onCommunityPress={handleCommunityPress}
              scrollEnabled={false}
            />
          </View>
        );
      default:
        return null;
    }
  };

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a55ff" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <IconButton icon="alert-circle" size={48} iconColor="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header fijo con botón de volver */}
      <Animated.View style={[styles.screenHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonHeader}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Perfil</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      {/* ScrollView principal */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const scrollEvent = Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          );
          scrollEvent(event);
        }}
      >
        {/* Header del perfil */}
        <ProfileHeader
          userData={userData}
          onShowStats={() => setShowStatsModal(true)}
          isOwnProfile={isOwnProfile}
          onPhotoUpdated={handlePhotoUpdated}
        />

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Contenido de la pestaña activa */}
        {renderTabContent()}

        {/* Espacio para el bottom navigation */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de estadísticas */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ProfileStats
              stats={userData.stats}
              onClose={() => setShowStatsModal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screenHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    zIndex: 100,
  },
  backButtonHeader: {
    marginRight: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    marginTop: 106, // Altura del header fijo (50 + 12 + 44 aprox)
  },
  tabContent: {
    minHeight: 400, // Altura mínima para el contenido
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#2a55ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: "80%",
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#64748b",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width - 40,
    height: height * 0.8,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "white",
    elevation: 10,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ProfileScreen;
