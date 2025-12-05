import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import * as ImagePicker from "expo-image-picker";
import cloudinaryConfig from "./../config/cloudinary";

export const useProfilePhoto = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadToCloudinary = async (fileUri) => {
    try {
      console.log("Cloudinary config:", cloudinaryConfig);

      // Usar el upload preset correcto para perfil
      const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;
      const CLOUDINARY_UPLOAD_PRESET = cloudinaryConfig.uploadPresetProfile;

      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        console.error("Faltan configuraciones de Cloudinary:");
        console.error("Cloud Name:", CLOUDINARY_CLOUD_NAME);
        console.error("Upload Preset:", CLOUDINARY_UPLOAD_PRESET);
        throw new Error(
          "Configuración de Cloudinary incompleta. Verifica tus variables de entorno."
        );
      }

      // Obtener información del archivo
      const filename = fileUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      console.log("Subiendo archivo:", { filename, type });

      // Crear FormData para React Native
      const formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type,
        name: filename,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      console.log("URL de subida:", uploadUrl);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Respuesta status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error respuesta Cloudinary:", errorText);
        throw new Error(`Error Cloudinary: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Cloudinary response data:", data);
      return data.secure_url;
    } catch (err) {
      console.error("Error completo subiendo a Cloudinary:", err);
      throw err; // Propagar el error
    }
  };

  const pickImage = async () => {
    try {
      console.log("Solicitando permisos de galería...");

      // Pedir permisos
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Permisos galería:", permissionResult);

      if (!permissionResult.granted) {
        setError("Se necesitan permisos para acceder a la galería");
        return null;
      }

      // Abrir selector de imágenes
      console.log("Abriendo selector de imágenes...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      console.log("Resultado selector:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log("Imagen seleccionada:", result.assets[0].uri);
        return result.assets[0].uri;
      }

      console.log("Selección cancelada");
      return null;
    } catch (err) {
      console.error("Error completo seleccionando imagen:", err);
      setError("Error al seleccionar la imagen");
      return null;
    }
  };

  const takePhoto = async () => {
    try {
      console.log("Solicitando permisos de cámara...");

      // Pedir permisos de cámara
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      console.log("Permisos cámara:", permissionResult);

      if (!permissionResult.granted) {
        setError("Se necesitan permisos para usar la cámara");
        return null;
      }

      // Abrir cámara
      console.log("Abriendo cámara...");
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      console.log("Resultado cámara:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log("Foto tomada:", result.assets[0].uri);
        return result.assets[0].uri;
      }

      console.log("Foto cancelada");
      return null;
    } catch (err) {
      console.error("Error completo tomando foto:", err);
      setError("Error al tomar la foto");
      return null;
    }
  };

  const uploadProfilePhoto = async (imageUri) => {
    console.log("==== INICIANDO SUBIDA DE FOTO ====");
    console.log("Usuario actual:", auth.currentUser?.uid);
    console.log("URI de imagen:", imageUri);

    if (!auth.currentUser) {
      console.error("ERROR: Usuario no autenticado");
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
      console.log("Subiendo para usuario:", userId);

      // Subir a Cloudinary
      console.log("Subiendo a Cloudinary...");
      const cloudinaryUrl = await uploadToCloudinary(imageUri);
      console.log("URL Cloudinary obtenida:", cloudinaryUrl);

      if (!cloudinaryUrl) {
        throw new Error("No se obtuvo URL de Cloudinary");
      }

      // Actualizar Firestore
      console.log("Actualizando Firestore...");
      await updateDoc(doc(db, "users", userId), {
        profileMedia: cloudinaryUrl,
        lastUpdated: new Date(),
      });

      console.log("✅ Foto actualizada exitosamente");
      return cloudinaryUrl;
    } catch (err) {
      console.error("❌ Error completo en uploadProfilePhoto:", err);
      setError(err.message || "Error al subir la imagen");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteProfilePhoto = async () => {
    console.log("Eliminando foto de perfil...");

    if (!auth.currentUser) {
      setError("Usuario no autenticado");
      return false;
    }

    try {
      setUploading(true);
      setError(null);

      const userId = auth.currentUser.uid;

      // Actualizar Firestore (eliminar referencia a la foto)
      await updateDoc(doc(db, "users", userId), {
        profileMedia: null,
        lastUpdated: new Date(),
      });

      console.log("Foto eliminada exitosamente");
      return true;
    } catch (err) {
      console.error("Error eliminando foto de perfil:", err);
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
