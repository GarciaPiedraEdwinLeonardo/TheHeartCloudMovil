import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const useCommentLikes = (commentId) => {
  const [likes, setLikes] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    if (!commentId) {
      setLikes([]);
      setLikeCount(0);
      setUserLiked(false);
      setLoading(false);
      return;
    }

    const commentRef = doc(db, "comments", commentId);
    const unsubscribe = onSnapshot(commentRef, (doc) => {
      if (doc.exists()) {
        const commentData = doc.data();
        const commentLikes = commentData.likes || [];
        const count = commentData.likeCount || 0;

        setLikes(commentLikes);
        setLikeCount(count);
        setUserLiked(user ? commentLikes.includes(user.uid) : false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [commentId, user]);

  return {
    likes,
    likeCount,
    userLiked,
    loading,
  };
};
