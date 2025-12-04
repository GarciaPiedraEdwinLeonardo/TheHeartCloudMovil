// src/hooks/useUserProfile.js
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const useUserProfile = (userId) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obtener datos básicos del usuario
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        throw new Error("Usuario no encontrado");
      }

      const userBasicData = userDoc.data();

      // 2. Formatear nombre completo
      const nameData = userBasicData.name || {};
      const fullName = `${nameData.name || ""} ${nameData.apellidopat || ""} ${
        nameData.apellidomat || ""
      }`.trim();

      // 3. Obtener publicaciones del usuario
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", userId),
        where("status", "==", "active")
      );
      const postsSnapshot = await getDocs(postsQuery);
      const posts = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 4. Obtener comentarios del usuario
      const commentsQuery = query(
        collection(db, "comments"),
        where("authorId", "==", userId),
        where("status", "==", "active")
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const comments = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 5. Obtener comunidades (foros) donde participa
      const userCommunities = userBasicData.joinedForums || [];

      // 6. Formatear datos completos según tu estructura
      const formattedData = {
        id: userDoc.id,
        email: userBasicData.email,
        // Información personal
        nombreCompleto: fullName || "Usuario",
        name: nameData.name || "",
        apellidopat: nameData.apellidopat || "",
        apellidomat: nameData.apellidomat || "",
        // Información profesional
        especialidad:
          userBasicData.professionalInfo?.specialty || "No especificada",
        specialty:
          userBasicData.professionalInfo?.specialty || "No especificada",
        professionalInfo: userBasicData.professionalInfo || {},
        // Foto
        photoURL:
          userBasicData.profileMedia || "https://via.placeholder.com/100",
        // Fechas
        joinDate: userBasicData.joinDate,
        fechaRegistro: userBasicData.joinDate,
        lastLogin: userBasicData.lastLogin,
        // Role y verificación
        role: userBasicData.role || "unverified",
        emailVerified: userBasicData.emailVerified || false,
        verificationStatus:
          userBasicData.professionalInfo?.verificationStatus || "unverified",
        // Estadísticas
        estadisticas: {
          publicaciones: userBasicData.stats?.postCount || posts.length,
          comentarios: userBasicData.stats?.commentCount || comments.length,
          temasParticipacion:
            userBasicData.stats?.joinedForumsCount || userCommunities.length,
          aura: userBasicData.stats?.aura || 0,
          contributionCount: userBasicData.stats?.contributionCount || 0,
        },
        stats: {
          postsCount: userBasicData.stats?.postCount || posts.length,
          commentsCount: userBasicData.stats?.commentCount || comments.length,
          communitiesCount:
            userBasicData.stats?.joinedForumsCount || userCommunities.length,
          aura: userBasicData.stats?.aura || 0,
          contributionCount: userBasicData.stats?.contributionCount || 0,
          daysActive: Math.floor(
            (new Date() - (userBasicData.joinDate?.toDate() || new Date())) /
              (1000 * 60 * 60 * 24)
          ),
        },
        // Datos adicionales
        posts,
        comments,
        communities: userCommunities,
        // Suspensión
        suspension: userBasicData.suspension || { isSuspended: false },
      };

      setUserData(formattedData);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError(err.message || "Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  return {
    userData,
    loading,
    error,
    refetch: fetchUserProfile,
  };
};
