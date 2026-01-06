import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { TextInput, Button, Card, IconButton } from "react-native-paper";
import Constants from "expo-constants";

const RegisterScreen = ({ navigation }) => {
  const { loading, setLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const validateEmail = (email) => {
    if (!email) return "El email es requerido";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Formato de email inválido";
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return "Ingresa una contraseña";
    if (password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres";
    if (password.length > 18)
      return "La contraseña debe tener como máximo 18 caracteres";
    const allowedChars = /^[a-zA-Z0-9]+$/;
    if (!allowedChars.test(password))
      return "Solo se permiten letras y números sin espacios";
    if (!/(?=.*[a-z])/.test(password))
      return "Debe contener al menos una minúscula";
    if (!/(?=.*[A-Z])/.test(password))
      return "Debe contener al menos una mayúscula";
    if (!/(?=.*\d)/.test(password)) return "Debe contener al menos un número";
    return null;
  };

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "email":
        error = validateEmail(value);
        break;
      case "password":
        error = validatePassword(value);
        break;
      case "confirmPassword":
        if (value !== formData.password) error = "Las contraseñas no coinciden";
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  // Limpiar usuario no verificado existente
  const cleanupExistingUnverifiedUser = async (email) => {
    try {
      console.log("🔍 Buscando usuarios previos con email:", email);

      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        where("emailVerified", "==", false)
      );

      const snapshot = await getDocs(q);

      console.log("📊 Usuarios encontrados:", snapshot.size);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const now = new Date();
        const expiresAt = userData.verificationExpiresAt?.toDate();
        const lastSent = userData.emailVerificationSentAt?.toDate();

        console.log("📅 Ahora:", now);
        console.log("⏰ Expira:", expiresAt);
        console.log("❓ ¿Expiró?:", expiresAt && expiresAt < now);

        // Si ya expiró, eliminar completamente (Firestore + Auth)
        if (expiresAt && expiresAt < now) {
          console.log("🗑️ Usuario expirado encontrado, eliminando...");

          // Intentar llamar al backend para eliminar de Auth y Firestore
          // Nota: Necesitarás configurar tu BACKEND_URL en un archivo de configuración
          const backendUrl = Constants.expoConfig.extra.backendUrl;

          if (backendUrl) {
            try {
              const response = await fetch(
                `${backendUrl}/api/auth/delete-unverified`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, userId: userDoc.id }),
                }
              );

              const result = await response.json();

              if (response.ok && result.success) {
                console.log(
                  "✅ Usuario eliminado completamente (Auth + Firestore)"
                );
                console.log("📋 Detalles:", result);
                return; // Usuario eliminado exitosamente
              } else {
                console.warn("⚠️ Eliminación parcial:", result);
                // Continuar de todas formas
              }
            } catch (err) {
              console.error("❌ Error llamando al backend:", err);
              // Si falla el backend, intentar eliminar solo de Firestore
              throw new Error("EXPIRED_USER_AUTH_PENDING");
            }
          } else {
            // Si no hay backend configurado, solo eliminar de Firestore
            await deleteDoc(doc(db, "users", userDoc.id));
            console.log("✅ Usuario eliminado de Firestore");
            console.warn(
              "⚠️ Backend no configurado - usuario permanece en Authentication"
            );
            throw new Error("EXPIRED_USER_AUTH_PENDING");
          }
        }

        // Si NO ha expirado, verificar tiempo de reenvío
        if (lastSent && now - lastSent < 60 * 60 * 1000) {
          const timeRemaining = Math.ceil(
            (60 * 60 * 1000 - (now - lastSent)) / 60000
          );
          throw new Error(
            `Ya se envió un email de verificación recientemente. Revisa tu bandeja de entrada y espera ${timeRemaining} minutos más.`
          );
        }

        // Eliminar el usuario no verificado existente
        console.log("🗑️ Usuario no verificado encontrado, eliminando...");
        await deleteDoc(doc(db, "users", userDoc.id));
        console.log("✅ Usuario eliminado exitosamente");
      } else {
        console.log("✨ No hay usuarios previos con este email");
      }
    } catch (error) {
      console.error("❌ Error en limpieza:", error);
      throw error;
    }
  };

  const handleEmailRegister = async () => {
    setLoading(true);
    const isEmailValid = validateField("email", formData.email);
    const isPasswordValid = validateField("password", formData.password);
    const isConfirmValid = validateField(
      "confirmPassword",
      formData.confirmPassword
    );

    if (!isEmailValid || !isPasswordValid || !isConfirmValid) {
      setLoading(false);
      return;
    }

    // Validar que coinciden las contraseñas
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      // PASO 1: Limpiar usuario no verificado existente ANTES de crear uno nuevo
      await cleanupExistingUnverifiedUser(formData.email);

      // PASO 2: Crear nuevo usuario
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // PASO 3: Enviar email de verificación
      await sendEmailVerification(user);

      // PASO 4: Calcular fecha de expiración (24 horas)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas

      // 🔥 **ESTRUCTURA DE DATOS COMPATIBLE CON LA WEB** 🔥
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: user.email,
        name: null,
        role: "unverified",
        profileMedia: null,
        professionalInfo: null,
        stats: {
          aura: 0,
          contributionCount: 0,
          postCount: 0,
          commentCount: 0,
          forumCount: 0,
          joinedForumsCount: 0,
          totalImagesUploaded: 0,
          totalStorageUsed: 0,
        },
        suspension: {
          isSuspended: false,
          reason: null,
          startDate: null,
          endDate: null,
          suspendedBy: null,
        },
        joinedForums: [],
        joinDate: new Date(),
        lastLogin: new Date(),
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        emailVerified: false,
        emailVerificationSentAt: new Date(),
        verificationExpiresAt: expiresAt, // Expira en 24 horas
        verificationAttempts: 1,
        hasPassword: true, // IMPORTANTE: Indicar que tiene contraseña
      });

      setLoading(false);

      // PASO 5: Cerrar sesión automáticamente (igual que en la web)
      await auth.signOut();

      // PASO 6: Navegar a pantalla de verificación enviada
      navigation.navigate("VerificationSent", { email: formData.email });
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    if (!errorCode) {
      return "Error al crear la cuenta. Intenta nuevamente.";
    }

    switch (errorCode) {
      case "auth/email-already-in-use":
        return "Este correo electrónico ya está registrado. Si no verificaste tu cuenta anteriormente, espera unos minutos y intenta nuevamente.";
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      case "auth/operation-not-allowed":
        return "El registro con email/contraseña no está habilitado.";
      case "auth/weak-password":
        return "La contraseña es demasiado débil.";
      default:
        if (
          typeof errorCode === "string" &&
          errorCode.includes("already-in-use")
        ) {
          return "Este email ya está en uso. Si no verificaste tu cuenta, espera 1 hora e intenta nuevamente.";
        }
        return `Error al crear la cuenta: ${errorCode}. Intenta nuevamente.`;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <Image
            source={require("../../assets/images/logoprincipal.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Crear Cuenta</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.logoTitleContainer}>
              <Image
                source={require("../../assets/images/logoprincipal.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title_card}>Crear Cuenta</Text>
            </View>

            <TextInput
              label="Correo Electrónico"
              value={formData.email}
              onChangeText={(value) => {
                const processedValue = value.slice(0, 254);
                setFormData((prev) => ({ ...prev, email: processedValue }));
                if (processedValue && fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              onBlur={() => validateField("email", formData.email)}
              mode="outlined"
              style={styles.input}
              error={!!fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
            />
            {fieldErrors.email ? (
              <Text style={styles.errorText}>{fieldErrors.email}</Text>
            ) : null}

            <TextInput
              label="Contraseña"
              value={formData.password}
              onChangeText={(value) => {
                const processedValue = value.slice(0, 18);
                setFormData((prev) => ({ ...prev, password: processedValue }));
                if (processedValue && fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }
              }}
              onBlur={() => validateField("password", formData.password)}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              error={!!fieldErrors.password}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            {fieldErrors.password ? (
              <Text style={styles.errorText}>{fieldErrors.password}</Text>
            ) : null}

            <TextInput
              label="Confirmar Contraseña"
              value={formData.confirmPassword}
              onChangeText={(value) => {
                const processedValue = value.slice(0, 18);
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: processedValue,
                }));
                if (processedValue && fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
              onBlur={() =>
                validateField("confirmPassword", formData.confirmPassword)
              }
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              error={!!fieldErrors.confirmPassword}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock-check" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            {fieldErrors.confirmPassword ? (
              <Text style={styles.errorText}>
                {fieldErrors.confirmPassword}
              </Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleEmailRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate("Login")}
                labelStyle={styles.loginLink}
              >
                Inicia sesión aquí
              </Button>
            </View>

            {/* Información adicional (igual que en la web) */}
            <Card style={styles.infoCard}>
              <Card.Content style={styles.infoContent}>
                <IconButton
                  icon="information"
                  size={20}
                  iconColor="#0369a1"
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>Nota:</Text> Las cuentas no
                  verificadas se eliminan automáticamente después de 24 horas.
                </Text>
              </Card.Content>
            </Card>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1,
    letterSpacing: -0.3,
  },
  title_card: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    color: "#1e293b",
    marginBottom: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    padding: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "white",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  registerButton: {
    backgroundColor: "#2a55ff",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  loginText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: "700",
    color: "#004AAD",
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 12,
    marginTop: 16,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  infoIcon: {
    margin: 0,
    marginRight: 12,
  },
  infoText: {
    color: "#0369a1",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  boldText: {
    fontWeight: "700",
  },
});

export default RegisterScreen;
