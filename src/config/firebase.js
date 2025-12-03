import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Obtener configuración desde expo-constants
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.firebaseApiKey,
  authDomain: Constants.expoConfig.extra.firebaseAuthDomain,
  projectId: Constants.expoConfig.extra.firebaseProjectId,
  storageBucket: Constants.expoConfig.extra.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig.extra.firebaseMessagingSenderId,
  appId: Constants.expoConfig.extra.firebaseAppId,
  measurementId: Constants.expoConfig.extra.firebaseMeasurementId,
};

// Inicializar Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  
  // Inicializar Auth con persistencia en React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  db = getFirestore(app);
  
  console.log('✅ Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
  
  // Debug: Mostrar qué variables están disponibles
  console.log('🔍 Configuración disponible:', {
    apiKey: Constants.expoConfig.extra.firebaseApiKey ? 'Presente' : 'Faltante',
    authDomain: Constants.expoConfig.extra.firebaseAuthDomain ? 'Presente' : 'Faltante',
    projectId: Constants.expoConfig.extra.firebaseProjectId ? 'Presente' : 'Faltante',
  });
}

export { app, auth, db };