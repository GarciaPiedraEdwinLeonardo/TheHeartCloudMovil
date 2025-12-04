import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";

const ProfileTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "posts", label: "Publicaciones", icon: "file-document" },
    { id: "comments", label: "Comentarios", icon: "comment" },
    { id: "communities", label: "Comunidades", icon: "forum" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <IconButton
              icon={tab.icon}
              size={18}
              iconColor={activeTab === tab.id ? "#2a55ff" : "#64748b"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
    overflow: "hidden",
  },
  tabsContainer: {
    flexDirection: "row",
    height: 60,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#2a55ff",
    backgroundColor: "#f8fafc",
  },
  tabIcon: {
    margin: 0,
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    flexShrink: 1,
  },
  activeTabText: {
    color: "#2a55ff",
  },
});

export default ProfileTabs;
