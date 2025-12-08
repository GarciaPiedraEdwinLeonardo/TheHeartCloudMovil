import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const useComments = (postId, commentsLimit = 50, maxDepth = 2) => {
  const [comments, setComments] = useState([]);
  const [filteredComments, setFilteredComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setFilteredComments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "asc"),
      limit(commentsLimit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const commentsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            likes: doc.data().likes || [],
            likeCount: doc.data().likeCount || 0,
            parentCommentId: doc.data().parentCommentId || null,
            editHistory: doc.data().editHistory || [],
            isDeleted: doc.data().isDeleted || false,
          }));

          setComments(commentsData);

          // Filtrar comentarios según profundidad máxima
          const filtered = filterCommentsByDepth(commentsData, maxDepth);
          setFilteredComments(filtered);

          setLoading(false);
        } catch (err) {
          console.error("Error cargando comentarios:", err);
          setError("Error cargando comentarios");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error en conexión de comentarios:", error);
        setError("Error de conexión");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId, commentsLimit, maxDepth]);

  // Función para filtrar comentarios por profundidad máxima
  const filterCommentsByDepth = (comments, maxDepth) => {
    if (maxDepth <= 0) {
      // Si maxDepth es 0 o negativo, solo mostrar comentarios raíz
      return comments.filter((comment) => !comment.parentCommentId);
    }

    // Crear mapa de comentarios
    const commentMap = new Map();
    comments.forEach((comment) => {
      commentMap.set(comment.id, comment);
    });

    // Calcular profundidad de cada comentario
    const calculateDepth = (commentId, visited = new Set()) => {
      if (visited.has(commentId)) return 0; // Evitar ciclos

      const comment = commentMap.get(commentId);
      if (!comment || !comment.parentCommentId) return 0;

      visited.add(commentId);
      return 1 + calculateDepth(comment.parentCommentId, visited);
    };

    // Filtrar comentarios cuya profundidad sea menor o igual a maxDepth
    return comments.filter((comment) => {
      const depth = calculateDepth(comment.id);
      return depth < maxDepth;
    });
  };

  return {
    comments: filteredComments, // Devolver comentarios filtrados
    allComments: comments, // Mantener todos los comentarios por si acaso
    loading,
    error,
    maxDepth,
  };
};
