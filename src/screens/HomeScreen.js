// screens/HomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeScreen = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenido a TheHeartCloud</Text>
        <Text style={styles.subtitle}>Comunidad médica especializada</Text>
      </View>

      <View style={styles.content}>
        <Icon name="heart-pulse" size={120} color="#3b82f6" style={styles.mainIcon} />
        <Text style={styles.message}>
          La pantalla principal se desarrollará próximamente.{'\n'}
          Aquí estarán los foros, perfiles y todas las funcionalidades.
        </Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Icon name="forum" size={40} color="#10b981" />
            <Text style={styles.featureText}>Foros Especializados</Text>
          </View>
          <View style={styles.feature}>
            <Icon name="account-check" size={40} color="#8b5cf6" />
            <Text style={styles.featureText}>Verificación Profesional</Text>
          </View>
          <View style={styles.feature}>
            <Icon name="chart-line" size={40} color="#3b82f6" />
            <Text style={styles.featureText}>Sistema de Reputación</Text>
          </View>
          <View style={styles.feature}>
            <Icon name="file-document" size={40} color="#10b981" />
            <Text style={styles.featureText}>Casos Clínicos</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="white" />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIcon: {
    marginBottom: 32,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  feature: {
    width: 150,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    margin: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;