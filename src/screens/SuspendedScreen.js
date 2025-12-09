import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import {
  IconButton,
  Card,
  Button,
  ProgressBar,
  ActivityIndicator,
} from "react-native-paper";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const SuspendedScreen = ({ route, navigation, onLogoutSuccess }) => {
  // Obtener userData de los parámetros de navegación
  const { userData: routeUserData } = route.params || {};
  const [timeLeft, setTimeLeft] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localUserData, setLocalUserData] = useState(routeUserData);
  const [timePercentage, setTimePercentage] = useState(0);

  // Si no tenemos userData de los parámetros, intentar cargarlo
  useEffect(() => {
    const loadUserData = async () => {
      if (!localUserData && auth.currentUser) {
        try {
          console.log("Cargando datos del usuario desde Firestore...");
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Datos del usuario cargados:", userData);
            setLocalUserData(userData);
          }
        } catch (error) {
          console.error("Error cargando datos del usuario:", error);
        }
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (!localUserData?.suspension) {
      console.log("No hay datos de suspensión");
      return;
    }

    console.log("Datos de suspensión:", localUserData.suspension);

    // Verificar si la suspensión es permanente
    const permanent = !localUserData.suspension.endDate;
    setIsPermanent(permanent);
    console.log("Es permanente:", permanent);

    const calculateTimeLeft = () => {
      if (permanent) {
        return { text: "Permanente", percentage: 0 };
      }

      let endDate;
      let startDate;

      // Manejar diferentes formatos de fecha
      if (localUserData.suspension.endDate?.toDate) {
        endDate = localUserData.suspension.endDate.toDate();
      } else if (localUserData.suspension.endDate?.seconds) {
        endDate = new Date(localUserData.suspension.endDate.seconds * 1000);
      } else if (localUserData.suspension.endDate) {
        endDate = new Date(localUserData.suspension.endDate);
      } else {
        return { text: "Fecha no disponible", percentage: 0 };
      }

      if (localUserData.suspension.startDate?.toDate) {
        startDate = localUserData.suspension.startDate.toDate();
      } else if (localUserData.suspension.startDate?.seconds) {
        startDate = new Date(localUserData.suspension.startDate.seconds * 1000);
      } else if (localUserData.suspension.startDate) {
        startDate = new Date(localUserData.suspension.startDate);
      } else {
        startDate = new Date(); // Si no hay startDate, usar ahora
      }

      const now = new Date();
      const totalDuration = endDate - startDate;
      const elapsed = now - startDate;
      const remaining = endDate - now;

      // Calcular porcentaje
      const percentage = Math.min(
        Math.max((elapsed / totalDuration) * 100, 0),
        100
      );
      setTimePercentage(percentage);

      if (remaining <= 0) {
        return { text: "La suspensión ha expirado", percentage: 100 };
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      let text = "";
      if (days > 0) {
        text = `${days} día${days > 1 ? "s" : ""}, ${hours} hora${
          hours > 1 ? "s" : ""
        }`;
      } else if (hours > 0) {
        text = `${hours} hora${hours > 1 ? "s" : ""}, ${minutes} minuto${
          minutes > 1 ? "s" : ""
        }`;
      } else if (minutes > 0) {
        text = `${minutes} minuto${minutes > 1 ? "s" : ""}, ${seconds} segundo${
          seconds > 1 ? "s" : ""
        }`;
      } else {
        text = `${seconds} segundo${seconds > 1 ? "s" : ""}`;
      }

      return { text, percentage };
    };

    const updateTimer = () => {
      const result = calculateTimeLeft();
      setTimeLeft(result.text);
    };

    updateTimer();

    // Verificar y limpiar suspensión expirada automáticamente
    const checkExpiredSuspension = async () => {
      if (permanent) return;

      let endDate;
      if (localUserData.suspension.endDate?.toDate) {
        endDate = localUserData.suspension.endDate.toDate();
      } else if (localUserData.suspension.endDate?.seconds) {
        endDate = new Date(localUserData.suspension.endDate.seconds * 1000);
      } else if (localUserData.suspension.endDate) {
        endDate = new Date(localUserData.suspension.endDate);
      } else {
        return;
      }

      const now = new Date();

      if (now >= endDate) {
        try {
          console.log("Suspensión expirada - limpiando automáticamente");
          setLoading(true);
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            "suspension.isSuspended": false,
            "suspension.reason": null,
            "suspension.startDate": null,
            "suspension.endDate": null,
            "suspension.suspendedBy": null,
            "suspension.autoRemovedAt": serverTimestamp(),
          });

          // Redirigir al login
          Alert.alert(
            "✅ Suspensión expirada",
            "Tu suspensión ha expirado. Por favor, inicia sesión nuevamente.",
            [
              {
                text: "Iniciar Sesión",
                onPress: () => {
                  signOut(auth);
                  navigation.replace("Login");
                },
              },
            ]
          );
        } catch (error) {
          console.error("Error limpiando suspensión:", error);
          Alert.alert(
            "Error",
            "No se pudo limpiar la suspensión automáticamente"
          );
        } finally {
          setLoading(false);
        }
      }
    };

    checkExpiredSuspension();

    // Actualizar cada segundo si no es permanente
    if (!permanent) {
      const interval = setInterval(() => {
        updateTimer();
        checkExpiredSuspension();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [localUserData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      if (onLogoutSuccess) {
        onLogoutSuccess();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "No disponible";
    try {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha no disponible";
    }
  };

  const handleCheckAgain = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // Recargar datos del usuario
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setLocalUserData(userData);

        // Verificar si la suspensión ya expiró
        if (userData.suspension?.isSuspended) {
          const endDate = userData.suspension.endDate?.toDate
            ? userData.suspension.endDate.toDate()
            : userData.suspension.endDate?.seconds
            ? new Date(userData.suspension.endDate.seconds * 1000)
            : null;

          if (endDate && new Date() >= endDate) {
            Alert.alert(
              "Suspensión expirada",
              "Tu suspensión ha expirado. Por favor, reinicia la aplicación.",
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Suspensión activa",
              "Tu suspensión aún está activa. Por favor, espera hasta que expire.",
              [{ text: "OK" }]
            );
          }
        } else {
          Alert.alert(
            "Suspensión removida",
            "Tu suspensión ha sido removida. Por favor, reinicia la aplicación.",
            [{ text: "OK", onPress: () => navigation.replace("Login") }]
          );
        }
      }
    } catch (error) {
      console.error("Error verificando suspensión:", error);
      Alert.alert("Error", "No se pudo verificar el estado de la suspensión");
    } finally {
      setLoading(false);
    }
  };

  // Si no hay datos del usuario, mostrar loading
  if (!localUserData) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.safeArea}>
          <View style={styles.loadingContent}>
            <IconButton
              icon="clock"
              size={64}
              iconColor="#2a55ff"
              style={styles.loadingIcon}
            />
            <Text style={styles.loadingTitle}>Cargando información</Text>
            <Text style={styles.loadingText}>
              Obteniendo datos de suspensión...
            </Text>
            <ActivityIndicator
              size="large"
              color="#2a55ff"
              style={styles.spinner}
            />
          </View>
        </View>
      </View>
    );
  }

  // Si el usuario no está suspendido (por si acaso), redirigir
  if (!localUserData.suspension?.isSuspended) {
    return (
      <View style={styles.notSuspendedContainer}>
        <View style={styles.safeArea}>
          <View style={styles.notSuspendedContent}>
            <IconButton
              icon="check-circle"
              size={80}
              iconColor="#10b981"
              style={styles.successIcon}
            />
            <Text style={styles.notSuspendedTitle}>Cuenta Activa</Text>
            <Text style={styles.notSuspendedText}>
              Tu cuenta no está suspendida. Puedes acceder normalmente.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.replace("Home")}
              style={styles.goHomeButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="home"
            >
              Ir al Inicio
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>TheHeartCloud</Text>
            <Text style={styles.logoSubtitle}>Comunidad Médica</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {/* Icono de suspensión */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <IconButton
                  icon="account-cancel"
                  size={48}
                  iconColor="#ef4444"
                  style={styles.icon}
                />
              </View>
            </View>

            {/* Título */}
            <Text style={styles.title}>Cuenta Suspendida</Text>

            {/* Mensaje de advertencia */}
            <View style={styles.messageContainer}>
              <IconButton
                icon="alert-circle"
                size={24}
                iconColor="#dc2626"
                style={styles.messageIcon}
              />
              <View style={styles.messageTextContainer}>
                <Text style={styles.messageTitle}>Aviso importante</Text>
                <Text style={styles.messageText}>
                  Tu cuenta ha sido suspendida por violar nuestros términos de
                  servicio.
                  {isPermanent
                    ? " Esta suspensión es permanente."
                    : " Tu acceso será restaurado automáticamente cuando la suspensión expire."}
                </Text>
              </View>
            </View>

            {/* Información de la suspensión */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Detalles de la suspensión</Text>

              {/* Razón */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <IconButton
                    icon="comment-alert"
                    size={20}
                    iconColor="#8b5cf6"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoLabel}>Motivo</Text>
                </View>
                <Text style={styles.infoValue}>
                  {localUserData.suspension?.reason || "No especificado"}
                </Text>
              </View>

              {/* Fecha de inicio */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <IconButton
                    icon="calendar"
                    size={20}
                    iconColor="#0ea5e9"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoLabel}>Fecha de suspensión</Text>
                </View>
                <Text style={styles.infoValue}>
                  {formatDate(localUserData.suspension?.startDate)}
                </Text>
              </View>

              {/* Suspended By */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <IconButton
                    icon="shield-account"
                    size={20}
                    iconColor="#f59e0b"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoLabel}>Suspendido por</Text>
                </View>
                <Text style={styles.infoValue}>
                  {localUserData.suspension?.suspendedBy || "Administrador"}
                </Text>
              </View>

              {/* Tiempo restante */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <IconButton
                    icon={isPermanent ? "infinity" : "clock"}
                    size={20}
                    iconColor={isPermanent ? "#ef4444" : "#10b981"}
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoLabel}>
                    {isPermanent ? "Duración" : "Tiempo restante"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.infoValue,
                    isPermanent && styles.permanentText,
                  ]}
                >
                  {isPermanent ? "Suspensión permanente" : timeLeft}
                </Text>

                {/* Barra de progreso para suspensiones temporales */}
                {!isPermanent && timePercentage > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressText}>Inicio</Text>
                      <Text style={styles.progressText}>
                        {Math.round(timePercentage)}%
                      </Text>
                      <Text style={styles.progressText}>Fin</Text>
                    </View>
                    <ProgressBar
                      progress={timePercentage / 100}
                      color="#2a55ff"
                      style={styles.progressBar}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Información adicional */}
            <View style={styles.additionalInfo}>
              <IconButton
                icon="information"
                size={24}
                iconColor="#1d4ed8"
                style={styles.additionalInfoIcon}
              />
              <View style={styles.additionalInfoTextContainer}>
                <Text style={styles.additionalInfoTitle}>
                  ¿Qué puedes hacer?
                </Text>
                <Text style={styles.additionalInfoText}>
                  {isPermanent
                    ? "Si crees que esta suspensión es un error, puedes contactar al soporte para apelar esta decisión."
                    : "Mantén la aplicación abierta para ver el tiempo restante. Tu acceso se restaurará automáticamente."}
                </Text>
              </View>
            </View>

            {/* Acciones */}
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                onPress={handleLogout}
                style={styles.logoutButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="logout"
                loading={loading}
                disabled={loading}
              >
                {loading ? "Procesando..." : "Cerrar Sesión"}
              </Button>

              {!isPermanent && (
                <Button
                  mode="outlined"
                  onPress={handleCheckAgain}
                  style={styles.checkButton}
                  contentStyle={styles.checkButtonContent}
                  labelStyle={styles.checkButtonLabel}
                  icon="reload"
                  disabled={loading}
                >
                  Verificar estado
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fef2f2",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fef2f2",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingIcon: {
    margin: 0,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 30,
  },
  spinner: {
    marginTop: 20,
  },
  notSuspendedContainer: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  notSuspendedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successIcon: {
    margin: 0,
    marginBottom: 20,
    backgroundColor: "#dcfce7",
    borderRadius: 50,
  },
  notSuspendedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 12,
  },
  notSuspendedText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  goHomeButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    width: "100%",
    maxWidth: 300,
  },
  // Header
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2a55ff",
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  // Card
  card: {
    borderRadius: 20,
    backgroundColor: "white",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: "hidden",
  },
  cardContent: {
    padding: 24,
  },
  // Icon
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    margin: 0,
  },
  // Title
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  // Message
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  messageIcon: {
    margin: 0,
    marginRight: 12,
  },
  messageTextContainer: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7f1d1d",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#7f1d1d",
    fontWeight: "500",
    lineHeight: 20,
  },
  // Info Section
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    margin: 0,
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  infoValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  permanentText: {
    color: "#ef4444",
    fontWeight: "700",
  },
  // Progress Bar
  progressContainer: {
    marginTop: 12,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  // Additional Info
  additionalInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  additionalInfoIcon: {
    margin: 0,
    marginRight: 12,
  },
  additionalInfoTextContainer: {
    flex: 1,
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 4,
  },
  additionalInfoText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
    lineHeight: 20,
  },
  // Actions
  actionsContainer: {
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  checkButton: {
    borderColor: "#6b7280",
    borderRadius: 12,
  },
  checkButtonContent: {
    paddingVertical: 10,
  },
  checkButtonLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  footerCopyright: {
    fontSize: 12,
    color: "#9ca3af",
  },
});

export default SuspendedScreen;
