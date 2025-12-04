// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = ({ navigation }) => {
  const { loading, setLoading, error, setError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
  });

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

  const validatePassword = (password) => {
    if (!password) return 'Ingresa una contraseña';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (password.length > 18) return 'La contraseña debe tener como máximo 18 caracteres';
    const allowedChars = /^[a-zA-Z0-9]+$/;
    if (!allowedChars.test(password)) return 'Solo se permiten letras y números sin espacios';
    return null;
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      default:
        break;
    }
    setFieldErrors(prev => ({
      ...prev,
      [name]: error,
    }));
    return !error;
  };

  const handleChange = (name, value) => {
    let processedValue = value;
    if (name === 'email' && value.length > 254) {
      processedValue = value.slice(0, 254);
    } else if (name === 'password' && value.length > 18) {
      processedValue = value.slice(0, 18);
    }
    if (name === 'password' && value.length > 0) {
      const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
      processedValue = filteredValue.slice(0, 18);
    }
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
    if (processedValue) {
      validateField(name, processedValue);
    } else {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const cleanupExpiredUser = async (user) => {
    try {
      // Esta función debería implementarse según tu lógica en Firestore
      // Por ahora retornamos false
      return false;
    } catch (error) {
      console.error('Error cleaning up expired user:', error);
      return false;
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError('');
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);
    if (!isEmailValid || !isPasswordValid) {
      setLoading(false);
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        const wasDeleted = await cleanupExpiredUser(user);
        if (wasDeleted) {
          await auth.signOut();
          Alert.alert(
            'Error',
            'El enlace de verificación ha expirado. Por favor regístrate nuevamente.'
          );
          setLoading(false);
          return;
        }
        await auth.signOut();
        Alert.alert(
          'Verificación requerida',
          'Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada y carpeta de spam.'
        );
        setLoading(false);
        return;
      }
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date(),
        emailVerified: true,
      });
    } catch (error) {
      setError(getErrorMessage(error.code));
      Alert.alert('Error', getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    if (!errorCode) return 'Error al iniciar sesión. Intenta nuevamente.';
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'El correo electrónico es inválido';
      case 'auth/invalid-credential':
        return 'El correo electrónico o contraseña no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'auth/user-not-found':
        return 'No existe una cuenta con este correo electrónico. Regístrate primero.';
      case 'auth/wrong-password':
        return 'La contraseña es incorrecta.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta más tarde.';
      case 'auth/invalid-login-credentials':
        return 'Correo o contraseña incorrectos. Verifica tus datos.';
      default:
        return `Error al iniciar sesión: ${errorCode}. Intenta nuevamente.`;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <image>source={require('../../assets/images/logoprincipal.png')} style={styles.logo}</image>
          <Icon name="heart-pulse" size={80} color="#3b82f6" />
          <Text style={styles.logoText}>TheHeartCloud</Text>
          <Text style={styles.subtitle}>Comunidad médica especializada</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Iniciar Sesión</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              placeholder="tu@correo.com"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              onBlur={() => validateField('email', formData.email)}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
            />
            {fieldErrors.email ? (
              <Text style={styles.errorText}>{fieldErrors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.passwordContainer, fieldErrors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                onBlur={() => validateField('password', formData.password)}
                secureTextEntry={!showPassword}
                maxLength={18}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.errorText}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
   logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 5,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    color: '#6b7280',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  registerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;