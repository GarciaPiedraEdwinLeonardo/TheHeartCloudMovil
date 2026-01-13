// screens/ForgotPasswordScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Image } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { TextInput, Button, Card, IconButton } from "react-native-paper";

const ForgotPasswordScreen = ({ navigation }) => {
  const { loading, setLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");

  const validateEmail = (email) => {
    if (!email) return "El email es requerido";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Formato de email inválido";
    return null;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const error = validateEmail(email);
    if (error) {
      setFieldError(error);
      setLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña."
      );
      setEmail("");
      setFieldError("");
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No existe una cuenta con este correo electrónico.";
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      default:
        return "Error al enviar el correo de recuperación. Intenta nuevamente.";
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Image
          source={require("../../assets/images/logoprincipal.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Recuperar Contraseña</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Image
            source={require("../../assets/images/logoprincipal.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.cardTitle}>Recuperar Contraseña</Text>
          <Text style={styles.cardSubtitle}>
            Ingresa tu correo electrónico y te enviaremos un enlace para
            restablecer tu contraseña.
          </Text>

          {message ? (
            <Card style={styles.successCard}>
              <Card.Content style={styles.successContent}>
                <IconButton
                  icon="check-circle"
                  size={24}
                  iconColor="#22c55e"
                  style={styles.successIcon}
                />
                <Text style={styles.successText}>{message}</Text>
              </Card.Content>
            </Card>
          ) : null}

          <TextInput
            label="Correo Electrónico"
            value={email}
            onChangeText={(value) => {
              const processedValue = value.slice(0, 254);
              setEmail(processedValue);
              if (processedValue && fieldError) setFieldError("");
            }}
            mode="outlined"
            style={styles.input}
            error={!!fieldError}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={254}
            left={<TextInput.Icon icon="email" />}
          />
          {fieldError ? (
            <Text style={styles.errorText}>{fieldError}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="email-send"
          >
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.outlinedButtonLabel}
            icon="arrow-left"
          >
            Volver al inicio de sesión
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
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
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.1,
  },
  successCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    marginBottom: 24,
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIcon: {
    margin: 0,
    marginRight: 12,
  },
  successText: {
    color: "#166534",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
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
  submitButton: {
    backgroundColor: "#2a55ff",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  backButton: {
    borderColor: "#004AAD",
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  outlinedButtonLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004AAD",
    letterSpacing: 0.3,
  },
});

export default ForgotPasswordScreen;
