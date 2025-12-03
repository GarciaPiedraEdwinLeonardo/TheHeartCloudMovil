// config/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Si usas Expo SDK 49+, instala:
// npx expo install @react-native-async-storage/async-storage

export const storage = {
  // Guardar datos
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      return false;
    }
  },

  // Obtener datos
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Error leyendo datos:', error);
      return null;
    }
  },

  // Eliminar datos
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando datos:', error);
      return false;
    }
  },

  // Limpiar todo
  clear: async () => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('❌ Error limpiando almacenamiento:', error);
      return false;
    }
  }
};

export default storage;