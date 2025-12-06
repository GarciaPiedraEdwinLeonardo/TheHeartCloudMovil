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
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/config/firebase";
import { View, Text, ActivityIndicator } from "react-native";
import { PaperProvider } from "react-native-paper";

const Stack = createNativeStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Verificar si el email está confirmado
        if (!user.emailVerified) {
          auth.signOut();
          setUser(null);
        } else {
          setUser(user);
        }
      } else {
        setUser(null);
      }
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

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
      {" "}
      {/* ← ENVUELVE TODO CON PaperProvider */}
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              // Usuario autenticado - Pantallas principales
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{
                    animation: "slide_from_right",
                  }}
                />
              </>
            ) : (
              // Usuario NO autenticado - Pantallas de autenticación
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
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
