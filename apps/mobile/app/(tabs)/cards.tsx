import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CardsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cards</Text>
      <Text style={styles.subtitle}>Your saved flashcards</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a2e1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#4a7a4a' },
});
