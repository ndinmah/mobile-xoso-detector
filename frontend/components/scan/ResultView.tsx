import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Brand, PrizeColors } from '../../constants/theme';
import { AnalyzeTicketResponse } from '../../services/imageAnalysisService';
import { formatPrizeAmount } from '../../services/ticketHistoryService';

const { width: SCREEN_W } = Dimensions.get('window');

interface ResultViewProps {
  result: AnalyzeTicketResponse;
  photoUri: string;
  onRetake: () => void;
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={rs.infoRow}>
      <Text style={rs.infoLabel}>{label}</Text>
      <Text style={[rs.infoValue, highlight && rs.highlighted]}>{value}</Text>
    </View>
  );
}

export function ResultView({ result, photoUri, onRetake }: ResultViewProps) {
  const hasWon = result.prizes && result.prizes.length > 0;
  const totalPrize = (result.prizes ?? []).reduce((s, p) => s + p.prizeAmount, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={rs.container} contentContainerStyle={rs.content} bounces={false}>
        {/* Header */}
        <View style={[rs.header, { backgroundColor: hasWon ? Brand.gold : Brand.danger }]}>
          <Text style={rs.emoji}>{hasWon ? '🎉' : result.errorMessage ? '⚠️' : '😔'}</Text>
          <Text style={rs.headerTitle}>
            {hasWon ? 'CHÚC MỪNG!' : result.errorMessage ? 'LỖI NHẬN DẠNG' : 'KHÔNG TRÚNG'}
          </Text>
          {hasWon && (
            <Text style={rs.totalPrize}>Tổng thưởng: {formatPrizeAmount(totalPrize)}</Text>
          )}
        </View>

        {/* Ticket Info */}
        <View style={rs.ticketCard}>
          <Text style={rs.cardTitle}>📋 Thông Tin Vé</Text>
          <InfoRow label="Số vé" value={result.ticketNumber ?? '—'} highlight />
          <InfoRow label="Đài" value={result.provinceCode ?? '—'} />
          <InfoRow label="Ngày xổ" value={result.drawDate ?? '—'} />
        </View>

        {/* Prize List */}
        {hasWon && (
          <View style={rs.prizeCard}>
            <Text style={rs.cardTitle}>🏆 Các Giải Trúng</Text>
            {result.prizes.map((prize, idx) => (
              <View
                key={idx}
                style={[rs.prizeRow, { borderLeftColor: PrizeColors[prize.prizeLevel] ?? Brand.neon }]}
              >
                <Text style={[rs.prizeLevel, { color: PrizeColors[prize.prizeLevel] ?? Brand.neon }]}>
                  {prize.prizeLevel}
                </Text>
                <Text style={rs.prizeAmount}>{formatPrizeAmount(prize.prizeAmount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Error Message */}
        {result.errorMessage && (
          <View style={rs.errorCard}>
            <Text style={rs.errorText}>{result.errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={rs.actions}>
          <TouchableOpacity style={rs.retakeBtn} onPress={onRetake}>
            <Text style={rs.retakeBtnText}>📷 Quét Vé Khác</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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

const rs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.darkBg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 54,
    paddingBottom: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#000',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalPrize: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 6,
    opacity: 0.8,
  },
  ticketCard: {
    margin: 16,
    backgroundColor: Brand.darkCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.darkCard2,
  },
  prizeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Brand.darkCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.darkCard2,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#2D0A14',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.danger,
  },
  errorText: {
    color: Brand.danger,
    fontSize: 14,
    lineHeight: 22,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.darkCard2,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: '600',
  },
  highlighted: {
    color: Brand.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  prizeRow: {
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
  prizeLevel: {
    fontSize: 14,
    fontWeight: '700',
  },
  prizeAmount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  actions: {
    margin: 16,
  },
  retakeBtn: {
    backgroundColor: Brand.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
