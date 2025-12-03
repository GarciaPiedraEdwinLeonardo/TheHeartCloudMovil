// screens/VerificationSentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VerificationSentScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const { loading, setLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const handleResendVerification = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      await setDoc(doc(db, 'users', currentUser.uid), {
        emailVerificationSentAt: new Date(),
      }, { merge: true });
      Alert.alert('Éxito', 'Email de verificación reenviado');
    } catch (error) {
      Alert.alert('Error', 'Error al reenviar el email. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="email-check" size={80} color="#3b82f6" />
        </View>

        <Text style={styles.title}>Verifica tu email</Text>

        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Email de verificación enviado</Text>
          <Text style={styles.successText}>
            Hemos enviado un enlace de verificación a{'\n'}
            <Text style={styles.emailText}>{email}</Text>
            {'\n\n'}
            Por favor revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
            Después de activar tu cuenta inicia sesión
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Importante:</Text>
          <View style={styles.listItem}>
            <Icon name="clock-alert" size={16} color="#92400e" />
            <Text style={styles.listText}> Tienes 24 horas para verificar tu cuenta</Text>
          </View>
          <View style={styles.listItem}>
            <Icon name="email-alert" size={16} color="#92400e" />
            <Text style={styles.listText}> Revisa tu carpeta de spam o correo no deseado</Text>
          </View>
          <View style={styles.listItem}>
            <Icon name="delete-clock" size={16} color="#92400e" />
            <Text style={styles.listText}> Si no verificas en 24 horas, tu cuenta se eliminará automáticamente</Text>
          </View>
          <View style={styles.listItem}>
            <Icon name="timer-sand" size={16} color="#92400e" />
            <Text style={styles.listText}> Solo puedes solicitar un nuevo email cada 1 hora</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resendButton, loading && styles.buttonDisabled]}
          onPress={handleResendVerification}
          disabled={loading}
        >
          <Text style={styles.resendButtonText}>
            {loading ? 'Enviando...' : 'Reenviar email de verificación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
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
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  successBox: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  successTitle: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  successText: {
    color: '#1e40af',
    fontSize: 14,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    color: '#92400e',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listText: {
    color: '#92400e',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  resendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerificationSentScreen;