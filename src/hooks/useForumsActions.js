import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const useForumActions = () => {
  // Verificar si usuario está baneado
  const isUserBannedFromForum = async (forumId, userId) => {
    try {
      const forumRef = doc(db, "forums", forumId);
      const forumDoc = await getDoc(forumRef);

      if (!forumDoc.exists()) return false;

      const forumData = forumDoc.data();
      const bannedUsers = forumData.bannedUsers || [];

      // Buscar usuario en la lista de baneados
      const userBan = bannedUsers.find(
        (ban) => ban.userId === userId && ban.isActive !== false
      );

      if (!userBan) return false;

      // Verificar si el baneo ha expirado
      if (userBan.duration !== "permanent") {
        const banDate =
          userBan.bannedAt?.toDate?.() || new Date(userBan.bannedAt);
        const now = new Date();
        const daysDiff = Math.floor((now - banDate) / (1000 * 60 * 60 * 24));

        let maxDays = 0;
        switch (userBan.duration) {
          case "1d":
            maxDays = 1;
            break;
          case "7d":
            maxDays = 7;
            break;
          case "30d":
            maxDays = 30;
            break;
          default:
            maxDays = 0;
        }

        if (daysDiff >= maxDays) {
          // Baneo expirado, remover de la lista
          await updateDoc(forumRef, {
            bannedUsers: bannedUsers.filter((ban) => ban.userId !== userId),
          });
          return false;
        }
      }

      return true; // Usuario está baneado
    } catch (error) {
      console.error("Error verificando baneo:", error);
      return false;
    }
  };

  // Función auxiliar para actualizar estadísticas del usuario
  const updateUserStats = async (userId, forumId, action) => {
    try {
      const userRef = doc(db, "users", userId);
      const updates = {};

      switch (action) {
        case "forum_joined":
          updates["stats.joinedForumsCount"] = increment(1);
          updates["joinedForums"] = arrayUnion(forumId);
          break;
        case "forum_left":
          updates["stats.joinedForumsCount"] = increment(-1);
          updates["joinedForums"] = arrayRemove(forumId);
          break;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    } catch (error) {
      console.error("Error actualizando estadísticas:", error);
    }
  };

  // Obtener datos específicos de una comunidad
  const getForumData = async (forumId) => {
    try {
      const forumRef = doc(db, "forums", forumId);
      const forumDoc = await getDoc(forumRef);

      if (!forumDoc.exists()) {
        return { success: false, error: "Comunidad no encontrada" };
      }

      const forumData = forumDoc.data();

      return {
        success: true,
        data: {
          id: forumDoc.id,
          ...forumData,
          memberCount: forumData.memberCount || 0,
          postCount: forumData.postCount || 0,
          bannedUsers: forumData.bannedUsers || [],
          rules:
            forumData.rules ||
            "• Respeto hacia todos los miembros\n• Contenido médico verificado\n• No spam ni autopromoción\n• Confidencialidad de pacientes\n• Lenguaje profesional",
        },
      };
    } catch (error) {
      console.error("Error obteniendo datos de comunidad:", error);
      return { success: false, error: error.message };
    }
  };

  // Verificar si usuario es miembro y su rol
  const checkUserMembership = async (forumId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return { isMember: false, role: null };

      const forumRef = doc(db, "forums", forumId);
      const forumDoc = await getDoc(forumRef);

      if (!forumDoc.exists()) return { isMember: false, role: null };

      const forumData = forumDoc.data();

      // Verificar si es miembro
      const isMember = forumData.members?.includes(currentUser.uid) || false;

      // Determinar rol
      let role = "member";
      if (forumData.ownerId === currentUser.uid) {
        role = "owner";
      } else if (
        forumData.moderators &&
        forumData.moderators[currentUser.uid]
      ) {
        role = "moderator";
      }

      return { isMember, role };
    } catch (error) {
      console.error("Error verificando membresía:", error);
      return { isMember: false, role: null };
    }
  };

  // Unirse a comunidad - VERSIÓN MÓVIL SIMPLIFICADA
  const joinForum = async (forumId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: "Debes iniciar sesión para unirte a una comunidad",
        };
      }

      // Obtener datos del usuario para verificar rol
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      // Verificar si el usuario está verificado (rol unverified no puede unirse)
      if (userData?.role === "unverified") {
        return {
          success: false,
          error:
            "Solo usuarios verificados pueden unirse a comunidades. Por favor, verifica tu cuenta primero.",
        };
      }

      // VERIFICAR SI EL USUARIO ESTÁ BANEADO
      const isBanned = await isUserBannedFromForum(forumId, currentUser.uid);
      if (isBanned) {
        return {
          success: false,
          error: "No puedes unirte a esta comunidad porque has sido baneado",
        };
      }

      const forumRef = doc(db, "forums", forumId);
      const forumDoc = await getDoc(forumRef);

      if (!forumDoc.exists()) {
        return { success: false, error: "Comunidad no encontrada" };
      }

      const forumData = forumDoc.data();

      // Verificar que no sea ya miembro
      if (forumData.members && forumData.members.includes(currentUser.uid)) {
        return { success: false, error: "Ya eres miembro de esta comunidad" };
      }

      // Verificar que no tenga solicitud pendiente
      if (
        forumData.pendingMembers &&
        forumData.pendingMembers[currentUser.uid]
      ) {
        return {
          success: true,
          requiresApproval: true,
          message: "Solicitud enviada. Espera la aprobación de un moderador.",
        };
      }

      // Si requiere aprobación, agregar a pendientes
      if (forumData.membershipSettings?.requiresApproval) {
        await updateDoc(forumRef, {
          [`pendingMembers.${currentUser.uid}`]: {
            requestedAt: serverTimestamp(),
            userEmail: userData?.email || "Email no disponible",
            userName: userData?.name
              ? `${userData.name.name || ""} ${
                  userData.name.apellidopat || ""
                }`.trim()
              : "Usuario",
            userRole: userData?.role || "user",
          },
        });

        return {
          success: true,
          requiresApproval: true,
          message: "Solicitud enviada. Espera la aprobación de un moderador.",
        };
      } else {
        // Entrada libre - unirse directamente
        await updateDoc(forumRef, {
          members: arrayUnion(currentUser.uid),
          memberCount: increment(1),
        });

        // Actualizar estadísticas del usuario
        await updateUserStats(currentUser.uid, forumId, "forum_joined");

        return {
          success: true,
          requiresApproval: false,
          message: "Te has unido a la comunidad exitosamente",
        };
      }
    } catch (error) {
      console.error("Error uniéndose a comunidad:", error);
      return { success: false, error: error.message };
    }
  };

  // Abandonar comunidad - VERSIÓN MÓVIL SIMPLIFICADA
  const leaveForum = async (forumId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: "Debes iniciar sesión" };
      }

      const forumRef = doc(db, "forums", forumId);
      const forumDoc = await getDoc(forumRef);

      if (!forumDoc.exists()) {
        return { success: false, error: "Comunidad no encontrada" };
      }

      const forumData = forumDoc.data();

      // Verificar que es miembro
      if (!forumData.members || !forumData.members.includes(currentUser.uid)) {
        return { success: false, error: "No eres miembro de esta comunidad" };
      }

      // No permitir que el dueño abandone su propia comunidad
      if (forumData.ownerId === currentUser.uid) {
        return {
          success: false,
          error: "El dueño no puede abandonar la comunidad",
        };
      }

      // Actualizar el foro
      await updateDoc(forumRef, {
        members: arrayRemove(currentUser.uid),
        memberCount: increment(-1),
      });

      // Actualizar estadísticas del usuario
      await updateUserStats(currentUser.uid, forumId, "forum_left");

      return {
        success: true,
        message: "Has abandonado la comunidad exitosamente",
      };
    } catch (error) {
      console.error("Error abandonando comunidad:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    // Funciones principales
    joinForum,
    leaveForum,
    checkUserMembership,
    getForumData,
    isUserBannedFromForum,

    // Funciones no disponibles en móvil (solo para compatibilidad)
    createForum: () => ({ success: false, error: "No disponible en móvil" }),
    addModerator: () => ({ success: false, error: "No disponible en móvil" }),
    removeModerator: () => ({
      success: false,
      error: "No disponible en móvil",
    }),
    approveMember: () => ({ success: false, error: "No disponible en móvil" }),
    rejectMember: () => ({ success: false, error: "No disponible en móvil" }),
    updateMembershipSettings: () => ({
      success: false,
      error: "No disponible en móvil",
    }),
  };
};
