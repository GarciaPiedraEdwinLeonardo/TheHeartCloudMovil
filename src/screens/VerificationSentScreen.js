// screens/VerificationSentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, IconButton } from 'react-native-paper';

const VerificationSentScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const { loading, setLoading } = useAuth();
  const [currentUser] = useState(auth.currentUser);

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

  const features = [
    { icon: 'clock-alert', text: 'Tienes 24 horas para verificar tu cuenta' },
    { icon: 'email-alert', text: 'Revisa tu carpeta de spam o correo no deseado' },
    { icon: 'delete-clock', text: 'Si no verificas en 24 horas, tu cuenta se eliminará automáticamente' },
    { icon: 'timer-sand', text: 'Solo puedes solicitar un nuevo email cada 1 hora' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Image 
            source={require('../../assets/images/logoprincipal.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>Verifica tu email</Text>
          <Text style={styles.subtitle}>
            Hemos enviado un enlace de verificación a:
          </Text>
          <Text style={styles.email}>{email}</Text>

          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <IconButton
                icon="information"
                size={24}
                iconColor="#0369a1"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Por favor revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                Después de activar tu cuenta inicia sesión
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.warningCard}>
            <Card.Content>
              <Text style={styles.warningTitle}>Importante:</Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <IconButton
                    icon={feature.icon}
                    size={18}
                    iconColor="#92400e"
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleResendVerification}
            loading={loading}
            disabled={loading}
            style={styles.resendButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="email-send"
          >
            {loading ? 'Enviando...' : 'Reenviar email de verificación'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.outlinedButtonLabel}
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
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#121823ff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  email: {
    fontSize: 17,
    fontWeight: '700',
    color: '#004AAD',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.1,
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    marginBottom: 24,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    margin: 0,
    marginRight: 12,
  },
  infoText: {
    color: '#004AAD',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 12,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    margin: 0,
    marginRight: 10,
  },
  featureText: {
    color: '#92400e',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  resendButton: {
    backgroundColor: '#2a55ff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  backButton: {
    borderColor: '#004AAD',
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlinedButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#004AAD',
    letterSpacing: 0.3,
  },
});

export default VerificationSentScreen;