import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const useUserPermissions = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canComment: false,
    canReply: false,
    canEdit: false,
    canDelete: false,
    canModerate: false,
    isVerified: false,
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setPermissions({
            canComment: false,
            canReply: false,
            canEdit: false,
            canDelete: false,
            canModerate: false,
            isVerified: false,
          });
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);

          const isVerified = data.role !== "unverified";
          const canComment =
            isVerified && ["doctor", "moderator", "admin"].includes(data.role);
          const canReply = canComment; // Misma regla
          const canEdit = false; // Se calcula por comentario específico
          const canDelete = false; // Se calcula por comentario específico
          const canModerate = ["moderator", "admin"].includes(data.role);

          setPermissions({
            canComment,
            canReply,
            canEdit,
            canDelete,
            canModerate,
            isVerified,
          });
        }
      } catch (error) {
        console.error("Error cargando permisos del usuario:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Función para verificar permisos específicos en un comentario
  const checkCommentPermissions = (commentAuthorId, forumData = null) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userData) {
      return {
        isAuthor: false,
        canEdit: false,
        canDelete: false,
        canModerateThis: false,
      };
    }

    const isAuthor = currentUser.uid === commentAuthorId;
    const isModeratorOrAdmin = ["moderator", "admin"].includes(userData.role);

    // Verificar si es moderador del foro
    let isForumModerator = false;
    if (forumData && forumData.moderators) {
      isForumModerator = forumData.moderators[currentUser.uid] === true;
    }
    const isForumOwner = forumData && forumData.ownerId === currentUser.uid;

    const canEdit = isAuthor;
    const canDelete =
      isAuthor || isModeratorOrAdmin || isForumModerator || isForumOwner;
    const canModerateThis =
      isModeratorOrAdmin || isForumModerator || isForumOwner;

    return {
      isAuthor,
      canEdit,
      canDelete,
      canModerateThis,
      isModeratorOrAdmin,
      isForumModerator,
      isForumOwner,
    };
  };

  return {
    userData,
    permissions,
    loading,
    checkCommentPermissions,
  };
};
