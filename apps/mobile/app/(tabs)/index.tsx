import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';

export default function LearnScreen() {
  const { user, authLoading, handleSignIn, handleSignOut } = useUser();

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4a7a4a" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Amgi</Text>
        <Text style={styles.subtitle}>Learn Korean words with AI</Text>
        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
          <Text style={styles.signInText}>Sign in with Google</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.subtitle}>Signed in as {user.email}</Text>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a2e1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#4a7a4a', marginBottom: 40, textAlign: 'center' },
  signInButton: { backgroundColor: '#4a7a4a', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOutButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  signOutText: { color: '#4a7a4a', fontSize: 14 },
});
