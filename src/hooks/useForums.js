import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

export const useForums = (searchTerm = "", limitCount = 20) => {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadForums = async () => {
      try {
        setLoading(true);

        let q;
        const forumsRef = collection(db, "forums");

        if (searchTerm.trim() === "") {
          // Sin búsqueda: obtener foros activos ordenados por popularidad
          q = query(
            forumsRef,
            where("isDeleted", "==", false),
            where("status", "==", "active"),
            orderBy("memberCount", "desc"),
            limit(limitCount)
          );
        } else {
          // Con búsqueda: obtener todos los foros activos y filtrar localmente
          q = query(
            forumsRef,
            where("isDeleted", "==", false),
            where("status", "==", "active"),
            limit(50) // Límite más alto para búsqueda
          );
        }

        const querySnapshot = await getDocs(q);
        const forumsData = [];

        querySnapshot.forEach((doc) => {
          const forumData = doc.data();

          // Filtrar por término de búsqueda si existe
          if (
            searchTerm.trim() === "" ||
            forumData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (forumData.description &&
              forumData.description
                .toLowerCase()
                .includes(searchTerm.toLowerCase()))
          ) {
            forumsData.push({
              id: doc.id,
              name: forumData.name || "Comunidad sin nombre",
              description: forumData.description || "",
              memberCount: forumData.memberCount || 0,
              postCount: forumData.postCount || 0,
              ownerId: forumData.ownerId,
              membershipSettings: forumData.membershipSettings || {
                requiresApproval: false,
              },
              rules: forumData.rules || "Reglas no especificadas",
              image: forumData.image || null,
              createdAt: forumData.createdAt,
              lastPostAt: forumData.lastPostAt,
              bannedUsers: forumData.bannedUsers || [],
            });
          }
        });

        // Ordenar por relevancia si hay búsqueda
        if (searchTerm.trim() !== "") {
          forumsData.sort((a, b) => {
            const aNameMatch = a.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            const bNameMatch = b.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;

            // Si ambos coinciden en nombre, ordenar por miembros
            return b.memberCount - a.memberCount;
          });
        }

        setForums(forumsData);
        setLoading(false);
      } catch (error) {
        console.error("Error cargando foros:", error);
        setError("Error al cargar comunidades");
        setLoading(false);
      }
    };

    loadForums();
  }, [searchTerm, limitCount]);

  return { forums, loading, error, refetch: () => {} };
};
