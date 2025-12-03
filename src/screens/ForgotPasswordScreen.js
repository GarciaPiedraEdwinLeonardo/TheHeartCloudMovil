// screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ForgotPasswordScreen = ({ navigation }) => {
  const { loading, setLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');

  const validateEmail = (email) => {
    if (!email) return 'El email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Formato de email inválido';
    if (email.length > 254) return 'El email no puede ser de esa longitud';
    if (email.length < 6) return 'El email no puede ser tan corto';
    const invalidChars = /[<>()\[\]\\;:,@"]/;
    if (invalidChars.test(email.split('@')[0])) {
      return 'El email contiene caracteres no permitidos';
    }
    return null;
  };

  const validateField = (value) => {
    const error = validateEmail(value);
    setFieldError(error);
    return !error;
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!validateField(email)) {
      setLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.');
      setEmail('');
      setFieldError('');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No existe una cuenta con este correo electrónico.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      default:
        return 'Error al enviar el correo de recuperación. Intenta nuevamente.';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.title}>Recuperar Contraseña</Text>
      </View>

      <View style={styles.formContainer}>
        {message ? (
          <View style={styles.messageBox}>
            <Icon name="check-circle" size={24} color="#059669" />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={[styles.input, fieldError && styles.inputError]}
            placeholder="tu@correo.com"
            value={email}
            onChangeText={(value) => {
              const processedValue = value.length > 254 ? value.slice(0, 254) : value;
              setEmail(processedValue);
              if (processedValue) validateField(processedValue);
              else setFieldError('');
            }}
            onBlur={() => validateField(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={254}
          />
          {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  messageText: {
    color: '#065f46',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;