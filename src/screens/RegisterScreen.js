// screens/RegisterScreen.js
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
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RegisterScreen = ({ navigation }) => {
  const { loading, setLoading, error, setError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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
    if (!/(?=.*[a-z])/.test(password)) return 'Debe contener al menos una minúscula';
    if (!/(?=.*[A-Z])/.test(password)) return 'Debe contener al menos una mayúscula';
    if (!/(?=.*\d)/.test(password)) return 'Debe contener al menos un número';
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
      case 'confirmPassword':
        if (value !== formData.password) error = 'Las contraseñas no coinciden';
        break;
      default:
        break;
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (name, value) => {
    let processedValue = value;
    if (name === 'email' && value.length > 254) {
      processedValue = value.slice(0, 254);
    } else if ((name === 'password' || name === 'confirmPassword') && value.length > 18) {
      processedValue = value.slice(0, 18);
    }
    if ((name === 'password' || name === 'confirmPassword') && value.length > 0) {
      const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
      processedValue = filteredValue.slice(0, 18);
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (processedValue) {
      validateField(name, processedValue);
    } else {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const cleanupExistingUnverifiedUser = async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), where('emailVerified', '==', false));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const now = new Date();
        const lastSent = userData.emailVerificationSentAt?.toDate();
        if (lastSent && (now - lastSent) < (60 * 60 * 1000)) {
          throw new Error('Ya se envió un email de verificación recientemente. Espera al menos 1 hora.');
        }
        await deleteDoc(doc(db, 'users', userDoc.id));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEmailRegister = async () => {
    setLoading(true);
    setError('');
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);
    const isConfirmValid = validateField('confirmPassword', formData.confirmPassword);
    if (!isEmailValid || !isPasswordValid || !isConfirmValid) {
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }
    try {
      await cleanupExistingUnverifiedUser(formData.email);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        role: "unverified",
        stats: { aura: 0, contributionCount: 0, postCount: 0, commentCount: 0 },
        suspension: { isSuspended: false },
        joinedForums: [],
        joinDate: new Date(),
        lastLogin: new Date(),
        isActive: true,
        isDeleted: false,
        emailVerified: false,
        emailVerificationSentAt: new Date(),
        verificationExpiresAt: expiresAt,
        verificationAttempts: 1,
      });
      await auth.signOut();
      navigation.navigate('VerificationSent', { email: formData.email });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    if (!errorCode) return 'Error al crear la cuenta. Intenta nuevamente.';
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado. Si no verificaste tu cuenta anteriormente, espera unos minutos.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/operation-not-allowed':
        return 'El registro no está habilitado.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      default:
        if (typeof errorCode === 'string' && errorCode.includes('already-in-use')) {
          return 'Este email ya está en uso. Espera 1 hora e intenta nuevamente.';
        }
        return `Error al crear la cuenta: ${errorCode}. Intenta nuevamente.`;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logoprincipal.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Icon name="heart-pulse" size={60} color="#3b82f6" />
          <Text style={styles.logoText}>TheHeartCloud</Text>
          <Text style={styles.subtitle}>Crear cuenta</Text>
        </View>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.title}>Crear Cuenta</Text>
        </View>

        <View style={styles.formContainer}>
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
            {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.passwordContainer, fieldErrors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Entre 8 y 18 caracteres"
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
            {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={[styles.passwordContainer, fieldErrors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange('confirmPassword', value)}
                onBlur={() => validateField('confirmPassword', formData.confirmPassword)}
                secureTextEntry={!showConfirmPassword}
                maxLength={18}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmPassword ? (
              <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleEmailRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Text>
          </TouchableOpacity>

          <View style={styles.noteContainer}>
            <Icon name="information" size={20} color="#3b82f6" />
            <Text style={styles.noteText}>
              Nota: Las cuentas no verificadas se eliminan automáticamente después de 24 horas.
            </Text>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Inicia sesión aquí</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
   logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
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
  inputContainer: {
    marginBottom: 20,
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
  registerButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  noteText: {
    color: '#1e40af',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;