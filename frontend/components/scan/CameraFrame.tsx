import { CameraType, CameraView } from 'expo-camera';
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brand } from '../../constants/theme';
import { RefObject } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');

interface CameraFrameProps {
  cameraRef: RefObject<CameraView>;
  facing: CameraType;
  onFlipCamera: () => void;
  onPickImage: () => void;
  onTakePicture: () => void;
}

export function CameraFrame({
  cameraRef,
  facing,
  onFlipCamera,
  onPickImage,
  onTakePicture,
}: CameraFrameProps) {
  return (
    <View style={styles.darkBg}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarInner}>
            <Text style={styles.appTitle}>🎰 XỔ SỐ DETECTOR</Text>
            <TouchableOpacity onPress={onFlipCamera}>
              <Text style={styles.flipIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan overlay */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan line animation hint */}
            <View style={styles.scanHint}>
              <Text style={styles.scanHintText}>Đặt vé số vào khung</Text>
            </View>
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {/* Gallery button */}
          <TouchableOpacity style={styles.sideBtn} onPress={onPickImage}>
            <Text style={styles.sideBtnText}>🖼️</Text>
            <Text style={styles.sideBtnLabel}>Thư viện</Text>
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity style={styles.captureOuter} onPress={onTakePicture}>
            <View style={styles.captureMiddle}>
              <View style={styles.captureInner} />
            </View>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.sideBtn} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  darkBg: {
    flex: 1,
    backgroundColor: Brand.darkBg,
  },
  camera: {
    flex: 1,
  },
  // Top bar
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(13, 6, 32, 0.6)',
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: Brand.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  flipIcon: {
    fontSize: 24,
  },
  // Scan area overlay
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: SCREEN_W * 0.82,
    height: SCREEN_W * 0.52,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Brand.gold,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanHint: {
    backgroundColor: 'rgba(13, 6, 32, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanHintText: {
    color: Brand.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  // Bottom controls
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: 'rgba(13, 6, 32, 0.85)',
  },
  sideBtn: {
    width: 56,
    alignItems: 'center',
  },
  sideBtnText: {
    fontSize: 28,
  },
  sideBtnLabel: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 4,
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Brand.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureMiddle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.gold,
  },
});
