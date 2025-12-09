import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/contexts/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import VerificationSentScreen from "./src/screens/VerificationSentScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ForumScreen from "./src/screens/ForumScreen";
import SearchScreen from "./src/screens/SearchScreen";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/config/firebase";
import { View, Text, ActivityIndicator } from "react-native";
import { PaperProvider } from "react-native-paper";

const Stack = createNativeStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingVerification, setCheckingVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Verificar si el email está confirmado
          await firebaseUser.reload(); // Recargar datos del usuario
          const currentUser = auth.currentUser;

          if (!currentUser.emailVerified) {
            // Email no verificado - Cerrar sesión automáticamente
            console.log("Usuario no verificado, cerrando sesión...");
            await auth.signOut();
            setUser(null);
            setCheckingVerification(false);
          } else {
            // Email verificado - Permitir acceso
            console.log("Usuario verificado, permitiendo acceso...");
            setUser(currentUser);
            setCheckingVerification(false);
          }
        } else {
          // No hay usuario autenticado
          setUser(null);
          setCheckingVerification(false);
        }
      } catch (error) {
        console.error("Error verificando estado de autenticación:", error);
        setUser(null);
        setCheckingVerification(false);
      } finally {
        if (initializing) {
          setInitializing(false);
        }
      }
    });

    return unsubscribe;
  }, [initializing]);

  // Si está verificando el estado de verificación, mostrar loading
  if (checkingVerification) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Verificando estado de cuenta...
        </Text>
      </View>
    );
  }

  // Loading inicial
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              // Usuario autenticado Y VERIFICADO - Pantallas principales
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen
                  name="Forum"
                  component={ForumScreen}
                  options={{
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="Search"
                  component={SearchScreen}
                  options={{
                    animation: "slide_from_bottom",
                  }}
                />
              </>
            ) : (
              // Usuario NO autenticado o NO verificado - Pantallas de autenticación
              <>
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  initialParams={{ verificationRequired: false }}
                />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                />
                <Stack.Screen
                  name="VerificationSent"
                  component={VerificationSentScreen}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

export default App;
