import { useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import cloudinaryConfig from "../config/cloudinary";

export const usePostActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const currentLikes = postData.likes || [];
      const currentDislikes = postData.dislikes || [];

      let updates = {};

      if (reactionType === "like") {
        // Si ya dio like, quitarlo
        if (currentLikes.includes(userId)) {
          updates.likes = arrayRemove(userId);
          updates["stats.likeCount"] = increment(-1);
        } else {
          // Agregar like, quitar dislike si existe
          updates.likes = arrayUnion(userId);
          updates["stats.likeCount"] = increment(1);

          if (currentDislikes.includes(userId)) {
            updates.dislikes = arrayRemove(userId);
            updates["stats.dislikeCount"] = increment(-1);
          }
        }
      } else if (reactionType === "dislike") {
        // Si ya dio dislike, quitarlo
        if (currentDislikes.includes(userId)) {
          updates.dislikes = arrayRemove(userId);
          updates["stats.dislikeCount"] = increment(-1);
        } else {
          // Agregar dislike, quitar like si existe
          updates.dislikes = arrayUnion(userId);
          updates["stats.dislikeCount"] = increment(1);

          if (currentLikes.includes(userId)) {
            updates.likes = arrayRemove(userId);
            updates["stats.likeCount"] = increment(-1);
          }
        }
      } else if (reactionType === "remove") {
        // Quitar ambas reacciones
        if (currentLikes.includes(userId)) {
          updates.likes = arrayRemove(userId);
          updates["stats.likeCount"] = increment(-1);
        }
        if (currentDislikes.includes(userId)) {
          updates.dislikes = arrayRemove(userId);
          updates["stats.dislikeCount"] = increment(-1);
        }
      }

      await updateDoc(postRef, updates);

      return { success: true };
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

      const postRef = doc(db, "posts", postId);

      await updateDoc(postRef, {
        ...updates,
        lastUpdated: new Date(),
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

  // Eliminar un post
  const deletePost = async (postId) => {
    try {
      setLoading(true);
      setError(null);

      const postRef = doc(db, "posts", postId);

      // Verificar que el usuario es el autor
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) {
        throw new Error("El post no existe");
      }

      const postData = postDoc.data();
      const currentUser = auth.currentUser;

      if (postData.authorId !== currentUser?.uid) {
        throw new Error("No tienes permiso para eliminar este post");
      }

      // Eliminar el post
      await deleteDoc(postRef);

      // Actualizar estadísticas del usuario
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        "stats.postCount": increment(-1),
      });

      return { success: true };
    } catch (err) {
      console.error("Error en deletePost:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Subir imágenes a Cloudinary (similar al de perfil)
  const uploadImages = async (imageUris) => {
    try {
      setLoading(true);
      setError(null);

      const uploadedUrls = [];

      for (const imageUri of imageUris) {
        const cloudinaryUrl = await uploadToCloudinary(imageUri);
        if (cloudinaryUrl) {
          uploadedUrls.push(cloudinaryUrl);
        }
      }

      return { success: true, urls: uploadedUrls };
    } catch (err) {
      console.error("Error en uploadImages:", err);
      setError(err.message);
      return { success: false, error: err.message, urls: [] };
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para subir a Cloudinary
  const uploadToCloudinary = async (fileUri) => {
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
      return data.secure_url;
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      throw err;
    }
  };

  return {
    reactToPost,
    editPost,
    deletePost,
    uploadImages,
    loading,
    error,
    clearError: () => setError(null),
  };
};
