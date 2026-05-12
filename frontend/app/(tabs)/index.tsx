import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { analyzeTicketImage, AnalyzeTicketResponse } from '../../services/imageAnalysisService';
import { saveTicketToHistory } from '../../services/ticketHistoryService';
import { Brand } from '../../constants/theme';
import { ResultView } from '../../components/scan/ResultView';
import { PreviewView } from '../../components/scan/PreviewView';
import { CameraFrame } from '../../components/scan/CameraFrame';

export default function ScanScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeTicketResponse | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.darkBg} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>📷 Cần Quyền Camera</Text>
        <Text style={styles.permissionDesc}>
          Ứng dụng cần quyền camera để quét và nhận dạng vé số của bạn.
        </Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Cấp Quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Result view ──
  if (result) {
    return (
      <ResultView
        result={result}
        photoUri={photo!}
        onRetake={() => { setResult(null); setPhoto(null); }}
      />
    );
  }

  // ── Preview view ──
  if (photo) {
    return (
      <PreviewView
        photo={photo}
        loading={loading}
        onRetake={() => setPhoto(null)}
        onAnalyze={handleAnalyze}
      />
    );
  }

  // ── Camera view ──
  return (
    <CameraFrame
      cameraRef={cameraRef}
      facing={facing}
      onFlipCamera={() => setFacing(f => f === 'back' ? 'front' : 'back')}
      onPickImage={pickImage}
      onTakePicture={takePicture}
    />
  );

  // ── Handlers ──
  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photoData = await cameraRef.current.takePictureAsync();
      setPhoto(photoData?.uri ?? null);
    } catch {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể chụp ảnh' });
    }
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Từ chối', text2: 'Cần quyền truy cập thư viện ảnh' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!picked.canceled && picked.assets[0]?.uri) {
      setPhoto(picked.assets[0].uri);
    }
  }

  async function handleAnalyze() {
    if (!photo) return;
    setLoading(true);
    try {
      const res = await analyzeTicketImage(photo);
      await saveTicketToHistory(res, photo);

      if (res.prizes && res.prizes.length > 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setResult(res);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Không thể phân tích ảnh';
      Toast.show({ type: 'error', text1: 'Lỗi', text2: msg });
    } finally {
      setLoading(false);
    }
  }
}

const styles = StyleSheet.create({
  darkBg: {
    flex: 1,
    backgroundColor: Brand.darkBg,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Brand.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  grantBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  grantBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
