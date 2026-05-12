import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// HanziVG API: trả SVG với animation nét chữ
const HANZIVG_URL = (char: string) =>
  `https://hanzivg.tagaini.net/hanzi/${encodeURIComponent(char)}`;

// KanjiVG raw SVG (cdn.jsdelivr.net)
const KANJIVG_URL = (char: string) =>
  `https://cdn.jsdelivr.net/npm/kanjivg@latest/kanji/${char.charCodeAt(0).toString(16).padStart(5, '0')}.svg`;

type Props = {
  character: string;
  language: 'Tiếng Trung' | 'Tiếng Nhật';
  onClose: () => void;
};

// HTML template: hiển thị SVG + nút replay animation
const buildHtml = (svgUrl: string, char: string) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: -apple-system, sans-serif;
  }
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
  }
  .char-display {
    font-size: 120px;
    color: #fff;
    font-weight: 300;
    text-shadow: 0 0 40px rgba(233,69,96,0.3);
    margin-bottom: 8px;
  }
  .svg-container {
    width: 280px;
    height: 280px;
    background: rgba(255,255,255,0.05);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .svg-container img, .svg-container svg {
    width: 240px;
    height: 240px;
  }
  button {
    background: #e94560;
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
  }
  button:active { opacity: 0.8; }
  .error {
    color: #a0aab5;
    font-size: 14px;
    text-align: center;
    padding: 20px;
  }
</style>
</head>
<body>
<div class="container">
  <div class="char-display">${char}</div>
  <div class="svg-container">
    <img id="stroke-svg" src="${svgUrl}" alt="${char} stroke order"
         onerror="document.getElementById('stroke-svg').style.display='none';
                  document.getElementById('error-msg').style.display='block';" />
    <div id="error-msg" class="error" style="display:none;">
      ⚠️ Không tải được<br/>sơ đồ nét chữ
    </div>
  </div>
  <button onclick="replaySvg()">🔄 Xem lại nét</button>
</div>
<script>
  function replaySvg() {
    const img = document.getElementById('stroke-svg');
    const src = img.src;
    img.src = '';
    setTimeout(() => { img.src = src; }, 50);
  }
</script>
</body>
</html>
`;

export default function StrokeOrderViewer({ character, language, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const svgUrl =
    language === 'Tiếng Nhật'
      ? KANJIVG_URL(character)
      : HANZIVG_URL(character);

  const html = buildHtml(svgUrl, character);

  const handleLoadEnd = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.bg}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thứ tự nét chữ</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="brush" size={18} color="#e94560" />
          <Text style={styles.infoText}>
            {language === 'Tiếng Nhật' ? 'KanjiVG' : 'HanziVG'} · Chạm để replay
          </Text>
        </View>

        {/* WebView */}
        <View style={styles.webviewWrap}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#e94560" />
              <Text style={styles.loadingText}>Đang tải sơ đồ nét...</Text>
            </View>
          )}
          <WebView
            source={{ html }}
            style={styles.webview}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            scrollEnabled={false}
            javaScriptEnabled={true}
            originWhitelist={['*']}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  infoText: { color: '#a0aab5', fontSize: 12 },
  webviewWrap: {
    flex: 1,
    margin: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,46,0.9)',
    zIndex: 10,
    borderRadius: 20,
    gap: 12,
  },
  loadingText: { color: '#a0aab5', fontSize: 14, marginTop: 8 },
});
