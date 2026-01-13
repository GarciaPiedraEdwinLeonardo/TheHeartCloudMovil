import { useState } from "react";
import {
  doc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
  writeBatch,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const useCommentActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = auth.currentUser;

  // Función auxiliar para verificar permisos
  const checkCommentPermissions = async (commentId) => {
    if (!user) throw new Error("Debes iniciar sesión");

    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) throw new Error("Comentario no encontrado");

    const commentData = commentDoc.data();
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // Verificar si puede modificar (autor, moderador o admin)
    const isAuthor = commentData.authorId === user.uid;
    const isModeratorOrAdmin = ["moderator", "admin"].includes(userData?.role);

    // Verificar si es moderador del foro del post
    let isForumModerator = false;
    if (commentData.postId) {
      const postDoc = await getDoc(doc(db, "posts", commentData.postId));
      if (postDoc.exists()) {
        const postData = postDoc.data();
        const forumDoc = await getDoc(doc(db, "forums", postData.forumId));
        if (forumDoc.exists()) {
          const forumData = forumDoc.data();
          isForumModerator =
            forumData.moderators && forumData.moderators[user.uid];
        }
      }
    }

    if (!isAuthor && !isModeratorOrAdmin && !isForumModerator) {
      throw new Error("No tienes permisos para modificar este comentario");
    }

    return {
      commentData,
      userData,
      isAuthor,
      isModeratorOrAdmin,
      isForumModerator,
    };
  };

  // Función para calcular profundidad de un comentario
  const calculateCommentDepth = async (commentId) => {
    let depth = 0;
    let currentCommentId = commentId;

    while (currentCommentId) {
      const commentRef = doc(db, "comments", currentCommentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) break;

      const commentData = commentDoc.data();

      if (commentData.parentCommentId) {
        depth++;
        currentCommentId = commentData.parentCommentId;
      } else {
        break;
      }
    }

    return depth;
  };

  // Crear nuevo comentario CON VALIDACIÓN DE PROFUNDIDAD PARA MÓVIL
  const createComment = async (commentData) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) throw new Error("Debes iniciar sesión para comentar");

      // Verificar que el usuario puede comentar (doctor o superior)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (!["doctor", "moderator", "admin"].includes(userData?.role)) {
        throw new Error("Solo usuarios verificados pueden comentar");
      }

      // VALIDACIÓN DE PROFUNDIDAD PARA MÓVIL
      if (commentData.parentCommentId) {
        // Calcular profundidad del comentario padre
        const parentDepth = await calculateCommentDepth(
          commentData.parentCommentId
        );

        // Límite para móvil: 2 niveles (0 = raíz, 1 = primera respuesta, 2 = segunda respuesta)
        // Si el padre ya está en nivel 1 (depth = 1), no permitir más respuestas
        if (parentDepth >= 1) {
          throw new Error(
            "En la versión móvil solo se permiten 2 niveles de respuestas por hilo. No puedes responder a este comentario."
          );
        }
      }

      const newComment = {
        content: commentData.content,
        authorId: user.uid,
        postId: commentData.postId,
        parentCommentId: commentData.parentCommentId || null,
        likes: [],
        likeCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: null,
        editHistory: [],
      };

      const docRef = await addDoc(collection(db, "comments"), newComment);

      // Actualizar contador de comentarios en el post
      await updateDoc(doc(db, "posts", commentData.postId), {
        "stats.commentCount": increment(1),
      });

      // Actualizar estadísticas del usuario
      await updateDoc(doc(db, "users", user.uid), {
        "stats.commentCount": increment(1),
        "stats.contributionCount": increment(1),
      });

      return { success: true, commentId: docRef.id };
    } catch (error) {
      console.error("Error creando comentario:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Editar comentario
  const editComment = async (commentId, newContent) => {
    try {
      setLoading(true);
      setError(null);

      const { commentData, isAuthor } = await checkCommentPermissions(
        commentId
      );

      if (!isAuthor) {
        throw new Error("Solo el autor puede editar el comentario");
      }

      const commentRef = doc(db, "comments", commentId);
      const batch = writeBatch(db);

      // Agregar al historial de ediciones
      const editRecord = {
        previousContent: commentData.content,
        editedAt: new Date(),
        editedBy: user.uid,
      };

      // Actualizar comentario
      batch.update(commentRef, {
        content: newContent,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion(editRecord),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error editando comentario:", error);
      setError(error.message);
      return {
        success: false,
        error: "Error al editar el comentario regrese mas tarde",
      };
    } finally {
      setLoading(false);
    }
  };

  // ALINEADO CON WEB: Eliminar comentario con eliminación DEFINITIVA
  const deleteComment = async (commentId, isModeratorAction = false) => {
    try {
      setLoading(true);
      setError(null);

      const { commentData } = await checkCommentPermissions(commentId);

      // Usar la función recursiva para eliminar comentario y respuestas
      const result = await deleteCommentWithReplies(
        commentId,
        isModeratorAction
      );

      return result;
    } catch (error) {
      console.error("Error eliminando comentario:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // ALINEADO CON WEB: Función recursiva para eliminar comentario y sus respuestas DEFINITIVAMENTE
  const deleteCommentWithReplies = async (
    commentId,
    isModeratorAction = false
  ) => {
    try {
      const { commentData, isAuthor, isModeratorOrAdmin, isForumModerator } =
        await checkCommentPermissions(commentId);

      const batch = writeBatch(db);

      // Variable para contar TODOS los comentarios eliminados
      let totalCommentsDeleted = 0;

      // Función recursiva para eliminar comentarios y sus respuestas DEFINITIVAMENTE
      const deleteCommentRecursive = async (currentCommentId, currentBatch) => {
        // 1. Obtener todas las respuestas de este comentario
        const repliesQuery = query(
          collection(db, "comments"),
          where("parentCommentId", "==", currentCommentId)
        );

        const repliesSnapshot = await getDocs(repliesQuery);
        const replies = repliesSnapshot.docs;

        // 2. Eliminar recursivamente cada respuesta
        let repliesDeletedCount = 0;
        for (const replyDoc of replies) {
          repliesDeletedCount += await deleteCommentRecursive(
            replyDoc.id,
            currentBatch
          );
        }

        // 3. ELIMINAR DEFINITIVAMENTE el comentario actual
        const commentRef = doc(db, "comments", currentCommentId);
        const commentDoc = await getDoc(commentRef);

        if (commentDoc.exists()) {
          const currentCommentData = commentDoc.data();

          // ELIMINAR el documento en lugar de marcarlo como eliminado
          currentBatch.delete(commentRef);

          // Actualizar estadísticas del autor (solo si existe)
          const commentAuthorId = currentCommentData.authorId;

          if (commentAuthorId) {
            const authorRef = doc(db, "users", commentAuthorId);
            const authorSnap = await getDoc(authorRef);

            if (authorSnap.exists()) {
              if (commentAuthorId === user.uid) {
                currentBatch.update(authorRef, {
                  "stats.commentCount": increment(-1),
                  "stats.contributionCount": increment(-1),
                });
              } else if (
                isModeratorAction ||
                isModeratorOrAdmin ||
                isForumModerator
              ) {
                currentBatch.update(authorRef, {
                  "stats.commentCount": increment(-1),
                  "stats.contributionCount": increment(-1),
                  "stats.warnings": increment(1),
                });
              }
            }
          }
        }

        // Retornar el total de comentarios eliminados en este sub-árbol
        return 1 + repliesDeletedCount;
      };

      // Ejecutar eliminación recursiva y obtener el total real
      totalCommentsDeleted = await deleteCommentRecursive(commentId, batch);

      // Actualizar contador de comentarios en el post
      batch.update(doc(db, "posts", commentData.postId), {
        "stats.commentCount": increment(-totalCommentsDeleted),
      });

      await batch.commit();

      return {
        success: true,
        deletionType: isAuthor ? "user" : "moderator",
        deletedCount: totalCommentsDeleted,
      };
    } catch (error) {
      console.error("Error eliminando comentario con respuestas:", error);
      throw error;
    }
  };

  // Función auxiliar para contar respuestas
  const countCommentReplies = async (commentId) => {
    try {
      const repliesQuery = query(
        collection(db, "comments"),
        where("parentCommentId", "==", commentId)
      );

      const repliesSnapshot = await getDocs(repliesQuery);
      let total = repliesSnapshot.size;

      // Contar respuestas de forma recursiva
      for (const replyDoc of repliesSnapshot.docs) {
        total += await countCommentReplies(replyDoc.id);
      }

      return total;
    } catch (error) {
      console.error("Error contando respuestas:", error);
      return 0;
    }
  };

  // Reaccionar a comentario (like)
  const likeComment = async (commentId) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) throw new Error("Debes iniciar sesión");

      const commentRef = doc(db, "comments", commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) {
        throw new Error("Comentario no encontrado");
      }

      const commentData = commentDoc.data();
      const authorId = commentData.authorId;

      const currentLikes = commentData.likes || [];
      const isLiked = currentLikes.includes(user.uid);

      const batch = writeBatch(db);

      // 🔹 Like / Unlike del comentario
      batch.update(commentRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likeCount: increment(isLiked ? -1 : 1),
      });

      // 🔹 Actualizar aura SOLO si:
      // - Hay authorId
      // - No es el mismo usuario
      // - El usuario autor EXISTE
      if (authorId && authorId !== user.uid) {
        const authorRef = doc(db, "users", authorId);
        const authorSnap = await getDoc(authorRef);

        if (authorSnap.exists()) {
          batch.update(authorRef, {
            "stats.aura": increment(isLiked ? -1 : 1),
          });
        }
      }

      await batch.commit();

      return { success: true, liked: !isLiked };
    } catch (error) {
      console.error("Error en like del comentario:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Obtener datos del autor de un comentario
  const getCommentAuthor = async (authorId) => {
    try {
      const authorDoc = await getDoc(doc(db, "users", authorId));
      if (authorDoc.exists()) {
        return authorDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo autor del comentario:", error);
      return null;
    }
  };

  // Obtener profundidad de un comentario
  const getCommentDepth = async (commentId) => {
    try {
      return await calculateCommentDepth(commentId);
    } catch (error) {
      console.error("Error calculando profundidad del comentario:", error);
      return 0;
    }
  };

  return {
    createComment,
    editComment,
    deleteComment,
    deleteCommentWithReplies,
    countCommentReplies,
    likeComment,
    getCommentAuthor,
    getCommentDepth,
    loading,
    error,
    clearError: () => setError(null),
  };
};
