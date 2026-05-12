import { useLocalSearchParams, router } from 'expo-router';
import StrokeOrderViewer from '@/components/StrokeOrderViewer';
import { View, StyleSheet } from 'react-native';

export default function StrokeOrderScreen() {
  const { char, lang } = useLocalSearchParams<{ char: string; lang: string }>();

  const validLang = lang === 'Tiếng Nhật' ? 'Tiếng Nhật' : 'Tiếng Trung';

  return (
    <View style={styles.container}>
      <StrokeOrderViewer
        character={char || '好'}
        language={validLang}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
});
