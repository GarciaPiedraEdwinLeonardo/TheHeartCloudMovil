import React, { useState, useEffect, useRef } from "react";
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

  // 🔥 NUEVO: Ref para el intervalo de polling
  const pollingIntervalRef = useRef(null);

  // 🔥 VALIDACIÓN EXTRA: Verificar coherencia entre isSuspended y userData
  // Este useEffect debe estar ANTES de cualquier lógica de render condicional
  useEffect(() => {
    if (isSuspended && userData && !userData.suspension?.isSuspended) {
      console.log(
        "⚠️ Inconsistencia detectada: isSuspended=true pero userData dice false"
      );
      console.log("Corrigiendo estado...");
      setIsSuspended(false);
    }
  }, [isSuspended, userData]);

  // 🔥 NUEVO: Función para verificar el estado de suspensión
  const checkSuspensionStatus = async (userId) => {
    try {
      console.log("🔄 Verificando estado de suspensión...");
      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // 🔥 CRÍTICO: Verificar si la suspensión fue removida
        if (!userData.suspension?.isSuspended) {
          console.log("✅ Suspensión removida - actualizando estado");

          // 🔥 IMPORTANTE: Actualizar PRIMERO isSuspended para que el render cambie
          setIsSuspended(false);
          // Luego actualizar userData
          setUserData(userData);

          // Limpiar el intervalo cuando se detecta el cambio
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            console.log("🛑 Polling detenido");
          }
          return true; // Suspensión removida
        }

        // Verificar si la suspensión expiró
        if (userData.suspension?.endDate) {
          const endDate =
            userData.suspension.endDate.toDate?.() ||
            new Date(userData.suspension.endDate.seconds * 1000);
          const now = new Date();

          if (now >= endDate) {
            console.log("⏰ Suspensión expirada - limpiando automáticamente");

            // Limpiar suspensión en Firestore
            await updateDoc(doc(db, "users", userId), {
              "suspension.isSuspended": false,
              "suspension.reason": null,
              "suspension.startDate": null,
              "suspension.endDate": null,
              "suspension.suspendedBy": null,
              "suspension.autoRemovedAt": serverTimestamp(),
            });

            // Recargar datos actualizados
            const updatedDoc = await getDoc(doc(db, "users", userId));
            if (updatedDoc.exists()) {
              const updatedUserData = updatedDoc.data();
              // 🔥 IMPORTANTE: Actualizar PRIMERO isSuspended, luego userData
              setIsSuspended(false);
              setUserData(updatedUserData);

              // Limpiar el intervalo
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log("🛑 Polling detenido");
              }
              return true; // Suspensión expirada y limpiada
            }
          }
        }

        // Actualizar userData pero mantener suspensión
        setUserData(userData);
      }

      return false; // Suspensión sigue activa
    } catch (error) {
      console.error("❌ Error verificando suspensión:", error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Recargar información del usuario
          await firebaseUser.reload();
          const currentUser = auth.currentUser;

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

          const providerData = currentUser.providerData || [];
          const isGoogleUser = providerData.some(
            (provider) => provider.providerId === "google.com"
          );

          if (!currentUser.emailVerified && !isGoogleUser) {
            console.log(
              "Usuario no verificado (no Google), cerrando sesión..."
            );
            await auth.signOut();
            setUser(null);
            setUserData(null);
            setCheckingVerification(false);
            setCheckingSuspension(false);
          } else {
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

    return () => {
      unsubscribe();
      // Limpiar el intervalo al desmontar
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [initializing]);

  // 🔥 NUEVO: Efecto separado para manejar el polling cuando está suspendido
  useEffect(() => {
    // Limpiar cualquier intervalo existente primero
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Solo iniciar polling si el usuario está suspendido
    if (isSuspended && user?.uid) {
      console.log("🚀 Iniciando polling para verificar cambios en suspensión");

      // Verificar inmediatamente al inicio
      checkSuspensionStatus(user.uid);

      // Luego verificar cada 3 segundos
      pollingIntervalRef.current = setInterval(() => {
        checkSuspensionStatus(user.uid);
      }, 3000); // Verificar cada 3 segundos
    }

    // Limpiar al desmontar o cuando cambien las dependencias
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log("🛑 Polling limpiado por cambio de dependencias");
      }
    };
  }, [isSuspended, user?.uid]); // Solo depender de isSuspended y user.uid

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
    suspensionData: userData?.suspension,
  });

  // 🔥 Log de decisión de render
  if (!user) {
    console.log("🔵 Renderizando: Pantallas de autenticación (no user)");
  } else if (isSuspended) {
    console.log("🔴 Renderizando: SuspendedScreen (isSuspended=true)");
  } else {
    console.log("🟢 Renderizando: Pantallas principales (Home)");
  }

  // Renderizar pantallas según estado
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer key={`container-${user?.uid}-${isSuspended}`}>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            key={`nav-${user?.uid}-${isSuspended}`} // 🔥 Clave única para forzar re-mount
          >
            {!user ? (
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
              <Stack.Screen name="Suspended">
                {(props) => (
                  <SuspendedScreen
                    {...props}
                    userData={userData}
                    onLogoutSuccess={() => {
                      setUser(null);
                      setUserData(null);
                      setIsSuspended(false);
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
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
