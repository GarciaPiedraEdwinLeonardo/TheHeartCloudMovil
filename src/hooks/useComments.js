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

export const useComments = (postId, commentsLimit = 50) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!postId) {
      setComments([]);
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
  }, [postId, commentsLimit]);

  return { comments, loading, error };
};
