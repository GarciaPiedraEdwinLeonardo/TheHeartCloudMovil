import { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import * as ImagePicker from "expo-image-picker";
import cloudinaryConfig from "./../config/cloudinary";
import Constants from "expo-constants";

export const useProfilePhoto = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

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

      const response = await fetch(`${backendUrl}/api/cloudinary/delete`, {
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

  const getCurrentPhotoURL = async () => {
    if (!auth.currentUser) return null;

    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().photoURL || null;
      }
    } catch (err) {
      console.error("Error obteniendo foto actual:", err);
    }
    return null;
  };

  const uploadToCloudinary = async (fileUri) => {
    try {
      const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;
      const CLOUDINARY_UPLOAD_PRESET = cloudinaryConfig.uploadPresetProfile;

      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
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
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Cloudinary: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error("Error subiendo a Cloudinary:", err);
      throw err;
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setError("Se necesitan permisos para acceder a la galería");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (err) {
      console.error("Error seleccionando imagen:", err);
      setError("Error al seleccionar la imagen");
      return null;
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        setError("Se necesitan permisos para usar la cámara");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (err) {
      console.error("Error tomando foto:", err);
      setError("Error al tomar la foto");
      return null;
    }
  };

  const uploadProfilePhoto = async (imageUri) => {
    console.log("==== SUBIENDO FOTO DE PERFIL ====");

    if (!auth.currentUser) {
      setError("Usuario no autenticado");
      return null;
    }

    try {
      setUploading(true);
      setError(null);

      if (!imageUri) {
        throw new Error("No se seleccionó ninguna imagen");
      }

      const userId = auth.currentUser.uid;

      // Obtener la foto actual antes de subir la nueva
      const currentPhotoURL = await getCurrentPhotoURL();

      // Subir nueva imagen a Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageUri);

      if (!cloudinaryUrl) {
        throw new Error("No se obtuvo URL de Cloudinary");
      }

      // Actualizar Firestore con la nueva foto
      await updateDoc(doc(db, "users", userId), {
        photoURL: cloudinaryUrl,
        lastUpdated: new Date(),
      });

      console.log("✅ Foto actualizada en photoURL:", cloudinaryUrl);

      // Eliminar la foto anterior de Cloudinary (si existía)
      if (currentPhotoURL) {
        console.log("🗑️ Eliminando foto anterior de Cloudinary...");
        await deleteFromCloudinary(currentPhotoURL);
      }

      return cloudinaryUrl;
    } catch (err) {
      console.error("Error subiendo foto:", err);
      setError(err.message || "Error al subir la imagen");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteProfilePhoto = async () => {
    if (!auth.currentUser) {
      setError("Usuario no autenticado");
      return false;
    }

    try {
      setUploading(true);
      setError(null);

      const userId = auth.currentUser.uid;

      // Obtener la foto actual antes de eliminarla
      const currentPhotoURL = await getCurrentPhotoURL();

      // Actualizar Firestore primero
      await updateDoc(doc(db, "users", userId), {
        photoURL: null,
        lastUpdated: new Date(),
      });

      console.log("✅ Foto eliminada de photoURL");

      // Eliminar de Cloudinary
      if (currentPhotoURL) {
        console.log("🗑️ Eliminando foto de Cloudinary...");
        await deleteFromCloudinary(currentPhotoURL);
      }

      return true;
    } catch (err) {
      console.error("Error eliminando foto:", err);
      setError(err.message || "Error al eliminar la imagen");
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    pickImage,
    takePhoto,
    uploadProfilePhoto,
    deleteProfilePhoto,
    uploading,
    error,
    clearError: () => setError(null),
  };
};
