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
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { TextInput, Button, Card } from "react-native-paper";

const LoginScreen = ({ navigation }) => {
  const { loading, setLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
  });

  const validateEmail = (email) => {
    if (!email) return "El email es requerido";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Formato de email inválido";
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return "Ingresa una contraseña";
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
      default:
        break;
    }
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
    return !error;
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    const isEmailValid = validateField("email", formData.email);
    const isPasswordValid = validateField("password", formData.password);
    if (!isEmailValid || !isPasswordValid) {
      setLoading(false);
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // OBTENER LOS PROVEEDORES DEL USUARIO
      const providerData = user.providerData || [];
      const isGoogleUser = providerData.some(
        (provider) => provider.providerId === "google.com"
      );

      // Solo requerir verificación para usuarios NO de Google
      // Usuarios de Google (que pusieron contraseña después) pueden entrar sin verificación
      if (!user.emailVerified && !isGoogleUser) {
        await auth.signOut();
        Alert.alert(
          "Verificación requerida",
          "Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada y carpeta de spam."
        );
        setLoading(false);
        return;
      }

      // Actualizar lastLogin en Firestore
      await updateDoc(doc(db, "users", user.uid), {
        lastLogin: new Date(),
        emailVerified: true, // Asegurar que está marcado como verificado
      });
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    if (!errorCode) return "Error al iniciar sesión. Intenta nuevamente.";
    switch (errorCode) {
      case "auth/invalid-email":
        return "El correo electrónico es inválido";
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "El correo electrónico o contraseña no es válido.";
      default:
        return `Error al iniciar sesión: ${errorCode}. Intenta nuevamente.`;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logoprincipal.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>TheHeartCloud</Text>
          <Text style={styles.subtitle}>Comunidad médica especializada</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>

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

            <Button
              mode="contained"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.linkButton}
              labelStyle={styles.linkButtonLabel}
            >
              ¿Olvidaste tu contraseña?
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate("Register")}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.outlinedButtonLabel}
            >
              Regístrate aquí
            </Button>
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
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 10,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 5,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
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
  loginButton: {
    backgroundColor: "#2a55ff",
    borderRadius: 12,
    marginTop: 8,
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
  linkButton: {
    marginTop: 16,
  },
  linkButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#004AAD",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    color: "#64748b",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  registerButton: {
    borderColor: "#004AAD",
    borderRadius: 12,
  },
  outlinedButtonLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004AAD",
    letterSpacing: 0.3,
  },
});

export default LoginScreen;
