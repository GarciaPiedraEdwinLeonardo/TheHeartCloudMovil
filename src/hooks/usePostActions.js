import { useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import cloudinaryConfig from "../config/cloudinary";

export const usePostActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función auxiliar para verificar permisos (solo autor)
  const checkPostPermissions = async (postId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Debes iniciar sesión");
    }

    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error("El post no existe");
    }

    const postData = postDoc.data();

    // Solo el autor puede modificar en la versión móvil
    if (postData.authorId !== currentUser.uid) {
      throw new Error("No tienes permiso para modificar esta publicación");
    }

    return { postData };
  };

  // Reaccionar a un post (like/dislike)
  const reactToPost = async (postId, reactionType) => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const userId = currentUser.uid;
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        throw new Error("El post no existe");
      }

      const postData = postDoc.data();
      const authorId = postData.authorId;
      const currentLikes = postData.likes || [];
      const currentDislikes = postData.dislikes || [];

      // Determinar cambios en el aura
      let auraChange = 0;
      const wasLiked = currentLikes.includes(userId);
      const wasDisliked = currentDislikes.includes(userId);

      // Calcular cambio en aura basado en reacción anterior y nueva
      if (reactionType === "like") {
        if (wasLiked) {
          // Quitar like: -1 al aura
          auraChange = -1;
        } else if (wasDisliked) {
          // Cambiar de dislike a like: +2 al aura
          auraChange = 2;
        } else {
          // Nuevo like: +1 al aura
          auraChange = 1;
        }
      } else if (reactionType === "dislike") {
        if (wasDisliked) {
          // Quitar dislike: +1 al aura
          auraChange = 1;
        } else if (wasLiked) {
          // Cambiar de like a dislike: -2 al aura
          auraChange = -2;
        } else {
          // Nuevo dislike: -1 al aura
          auraChange = -1;
        }
      } else if (reactionType === "remove") {
        // Remover todas las reacciones
        if (wasLiked) {
          auraChange = -1; // Se quita un like
        } else if (wasDisliked) {
          auraChange = 1; // Se quita un dislike
        }
      }

      // Usar batch para operación atómica
      const batch = writeBatch(db);

      // Actualizar reacciones del post
      if (reactionType === "like") {
        batch.update(postRef, {
          likes: arrayUnion(userId),
          dislikes: arrayRemove(userId),
        });
      } else if (reactionType === "dislike") {
        batch.update(postRef, {
          dislikes: arrayUnion(userId),
          likes: arrayRemove(userId),
        });
      } else if (reactionType === "remove") {
        batch.update(postRef, {
          likes: arrayRemove(userId),
          dislikes: arrayRemove(userId),
        });
      }

      // Actualizar aura del autor SOLO si hay cambio y no es el mismo usuario
      if (auraChange !== 0 && authorId !== userId) {
        const authorRef = doc(db, "users", authorId);
        batch.update(authorRef, {
          "stats.aura": increment(auraChange),
        });
      }

      await batch.commit();

      return { success: true, auraChange };
    } catch (err) {
      console.error("Error en reactToPost:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Editar un post
  const editPost = async (postId, updates) => {
    try {
      setLoading(true);
      setError(null);

      // Verificar permisos (solo autor puede editar)
      await checkPostPermissions(postId);

      const postRef = doc(db, "posts", postId);

      await updateDoc(postRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (err) {
      console.error("Error en editPost:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar comentarios del post
  const deletePostComments = async (postId) => {
    try {
      // Buscar todos los comentarios del post
      const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      const batch = writeBatch(db);

      // Eliminar cada comentario
      commentsSnapshot.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });

      await batch.commit();

      return { success: true, deletedComments: commentsSnapshot.size };
    } catch (error) {
      console.error("Error eliminando comentarios del post:", error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar estadísticas de usuarios que comentaron
  const updateUsersCommentStats = async (postId) => {
    try {
      const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      const authorsMap = new Map();

      // Contar comentarios por autor
      commentsSnapshot.forEach((commentDoc) => {
        const commentData = commentDoc.data();
        const authorId = commentData.authorId;
        if (authorId) {
          authorsMap.set(authorId, (authorsMap.get(authorId) || 0) + 1);
        }
      });

      // Actualizar estadísticas de cada autor
      const batch = writeBatch(db);
      for (const [authorId, commentCount] of authorsMap) {
        const authorRef = doc(db, "users", authorId);
        batch.update(authorRef, {
          "stats.commentCount": increment(-commentCount),
          "stats.contributionCount": increment(-commentCount),
        });
      }

      await batch.commit();

      return { success: true, updatedAuthors: authorsMap.size };
    } catch (error) {
      console.error("Error actualizando estadísticas de autores:", error);
      return { success: false, error: error.message };
    }
  };

  // Eliminar un post
  const deletePost = async (postId) => {
    try {
      setLoading(true);
      setError(null);

      // Verificar permisos y obtener datos del post
      const { postData } = await checkPostPermissions(postId);
      const currentUser = auth.currentUser;

      // PRIMERO: Eliminar comentarios del post
      const commentsResult = await deletePostComments(postId);
      const deletedCommentsCount = commentsResult.deletedComments || 0;

      // SEGUNDO: Actualizar estadísticas de autores de comentarios
      let updatedAuthorsCount = 0;
      if (deletedCommentsCount > 0) {
        const statsResult = await updateUsersCommentStats(postId);
        updatedAuthorsCount = statsResult.updatedAuthors || 0;
      }

      // TERCERO: Eliminar el post y actualizar contadores
      const batch = writeBatch(db);

      // Eliminar post
      const postRef = doc(db, "posts", postId);
      batch.delete(postRef);

      // Actualizar contador del foro (solo si estaba activo)
      if (postData.status === "active") {
        const forumRef = doc(db, "forums", postData.forumId);
        batch.update(forumRef, {
          postCount: increment(-1),
        });
      }

      // Actualizar estadísticas del autor del post
      const authorRef = doc(db, "users", currentUser.uid);
      batch.update(authorRef, {
        "stats.postCount": increment(-1),
        "stats.contributionCount": increment(-1),
      });

      await batch.commit();

      return {
        success: true,
        deletionType: "user",
        deletedComments: deletedCommentsCount,
        updatedAuthors: updatedAuthorsCount,
      };
    } catch (err) {
      console.error("Error en deletePost:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Subir imágenes a Cloudinary
  const uploadImages = async (imageUris, dimensionsArray = []) => {
    try {
      setLoading(true);
      setError(null);

      const uploadedImages = [];

      for (let i = 0; i < imageUris.length; i++) {
        const imageUri = imageUris[i];
        const dimensions = dimensionsArray[i] || { width: 0, height: 0 };

        const uploadResult = await uploadToCloudinary(imageUri, dimensions);
        if (uploadResult.success) {
          uploadedImages.push(uploadResult.image);
        } else {
          throw new Error(uploadResult.error);
        }
      }

      return { success: true, images: uploadedImages };
    } catch (err) {
      console.error("Error en uploadImages:", err);
      setError(err.message);
      return { success: false, error: err.message, images: [] };
    } finally {
      setLoading(false);
    }
  };

  // Función para subir a Cloudinary
  const uploadToCloudinary = async (
    fileUri,
    dimensions = { width: 0, height: 0 }
  ) => {
    try {
      const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;

      if (!CLOUDINARY_CLOUD_NAME) {
        throw new Error(
          "Configuración de Cloudinary incompleta. Verifica tus variables de entorno."
        );
      }

      const filename = fileUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      const formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type,
        name: filename,
      });
      formData.append("upload_preset", "publicaciones");
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error Cloudinary: ${response.status}`);
      }

      const data = await response.json();

      // Usar dimensiones de Cloudinary si están disponibles
      const cloudinaryWidth = data.width || dimensions.width || 0;
      const cloudinaryHeight = data.height || dimensions.height || 0;

      // Crear objeto de imagen en formato compatible con Firestore
      const imageData = {
        url: data.secure_url,
        thumbnailUrl: data.secure_url,
        storagePath: data.public_id,
        filename: filename,
        size: data.bytes || 0,
        dimensions: {
          width: cloudinaryWidth,
          height: cloudinaryHeight,
        },
        uploadedAt: new Date(),
      };

      return { success: true, image: imageData };
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      return { success: false, error: err.message };
    }
  };

  // Crear nuevo post
  const createPost = async (postData) => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para publicar");
      }

      // Verificar que el usuario puede publicar (doctor o superior)
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      if (!["doctor", "moderator", "admin"].includes(userData?.role)) {
        throw new Error("Solo usuarios verificados pueden publicar");
      }

      // Preparar imágenes en formato correcto
      const formattedImages = postData.images || [];

      const newPost = {
        title: postData.title,
        content: postData.content,
        authorId: currentUser.uid,
        forumId: postData.forumId,
        createdAt: serverTimestamp(),
        updatedAt: null,
        likes: [],
        dislikes: [],
        images: formattedImages,
        stats: {
          commentCount: 0,
          viewCount: 0,
          likeCount: 0,
          dislikeCount: 0,
        },
        status: "active",
      };

      // Agregar documento a Firestore
      const postRef = doc(collection(db, "posts"));
      await updateDoc(postRef, newPost);

      // Actualizar estadísticas del foro
      const forumRef = doc(db, "forums", postData.forumId);
      await updateDoc(forumRef, {
        postCount: increment(1),
        lastPostAt: serverTimestamp(),
      });

      // Actualizar estadísticas del usuario
      await updateDoc(doc(db, "users", currentUser.uid), {
        "stats.postCount": increment(1),
        "stats.contributionCount": increment(1),
      });

      return { success: true, postId: postRef.id };
    } catch (err) {
      console.error("Error creando post:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    reactToPost,
    editPost,
    deletePost,
    uploadImages,
    createPost,
    loading,
    error,
    clearError: () => setError(null),
  };
};
