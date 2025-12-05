import Constants from "expo-constants";

const cloudinaryConfig = {
  cloudName: Constants.expoConfig.extra.cloudName,
  uploadPresetProfile: Constants.expoConfig.extra.uploadPresetProfile,
  uploadPresetCedules: Constants.expoConfig.extra.uploadPresetCedules,
};

// Verificar que las constantes están disponibles
console.log("Cloudinary Config:", cloudinaryConfig);

export default cloudinaryConfig;
