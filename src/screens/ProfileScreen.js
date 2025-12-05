import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { IconButton, ActivityIndicator } from "react-native-paper";
import { auth } from "../config/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfileStats from "../components/profile/ProfileStats";
import CommunityList from "../components/profile/CommunityList";
import PublicationList from "../components/profile/PublicationList";
import CommentList from "../components/profile/CommentList";

const { width, height } = Dimensions.get("window");

const ProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [activeTab, setActiveTab] = useState("posts");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    console.log("Navegar a foro:", community);
  };

  const handlePostPress = (post) => {
    console.log("Navegar a post:", post);
  };

  const handlePhotoUpdated = (newPhotoUrl) => {
    if (updateProfilePhoto) {
      updateProfilePhoto(newPhotoUrl);
    }

    // Recargar datos después de un tiempo
    setTimeout(() => {
      refetch();
    }, 1000);
  };

  const renderTabContent = () => {
    if (!userData) return null;

    switch (activeTab) {
      case "posts":
        return (
          <PublicationList
            posts={userData.posts || []}
            onPostPress={handlePostPress}
          />
        );
      case "comments":
        return (
          <CommentList
            comments={userData.comments || []}
            onCommentPress={handlePostPress}
          />
        );
      case "communities":
        return (
          <CommunityList
            communities={userData.communities || []}
            onCommunityPress={handleCommunityPress}
          />
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
      {/* Header con botón de volver */}
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonHeader}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Perfil</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Contenido principal */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileHeader
          userData={userData}
          onShowStats={() => setShowStatsModal(true)}
          isOwnProfile={isOwnProfile}
          onPhotoUpdated={handlePhotoUpdated}
        />

        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <View style={styles.tabContentContainer}>{renderTabContent()}</View>

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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  tabContentContainer: {
    minHeight: 300,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bottomSpacing: {
    height: 80,
  },
});

export default ProfileScreen;
