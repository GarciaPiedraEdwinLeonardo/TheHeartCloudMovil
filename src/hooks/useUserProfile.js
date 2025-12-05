import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const useUserProfile = (userId) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Cargar datos básicos del usuario
      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        throw new Error("Usuario no encontrado");
      }

      const userBasicData = userDoc.data();
      console.log("📊 Datos básicos del usuario:", userBasicData);

      // 2. Formatear nombre completo
      const nameData = userBasicData.name || {};
      const fullName = `${nameData.name || ""} ${nameData.apellidopat || ""} ${
        nameData.apellidomat || ""
      }`.trim();

      // 3. Cargar publicaciones del usuario
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const postsSnapshot = await getDocs(postsQuery);

      const postsData = [];
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();

        // Obtener nombre del foro
        let forumName = "General";
        if (postData.forumId) {
          try {
            const forumDoc = await getDoc(doc(db, "forums", postData.forumId));
            if (forumDoc.exists()) {
              forumName = forumDoc.data().name || "Foro";
            }
          } catch (error) {
            console.error("Error cargando foro:", error);
          }
        }

        postsData.push({
          id: postDoc.id,
          ...postData,
          tema: forumName,
          fecha: postData.createdAt,
          likes: postData.likes || [],
          titulo: postData.title || postData.content?.substring(0, 50) + "...",
          contenido: postData.content,
          stats: postData.stats || { commentCount: 0, likeCount: 0 },
        });
      }

      console.log(`📝 Publicaciones cargadas: ${postsData.length}`);

      // 4. Cargar comentarios del usuario
      const commentsQuery = query(
        collection(db, "comments"),
        where("authorId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const commentsSnapshot = await getDocs(commentsQuery);

      const commentsData = [];
      for (const commentDoc of commentsSnapshot.docs) {
        const commentData = commentDoc.data();

        // Obtener información del post
        let postTitle = "Publicación no disponible";
        let postAuthor = "Usuario";
        let forumName = "General";

        if (commentData.postId) {
          try {
            const postDoc = await getDoc(doc(db, "posts", commentData.postId));
            if (postDoc.exists()) {
              const postData = postDoc.data();
              postTitle =
                postData.title ||
                postData.content?.substring(0, 50) + "..." ||
                "Sin título";

              // Obtener autor del post
              if (postData.authorId) {
                const authorDoc = await getDoc(
                  doc(db, "users", postData.authorId)
                );
                if (authorDoc.exists()) {
                  const authorData = authorDoc.data();
                  const authorName = authorData.name || {};
                  postAuthor =
                    `${authorName.name || ""} ${
                      authorName.apellidopat || ""
                    }`.trim() || "Usuario";
                }
              }

              // Obtener foro del post
              if (postData.forumId) {
                const forumDoc = await getDoc(
                  doc(db, "forums", postData.forumId)
                );
                if (forumDoc.exists()) {
                  forumName = forumDoc.data().name || "Foro";
                }
              }
            }
          } catch (error) {
            console.error("Error cargando datos del post:", error);
          }
        }

        commentsData.push({
          id: commentDoc.id,
          ...commentData,
          publicacionTitulo: postTitle,
          usuarioPost: postAuthor,
          tema: forumName,
          fecha: commentData.createdAt,
          usuarioComentarista: fullName || "Usuario",
          rolComentarista:
            userBasicData.professionalInfo?.specialty || "Médico",
          contenido: commentData.content || "",
        });
      }

      console.log(`💬 Comentarios cargados: ${commentsData.length}`);

      // 5. Cargar foros del usuario
      const userForumsData = [];
      const joinedForums = userBasicData.joinedForums || [];

      // Cargar información de cada foro
      for (const forumId of joinedForums) {
        try {
          const forumDoc = await getDoc(doc(db, "forums", forumId));
          if (forumDoc.exists()) {
            const forumData = forumDoc.data();

            // Contar publicaciones del usuario en este foro
            const userPostsInForum = postsData.filter(
              (post) => post.forumId === forumId
            );

            // Contar comentarios del usuario en posts de este foro
            const userCommentsInForum = commentsData.filter((comment) => {
              // Buscar el post del comentario para obtener el forumId
              const commentPost = postsData.find(
                (post) => post.id === comment.postId
              );
              return commentPost && commentPost.forumId === forumId;
            });

            userForumsData.push({
              id: forumId,
              nombre: forumData.name || "Foro sin nombre",
              description: forumData.description || "Sin descripción",
              fechaUnion: userBasicData.joinDate,
              publicaciones: userPostsInForum.length,
              comentarios: userCommentsInForum.length,
              memberCount: forumData.memberCount || 0,
              lastActivity:
                forumData.lastPostAt || forumData.createdAt || new Date(),
              image: forumData.image || forumData.photoURL || null,
            });
          } else {
            console.warn(`⚠️ Foro ${forumId} no encontrado`);
          }
        } catch (error) {
          console.error(`Error cargando foro ${forumId}:`, error);
        }
      }

      console.log(`👥 Foros cargados: ${userForumsData.length}`);

      // 6. Calcular estadísticas
      const calculateStatistics = () => {
        try {
          // Calcular días activos
          let daysActive = 1;
          if (userBasicData.joinDate) {
            let joinDate;

            if (userBasicData.joinDate.toDate) {
              joinDate = userBasicData.joinDate.toDate();
            } else if (userBasicData.joinDate instanceof Date) {
              joinDate = userBasicData.joinDate;
            } else if (typeof userBasicData.joinDate === "string") {
              joinDate = new Date(userBasicData.joinDate);
            } else if (typeof userBasicData.joinDate === "number") {
              joinDate = new Date(userBasicData.joinDate);
            }

            if (joinDate) {
              const today = new Date();
              const diffTime = Math.abs(today - joinDate);
              daysActive = Math.max(
                1,
                Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              );
            }
          }

          return {
            postsCount: postsData.length,
            commentsCount: commentsData.length,
            communitiesCount: userForumsData.length,
            aura: userBasicData.stats?.aura || 0,
            contributionCount: userBasicData.stats?.contributionCount || 0,
            daysActive: daysActive,
            // Estadísticas adicionales para compatibilidad
            publicaciones: postsData.length,
            comentarios: commentsData.length,
            temasParticipacion: userForumsData.length,
          };
        } catch (error) {
          console.error("Error calculando estadísticas:", error);
          return {
            postsCount: 0,
            commentsCount: 0,
            communitiesCount: 0,
            aura: 0,
            contributionCount: 0,
            daysActive: 1,
            publicaciones: 0,
            comentarios: 0,
            temasParticipacion: 0,
          };
        }
      };

      const stats = calculateStatistics();

      // 7. Formatear datos completos
      const formattedData = {
        // Información básica
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

        // Foto de perfil
        photoURL: userBasicData.photoURL || "https://via.placeholder.com/150",

        // Fechas
        joinDate: userBasicData.joinDate,
        fechaRegistro: userBasicData.joinDate,
        lastLogin: userBasicData.lastLogin,

        // Role y verificación
        role: userBasicData.role || "unverified",
        emailVerified: userBasicData.emailVerified || false,
        verificationStatus:
          userBasicData.professionalInfo?.verificationStatus || "unverified",

        // Suspensión
        suspension: userBasicData.suspension || { isSuspended: false },

        // Estadísticas (formato para React Native)
        stats: stats,

        // Estadísticas (formato para compatibilidad)
        estadisticas: {
          publicaciones: stats.publicaciones,
          comentarios: stats.comentarios,
          temasParticipacion: stats.temasParticipacion,
          aura: stats.aura,
          contributionCount: stats.contributionCount,
        },

        // Datos de actividad (formateados correctamente)
        posts: postsData,
        comments: commentsData,
        communities: userForumsData,

        // Datos originales para referencia
        _rawPosts: postsData.length,
        _rawComments: commentsData.length,
        _rawCommunities: userForumsData.length,
      };

      console.log("✅ Datos formateados:", {
        posts: formattedData.posts?.length || 0,
        comments: formattedData.comments?.length || 0,
        communities: formattedData.communities?.length || 0,
        photoURL: formattedData.photoURL,
      });

      setUserData(formattedData);
      return formattedData;
    } catch (err) {
      console.error("❌ Error cargando perfil:", err);
      setError(err.message || "Error al cargar el perfil");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  // Función para actualizar la foto localmente
  const updateProfilePhoto = (photoUrl) => {
    setUserData((prev) => {
      if (!prev) return prev;
      console.log("🔄 Actualizando foto localmente:", photoUrl);
      return {
        ...prev,
        photoURL: photoUrl,
      };
    });
  };

  return {
    userData,
    loading,
    error,
    refetch: fetchUserProfile,
    updateProfilePhoto,
  };
};
