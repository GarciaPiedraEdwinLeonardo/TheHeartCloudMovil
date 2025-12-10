import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/contexts/AuthContext";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./src/config/firebase";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import VerificationSentScreen from "./src/screens/VerificationSentScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ForumScreen from "./src/screens/ForumScreen";
import SearchScreen from "./src/screens/SearchScreen";
import SuspendedScreen from "./src/screens/SuspendedScreen";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/config/firebase";
import { View, Text, ActivityIndicator } from "react-native";
import { PaperProvider } from "react-native-paper";

const Stack = createNativeStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [checkingSuspension, setCheckingSuspension] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Recargar información del usuario
          await firebaseUser.reload();
          const currentUser = auth.currentUser;

          // 🔥 VERIFICACIÓN CRÍTICA: Asegurar que currentUser existe 🔥
          if (!currentUser) {
            console.log(
              "Usuario no disponible después de reload, limpiando estado..."
            );
            setUser(null);
            setUserData(null);
            setIsSuspended(false);
            setCheckingVerification(false);
            setCheckingSuspension(false);
            return;
          }

          // 🔥 Obtener proveedores del usuario (solo si currentUser existe) 🔥
          const providerData = currentUser.providerData || [];
          const isGoogleUser = providerData.some(
            (provider) => provider.providerId === "google.com"
          );

          // 🔥 SOLUCIÓN CORREGIDA: Solo requerir verificación para usuarios NO de Google 🔥
          // Usuarios de Google pueden acceder sin verificación de email
          if (!currentUser.emailVerified && !isGoogleUser) {
            // Email no verificado y NO es de Google - Cerrar sesión automáticamente
            console.log(
              "Usuario no verificado (no Google), cerrando sesión..."
            );
            await auth.signOut();
            setUser(null);
            setUserData(null);
            setCheckingVerification(false);
            setCheckingSuspension(false);
          } else {
            // Email verificado o es usuario de Google - continuar con el flujo
            console.log(
              "Usuario verificado o es de Google, verificando suspensión..."
            );
            setUser(currentUser);
            setCheckingVerification(false);

            // Cargar datos del usuario para verificar suspensión
            try {
              const userDoc = await getDoc(doc(db, "users", currentUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserData(userData);

                // Verificar suspensión
                if (userData.suspension?.isSuspended) {
                  const endDate = userData.suspension.endDate?.toDate();
                  const now = new Date();

                  // Si la suspensión expiró, limpiarla automáticamente
                  if (endDate && now >= endDate) {
                    console.log(
                      "Suspensión expirada - limpiando automáticamente"
                    );
                    try {
                      await updateDoc(doc(db, "users", currentUser.uid), {
                        "suspension.isSuspended": false,
                        "suspension.reason": null,
                        "suspension.startDate": null,
                        "suspension.endDate": null,
                        "suspension.suspendedBy": null,
                        "suspension.autoRemovedAt": serverTimestamp(),
                      });

                      // Recargar datos actualizados
                      const updatedDoc = await getDoc(
                        doc(db, "users", currentUser.uid)
                      );
                      if (updatedDoc.exists()) {
                        const updatedUserData = updatedDoc.data();
                        setUserData(updatedUserData);
                        setIsSuspended(false);
                      }
                    } catch (updateError) {
                      console.error(
                        "Error actualizando suspensión:",
                        updateError
                      );
                    }
                  } else {
                    // Usuario suspendido activamente
                    console.log(
                      "Usuario suspendido, mostrando pantalla de suspensión"
                    );
                    setIsSuspended(true);
                  }
                } else {
                  console.log("Usuario no suspendido, permitiendo acceso");
                  setIsSuspended(false);
                }
              } else {
                console.log("Documento de usuario no encontrado en Firestore");
                setIsSuspended(false);
              }
            } catch (error) {
              console.error("Error cargando datos del usuario:", error);
              setIsSuspended(false);
            } finally {
              setCheckingSuspension(false);
            }
          }
        } else {
          // No hay usuario autenticado
          console.log("No hay usuario autenticado");
          setUser(null);
          setUserData(null);
          setIsSuspended(false);
          setCheckingVerification(false);
          setCheckingSuspension(false);
        }
      } catch (error) {
        console.error("Error verificando estado de autenticación:", error);
        setUser(null);
        setUserData(null);
        setIsSuspended(false);
        setCheckingVerification(false);
        setCheckingSuspension(false);
      } finally {
        if (initializing) {
          console.log("Inicialización completada");
          setInitializing(false);
        }
      }
    });

    return unsubscribe;
  }, [initializing]);

  // Mostrar loading mientras verifica
  if (checkingVerification || checkingSuspension || initializing) {
    console.log("Mostrando loading...");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          {checkingVerification
            ? "Verificando estado de cuenta..."
            : checkingSuspension
            ? "Verificando estado de suspensión..."
            : "Cargando..."}
        </Text>
      </View>
    );
  }

  console.log("Estado actual de App:", {
    user: !!user,
    isSuspended,
    userData: !!userData,
  });

  // Renderizar pantallas según estado
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              // Usuario NO autenticado - mostrar pantallas de autenticación
              // Esto incluye cuando el usuario cierra sesión desde SuspendedScreen
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
                <Stack.Screen
                  name="Suspended"
                  component={SuspendedScreen}
                  options={{ gestureEnabled: false }}
                />
              </>
            ) : isSuspended ? (
              // Usuario autenticado pero SUSPENDIDO
              // Solo mostrar pantalla de suspensión
              <Stack.Screen name="Suspended">
                {(props) => (
                  <SuspendedScreen
                    {...props}
                    userData={userData}
                    onLogoutSuccess={() => {
                      // Cuando se cierra sesión exitosamente
                      setUser(null);
                      setUserData(null);
                      setIsSuspended(false);
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              // Usuario autenticado, VERIFICADO o es de Google y NO SUSPENDIDO
              // Mostrar pantallas principales
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
                {/* Agregar pantalla de suspensión para navegación interna */}
                <Stack.Screen
                  name="Suspended"
                  component={SuspendedScreen}
                  options={{ gestureEnabled: false }}
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
