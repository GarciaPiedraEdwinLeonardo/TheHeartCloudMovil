import { useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
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
import Constants from "expo-constants";

export const usePostActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para eliminar imágenes de Cloudinary
  const deleteFromCloudinary = async (imageUrl) => {
    if (!imageUrl) return { success: true };

    try {
      const backendUrl = Constants.expoConfig.extra.backendUrl;
      if (!backendUrl) {
        console.warn(
          "Backend no configurado - imagen permanecerá en Cloudinary"
        );
        return { success: false, error: "Backend no configurado" };
      }

      const response = await fetch(`${backendUrl}/api/deleteCloudinaryImage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.warn(
          "No se pudo eliminar la imagen de Cloudinary:",
          result.error
        );
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      console.warn("Error eliminando imagen de Cloudinary:", err);
      return { success: false, error: err.message };
    }
  };

  // Función auxiliar para eliminar múltiples imágenes de un post
  const deletePostImages = async (images) => {
    if (!images || images.length === 0) return;

    console.log(`🗑️ Eliminando ${images.length} imagen(es) de Cloudinary...`);

    const deletionPromises = images.map(async (image) => {
      if (image.url) {
        await deleteFromCloudinary(image.url);
      }
    });

    await Promise.allSettled(deletionPromises);
  };

  // Función auxiliar para verificar permisos (solo autor en móvil)
  const checkPostPermissions = async (postId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Debes iniciar sesión");
    }

    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error("Publicación no encontrada");
    }

    const postData = postDoc.data();

    // Solo el autor puede modificar en la versión móvil
    if (postData.authorId !== currentUser.uid) {
      throw new Error("No tienes permiso para modificar esta publicación");
    }

    return { postData };
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

      const newPost = {
        title: postData.title,
        content: postData.content,
        authorId: currentUser.uid,
        forumId: postData.forumId,
        createdAt: serverTimestamp(),
        updatedAt: null,
        likes: [],
        dislikes: [],
        images: postData.images || [],
        stats: {
          commentCount: 0,
          viewCount: 0,
        },
        status: postData.status || "active",
      };

      const docRef = await addDoc(collection(db, "posts"), newPost);

      // ALINEADO CON WEB: Manejar stats según el status del post
      if (newPost.status === "active") {
        // Post activo: incrementar todo
        await updateDoc(doc(db, "forums", postData.forumId), {
          postCount: increment(1),
          lastPostAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "users", currentUser.uid), {
          "stats.postCount": increment(1),
          "stats.contributionCount": increment(1),
        });
      }
      // Si es pending, NO incrementar nada - se hará cuando se apruebe

      console.log("✅ Post creado exitosamente");

      return { success: true, postId: docRef.id };
    } catch (err) {
      console.error("Error creando post:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Editar post
  const editPost = async (postId, updates) => {
    try {
      setLoading(true);
      setError(null);

      const { postData } = await checkPostPermissions(postId);

      // Si se están actualizando las imágenes, eliminar las antiguas de Cloudinary
      if (updates.images) {
        const oldImages = postData.images || [];
        const newImages = updates.images || [];

        // Encontrar imágenes que se eliminaron
        const oldImageUrls = oldImages.map((img) => img.url);
        const newImageUrls = newImages.map((img) => img.url);
        const imagesToDelete = oldImages.filter(
          (img) => !newImageUrls.includes(img.url)
        );

        // Eliminar imágenes antiguas de Cloudinary
        if (imagesToDelete.length > 0) {
          console.log(
            `🗑️ Eliminando ${imagesToDelete.length} imagen(es) antigua(s)...`
          );
          await deletePostImages(imagesToDelete);
        }
      }

      const postRef = doc(db, "posts", postId);

      await updateDoc(postRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (err) {
      console.error("Error editando post:", err);
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

  // Eliminar un post
  const deletePost = async (postId) => {
    try {
      setLoading(true);
      setError(null);

      const { postData } = await checkPostPermissions(postId);
      const currentUser = auth.currentUser;

      // ALINEADO CON WEB: Contar comentarios antes de eliminarlos
      const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const authorsMap = new Map();

      // Contar comentarios por autor ANTES de eliminarlos
      commentsSnapshot.forEach((commentDoc) => {
        const commentData = commentDoc.data();
        const authorId = commentData.authorId;
        if (authorId) {
          authorsMap.set(authorId, (authorsMap.get(authorId) || 0) + 1);
        }
      });

      const deletedCommentsCount = commentsSnapshot.size;

      // SEGUNDO: Eliminar comentarios del post
      await deletePostComments(postId);

      // TERCERO: Eliminar imágenes del post de Cloudinary
      if (postData.images && postData.images.length > 0) {
        await deletePostImages(postData.images);
      }

      // CUARTO: Actualizar estadísticas de autores de comentarios
      let updatedAuthorsCount = 0;
      if (deletedCommentsCount > 0) {
        const batch = writeBatch(db);
        for (const [authorId, commentCount] of authorsMap) {
          const authorRef = doc(db, "users", authorId);
          batch.update(authorRef, {
            "stats.commentCount": increment(-commentCount),
            "stats.contributionCount": increment(-commentCount),
          });
          updatedAuthorsCount++;
        }
        await batch.commit();
      }

      // QUINTO: Eliminar el post definitivamente y actualizar contadores
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

      // ALINEADO CON WEB: Actualizar estadísticas del autor del post
      if (postData.authorId) {
        const authorRef = doc(db, "users", postData.authorId);

        if (postData.status === "active") {
          // Post estaba activo: decrementar postCount y contributionCount
          batch.update(authorRef, {
            "stats.postCount": increment(-1),
            "stats.contributionCount": increment(-1),
          });
        }
      }

      await batch.commit();

      console.log("✅ Post eliminado exitosamente");

      return {
        success: true,
        deletedComments: deletedCommentsCount,
        updatedAuthors: updatedAuthorsCount,
        deletedImages: postData.images?.length || 0,
        deletionType: "user", // En móvil siempre es eliminación por usuario
      };
    } catch (err) {
      console.error("Error eliminando post:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Reaccionar a post
  const reactToPost = async (postId, reactionType) => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Debes iniciar sesión");
      }

      const userId = currentUser.uid;
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        throw new Error("Publicación no encontrada");
      }

      const postData = postDoc.data();
      const authorId = postData.authorId;

      // Determinar cambios en el aura
      let auraChange = 0;
      const currentLikes = postData.likes || [];
      const currentDislikes = postData.dislikes || [];

      const wasLiked = currentLikes.includes(userId);
      const wasDisliked = currentDislikes.includes(userId);

      // ALINEADO CON WEB: Calcular cambio en aura
      if (reactionType === "like") {
        if (wasLiked) {
          auraChange = -1;
        } else if (wasDisliked) {
          auraChange = 2;
        } else {
          auraChange = 1;
        }
      } else if (reactionType === "dislike") {
        if (wasDisliked) {
          auraChange = 1;
        } else if (wasLiked) {
          auraChange = -2;
        } else {
          auraChange = -1;
        }
      } else if (reactionType === "remove") {
        if (wasLiked) {
          auraChange = -1;
        } else if (wasDisliked) {
          auraChange = 1;
        }
      }

      // Usar batch para operación atómica
      const batch = writeBatch(db);

      // 1. Actualizar reacciones del post
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

      // 2. Actualizar aura del autor SOLO si hay cambio y no es el mismo usuario
      if (auraChange !== 0 && authorId !== userId) {
        const authorRef = doc(db, "users", authorId);
        batch.update(authorRef, {
          "stats.aura": increment(auraChange),
        });
      }

      await batch.commit();

      return { success: true, auraChange };
    } catch (err) {
      console.error("Error reaccionando al post:", err);
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

  return {
    createPost,
    editPost,
    deletePost,
    reactToPost,
    uploadImages,
    deleteFromCloudinary,
    loading,
    error,
    clearError: () => setError(null),
  };
};
