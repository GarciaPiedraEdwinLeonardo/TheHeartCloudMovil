// screens/HomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Button, Card, IconButton } from 'react-native-paper';

const HomeScreen = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const features = [
    { icon: 'forum', title: 'Foros Especializados', color: '#22c55e' },
    { icon: 'account-check', title: 'Verificación Profesional', color: '#8b5cf6' },
    { icon: 'chart-line', title: 'Sistema de Reputación', color: '#2a55ff' },
    { icon: 'file-document', title: 'Casos Clínicos', color: '#004aad' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logoprincipal.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>Bienvenido a TheHeartCloud</Text>
          <Text style={styles.subtitle}>Comunidad médica especializada</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.mainCard}>
            <Card.Content style={styles.cardContent}>
              <Image 
                source={require('../../assets/images/logoprincipal.png')} 
                style={styles.cardLogo}
                resizeMode="contain"
              />
              <Text style={styles.cardTitle}>¡Hola de nuevo!</Text>
              <Text style={styles.cardText}>
                La pantalla principal se desarrollará próximamente.{'\n'}
                Aquí estarán los foros, perfiles y todas las funcionalidades.
              </Text>
            </Card.Content>
          </Card>

          <Text style={styles.sectionTitle}>Características principales</Text>
          
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Card key={index} style={styles.featureCard}>
                <Card.Content style={styles.featureContent}>
                  <IconButton
                    icon={feature.icon}
                    size={32}
                    iconColor={feature.color}
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <IconButton
                icon="information"
                size={24}
                iconColor="#004AAD"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Explora todas las funcionalidades médicas especializadas disponibles en nuestra plataforma.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          icon="logout"
        >
          Cerrar Sesión
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  mainCard: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  cardLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  featureContent: {
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    margin: 0,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#5170FF',
    borderRadius: 12,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIcon: {
    margin: 0,
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#004AAD',
    flex: 1,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  logoutButton: {
    backgroundColor: '#2a55ff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default HomeScreen;