import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  getDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const usePosts = (forumId, postsLimit = 20) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!forumId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const currentUser = auth.currentUser;

    // Función para verificar permisos
    const checkUserPermissions = async () => {
      if (!currentUser) return false;

      try {
        const forumRef = doc(db, "forums", forumId);
        const forumDoc = await getDoc(forumRef);

        if (forumDoc.exists()) {
          const forumData = forumDoc.data();
          const isOwner = forumData.ownerId === currentUser.uid;
          const isModerator =
            forumData.moderators && forumData.moderators[currentUser.uid];

          return isOwner || isModerator;
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
      }

      return false;
    };

    // Función para configurar el listener
    const setupPostsListener = async () => {
      try {
        const canSeePendingPosts = await checkUserPermissions();

        let q;
        if (canSeePendingPosts) {
          // Moderadores y dueños pueden ver todos los posts
          q = query(
            collection(db, "posts"),
            where("forumId", "==", forumId),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(postsLimit)
          );
        } else {
          // Usuarios normales solo ven posts activos
          q = query(
            collection(db, "posts"),
            where("forumId", "==", forumId),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(postsLimit)
          );
        }

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            try {
              const postsData = snapshot.docs.map((postDoc) => {
                const postData = postDoc.data();

                // Cargar datos básicos del autor
                const loadAuthorData = async () => {
                  if (postData.authorId) {
                    try {
                      const authorDoc = await getDoc(
                        doc(db, "users", postData.authorId)
                      );
                      if (authorDoc.exists()) {
                        return authorDoc.data();
                      }
                    } catch (error) {
                      console.error("Error cargando autor:", error);
                    }
                  }
                  return null;
                };

                return {
                  id: postDoc.id,
                  ...postData,
                  likes: postData.likes || [],
                  dislikes: postData.dislikes || [],
                  images: postData.images || [],
                  status: postData.status || "active",
                  stats: {
                    commentCount: postData.stats?.commentCount || 0,
                    viewCount: postData.stats?.viewCount || 0,
                    likeCount: postData.likes?.length || 0,
                    dislikeCount: postData.dislikes?.length || 0,
                  },
                  // Dejar espacio para datos de autor que se cargarán después
                  authorData: null,
                };
              });

              setPosts(postsData);
              setLoading(false);

              // Cargar datos de autores para cada post (asíncrono)
              postsData.forEach(async (post, index) => {
                if (post.authorId) {
                  try {
                    const authorDoc = await getDoc(
                      doc(db, "users", post.authorId)
                    );
                    if (authorDoc.exists()) {
                      const authorData = authorDoc.data();

                      // Formatear nombre del autor
                      const authorName = authorData.name
                        ? `${authorData.name.name || ""} ${
                            authorData.name.apellidopat || ""
                          }`.trim()
                        : authorData.email || "Usuario";

                      setPosts((prevPosts) => {
                        const newPosts = [...prevPosts];
                        if (newPosts[index]) {
                          newPosts[index] = {
                            ...newPosts[index],
                            authorData,
                            authorName,
                            authorPhoto: authorData.photoURL,
                            authorSpecialty:
                              authorData.professionalInfo?.specialty,
                            authorEmail: authorData.email,
                          };
                        }
                        return newPosts;
                      });
                    }
                  } catch (error) {
                    console.error("Error cargando datos del autor:", error);
                  }
                }
              });
            } catch (err) {
              console.error("Error procesando posts:", err);
              setError("Error cargando publicaciones");
              setLoading(false);
            }
          },
          (error) => {
            console.error("Error en conexión de posts:", error);
            setError("Error de conexión");
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error configurando listener:", error);
        setError("Error de configuración");
        setLoading(false);
        return () => {}; // Retornar función vacía como fallback
      }
    };

    let unsubscribe = () => {};
    setupPostsListener().then((unsubFn) => {
      if (unsubFn) {
        unsubscribe = unsubFn;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [forumId, postsLimit]);

  return { posts, loading, error };
};
