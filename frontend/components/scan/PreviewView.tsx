import { ActivityIndicator, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brand } from '../../constants/theme';

interface PreviewViewProps {
  photo: string;
  loading: boolean;
  onRetake: () => void;
  onAnalyze: () => void;
}

export function PreviewView({ photo, loading, onRetake, onAnalyze }: PreviewViewProps) {
  return (
    <View style={styles.darkBg}>
      <StatusBar barStyle="light-content" backgroundColor={Brand.darkBg} />
      <View style={styles.previewHeader}>
        <Text style={styles.previewHeaderText}>Kiểm tra ảnh vé số</Text>
      </View>

      <Image source={{ uri: photo }} style={styles.previewImage} resizeMode="contain" />

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Brand.gold} />
            <Text style={styles.loadingTitle}>Đang phân tích...</Text>
            <Text style={styles.loadingDesc}>OCR → AI → Dò kết quả</Text>
          </View>
        </View>
      )}

      <View style={styles.previewActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={onRetake}
          disabled={loading}
        >
          <Text style={styles.actionBtnOutlineText}>↩ Chụp Lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, loading && styles.disabled]}
          onPress={onAnalyze}
          disabled={loading}
        >
          <Text style={styles.actionBtnPrimaryText}>
            {loading ? 'Đang xử lý...' : '✨ Phân Tích'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  darkBg: {
    flex: 1,
    backgroundColor: Brand.darkBg,
  },
  previewHeader: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: Brand.darkCard,
    alignItems: 'center',
  },
  previewHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  previewImage: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 6, 32, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: Brand.darkCard,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 220,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  loadingTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: Brand.darkCard,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: Brand.primaryLight,
  },
  actionBtnOutlineText: {
    color: Brand.primaryLight,
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnPrimary: {
    backgroundColor: Brand.primary,
  },
  actionBtnPrimaryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
});
