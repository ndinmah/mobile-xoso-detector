import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { checkTicketManually, PrizeResult } from '../../services/imageAnalysisService';
import { formatPrizeAmount } from '../../services/ticketHistoryService';
import { Brand, PrizeColors } from '../../constants/theme';
import { Region, PROVINCES, REGION_LABELS } from '../../constants/data';
import { RegionSelector } from '../../components/ui/RegionSelector';
import { DatePickerButton } from '../../components/ui/DatePickerButton';

const { width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  region: z.enum(['MN', 'MT', 'MB']),
  ticketNumber: z.string().min(1, 'Vui lòng nhập số vé'),
  drawDate: z.string().min(1, 'Vui lòng chọn ngày xổ số'),
  provinceName: z.string().min(1, 'Vui lòng chọn đài xổ số'),
}).superRefine((data, ctx) => {
  const digits = data.region === 'MB' ? 5 : 6;
  if (data.ticketNumber.length !== digits || !/^\d+$/.test(data.ticketNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Vé ${REGION_LABELS[data.region].split(' ').pop()} cần ${digits} chữ số hợp lệ`,
      path: ['ticketNumber'],
    });
  }
});

type FormData = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ManualCheckScreen() {
  const { control, handleSubmit: formSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region: 'MN',
      ticketNumber: '',
      drawDate: '',
      provinceName: '',
    },
  });

  const region = watch('region');
  const drawDate = watch('drawDate');
  const provinceName = watch('provinceName');

  const [modalVisible, setModalVisible] = useState(false);
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prizes, setPrizes] = useState<PrizeResult[] | null>(null);

  const provinces = PROVINCES[region];

  const showDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: drawDate ? new Date(drawDate) : new Date(),
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            const d = selectedDate.toISOString().split('T')[0];
            setValue('drawDate', d, { shouldValidate: true });
          }
        },
        mode: 'date',
      });
    } else {
      setIosDatePickerVisible(true);
    }
  };

  const handleRegionChange = (r: Region) => {
    setValue('region', r);
    setValue('provinceName', ''); // Reset province when region changes
    setValue('ticketNumber', ''); // Reset ticket number to avoid validation mismatch
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setPrizes(null);
    try {
      const responseData = await checkTicketManually({
        so_ve: data.ticketNumber,
        ngay_xo_so: data.drawDate,
        dai_xo_so: data.provinceName,
      });
      // Cast the generic BackendCheckResponse to PrizeResult for consistency
      setPrizes(responseData as any as PrizeResult[]);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Không thể kết nối backend';
      Toast.show({ type: 'error', text1: 'Lỗi dò vé', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const onError = () => {
    const errorMessages = Object.values(errors).map(e => e?.message).filter(Boolean);
    if (errorMessages.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi thông tin',
        text2: errorMessages[0] as string,
      });
    }
  };

  const hasWon = prizes && prizes.length > 0;
  const totalPrize = (prizes ?? []).reduce((s: number, p: PrizeResult) => s + (p.prizeAmount ?? 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" backgroundColor={Brand.darkBg} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🎟️ Dò Vé Thủ Công</Text>
        <Text style={s.headerSub}>Nhập thông tin vé để kiểm tra kết quả</Text>
      </View>

      {/* Region Selector */}
      <View style={s.section}>
        <Text style={s.label}>Chọn miền</Text>
        <RegionSelector region={region} onRegionChange={handleRegionChange} />
      </View>

      {/* Ticket Number */}
      <View style={s.section}>
        <Text style={s.label}>
          Số Vé ({region === 'MB' ? '5 số' : '6 số'})
        </Text>
        <Controller
          control={control}
          name="ticketNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[s.input, errors.ticketNumber && s.inputError]}
              placeholder={region === 'MB' ? 'Nhập 5 số...' : 'Nhập 6 số...'}
              placeholderTextColor="#555"
              value={value}
              keyboardType="numeric"
              maxLength={region === 'MB' ? 5 : 6}
              onChangeText={onChange}
            />
          )}
        />
        {errors.ticketNumber && <Text style={s.errorText}>{errors.ticketNumber.message}</Text>}
      </View>

      {/* Draw Date */}
      <View style={s.section}>
        <Text style={s.label}>Ngày Xổ Số</Text>
        <DatePickerButton
          value={drawDate}
          placeholder="Chọn ngày xổ số..."
          icon="📅"
          onPress={showDatePicker}
        />
        {errors.drawDate && <Text style={s.errorText}>{errors.drawDate.message}</Text>}
      </View>

      {/* Province Selector */}
      <View style={s.section}>
        <Text style={s.label}>Đài Xổ Số</Text>
        <DatePickerButton
          value={provinceName}
          placeholder="Chọn đài xổ số..."
          icon="🏛️"
          onPress={() => setModalVisible(true)}
        />
        {errors.provinceName && <Text style={s.errorText}>{errors.provinceName.message}</Text>}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[s.submitBtn, loading && s.disabled]}
        onPress={formSubmit(onSubmit, onError)}
        disabled={loading}
      >
        <Text style={s.submitBtnText}>
          {loading ? '⏳ Đang dò vé...' : '🔍 Dò Vé Ngay'}
        </Text>
      </TouchableOpacity>

      {/* Result */}
      {prizes !== null && (
        <View style={[s.resultCard, hasWon ? s.resultWon : s.resultLost]}>
          {hasWon ? (
            <>
              <Text style={s.resultEmoji}>🎉</Text>
              <Text style={s.resultTitle}>CHÚC MỪNG!</Text>
              <Text style={s.resultSub}>Tổng thưởng: {formatPrizeAmount(totalPrize)}</Text>
              {prizes.map((prize: PrizeResult, idx: number) => (
                <View key={idx} style={[s.prizeItem, { borderLeftColor: PrizeColors[prize.prizeLevel] ?? Brand.neon }]}>
                  <Text style={[s.prizeLabel, { color: PrizeColors[prize.prizeLevel] ?? Brand.neon }]}>
                    {prize.prizeLevel}
                  </Text>
                  <Text style={s.prizeMoney}>{formatPrizeAmount(prize.prizeAmount)}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={s.resultEmoji}>😔</Text>
              <Text style={s.resultTitle}>KHÔNG TRÚNG</Text>
              <Text style={s.resultSub}>Vé <Text style={{ color: Brand.gold, fontWeight: '800' }}>{watch('ticketNumber')}</Text> chưa trúng lần này</Text>
            </>
          )}
        </View>
      )}

      {/* Province Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chọn Đài Xổ Số</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={provinces}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [s.provinceItem, pressed && s.provinceItemPressed]}
                  onPress={() => { 
                    setValue('provinceName', item, { shouldValidate: true }); 
                    setModalVisible(false); 
                  }}
                >
                  <Text style={s.provinceItemText}>{item}</Text>
                  {item === provinceName && <Text style={s.provinceCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* iOS Date Picker Modal */}
      {Platform.OS !== 'android' && (
        <Modal
          visible={iosDatePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIosDatePickerVisible(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>📅 Chọn Ngày Xổ Số</Text>
                <TouchableOpacity onPress={() => setIosDatePickerVisible(false)}>
                  <Text style={s.modalClose}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={drawDate ? new Date(drawDate) : new Date()}
                mode="date"
                display="spinner"
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    const d = selectedDate.toISOString().split('T')[0];
                    setValue('drawDate', d, { shouldValidate: true });
                  }
                  setIosDatePickerVisible(false);
                }}
                style={{ backgroundColor: Brand.darkCard }}
              />
            </View>
          </View>
        </Modal>
      )}
      </ScrollView>

      {/* Confetti */}
      {hasWon && (
        <ConfettiCannon
          count={200}
          origin={{ x: SCREEN_W / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.darkBg,
  },
  content: {
    paddingBottom: 60,
  },
  header: {
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: Brand.darkCard,
    borderBottomWidth: 1,
    borderBottomColor: Brand.darkCard2,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  label: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Brand.darkCard,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.darkCard2,
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    padding: 16,
    textAlign: 'center',
  },
  inputError: {
    borderColor: Brand.danger,
  },
  errorText: {
    color: Brand.danger,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  submitBtn: {
    margin: 20,
    marginTop: 28,
    backgroundColor: Brand.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.6,
  },
  // Result
  resultCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  resultWon: {
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderColor: Brand.gold,
  },
  resultLost: {
    backgroundColor: 'rgba(255,59,92,0.06)',
    borderColor: Brand.danger,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resultSub: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  prizeItem: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  prizeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  prizeMoney: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Brand.darkCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Brand.darkCard2,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    color: '#888',
    fontSize: 20,
    fontWeight: '700',
  },
  provinceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.darkCard2,
  },
  provinceItemPressed: {
    backgroundColor: Brand.darkCard2,
  },
  provinceItemText: {
    color: '#DDD',
    fontSize: 16,
  },
  provinceCheck: {
    color: Brand.success,
    fontSize: 18,
    fontWeight: '700',
  },
});
