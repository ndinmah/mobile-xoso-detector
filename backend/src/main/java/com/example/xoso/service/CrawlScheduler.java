package com.example.xoso.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.xoso.crawldata.GetXoSo;
import com.example.xoso.model.DrawResult;
import com.example.xoso.repository.DrawResultRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Lịch trình crawl kết quả xổ số theo chiến lược 3 giai đoạn:
 *
 *  PHASE 1 – LIVE  : Poll cường độ cao (mỗi N giây) từ khi bắt đầu quay.
 *                    Tự dừng khi phát hiện Giải Đặc Biệt hợp lệ của TẤT CẢ đài.
 *
 *  PHASE 2 – VERIFY: Crawl 1 lần duy nhất ~30 phút sau khi LIVE kết thúc.
 *                    Phát hiện và đồng bộ lại nếu nguồn đã sửa kết quả.
 *
 *  PHASE 3 – IDLE  : Ngừng crawl hoàn toàn ngoài 2 khung trên.
 *
 * Lịch xổ số:
 *   XSMN: Live 16:15 | Timeout 16:45 | Verify 17:05
 *   XSMT: Live 17:15 | Timeout 17:45 | Verify 18:05
 *   XSMB: Live 18:15 | Timeout 18:50 | Verify 19:10
 */
@Slf4j
@Service
public class CrawlScheduler {

  @Autowired
  private DrawResultRepository drawResultRepository;

  @Autowired
  private GetXoSo getXoSo;

  /**
   * TaskScheduler được inject để schedule dynamic task (live polling).
   * Bean này được auto-configured bởi Spring Boot khi có @EnableScheduling.
   */
  @Autowired
  private TaskScheduler taskScheduler;

  @Value("${crawl.url.mien-nam}")
  private String urlMienNam;

  @Value("${crawl.url.mien-trung}")
  private String urlMienTrung;

  @Value("${crawl.url.mien-bac}")
  private String urlMienBac;

  @Value("${crawl.live.interval-seconds:15}")
  private int liveIntervalSeconds;

  // ── Per-region state ──────────────────────────────────────────────────────────
  private final Map<String, ScheduledFuture<?>> liveTasks        = new ConcurrentHashMap<>();
  private final Map<String, LocalDate>           lastSavedDate    = new ConcurrentHashMap<>();
  private final Map<String, Boolean>             specialPrizeFound = new ConcurrentHashMap<>();
  private final Map<String, Map<String, Map<String, List<String>>>> lastFetchedData = new ConcurrentHashMap<>();

  // ═════════════════════════════════════════════════════════════════════════════
  // MIỀN NAM
  // ═════════════════════════════════════════════════════════════════════════════

  /** Giai đoạn 1 – Live: 16:15 → bắt đầu poll mỗi ${crawl.live.interval-seconds} giây */
  @Scheduled(cron = "0 15 16 * * *", zone = "Asia/Ho_Chi_Minh")
  public void startLiveMienNam() {
    startLivePolling("MN", urlMienNam);
  }

  /** Timeout: 16:45 → cảnh báo nếu Giải ĐB vẫn chưa có */
  @Scheduled(cron = "0 45 16 * * *", zone = "Asia/Ho_Chi_Minh")
  public void timeoutMienNam() {
    timeoutCheck("MN");
  }

  /** Giai đoạn 2 – Verify: 17:05 → crawl lại 1 lần để chốt kết quả */
  @Scheduled(cron = "0 5 17 * * *", zone = "Asia/Ho_Chi_Minh")
  public void verifyMienNam() {
    verifyRegion("MN", urlMienNam);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MIỀN TRUNG
  // ═════════════════════════════════════════════════════════════════════════════

  @Scheduled(cron = "0 15 17 * * *", zone = "Asia/Ho_Chi_Minh")
  public void startLiveMienTrung() {
    startLivePolling("MT", urlMienTrung);
  }

  @Scheduled(cron = "0 45 17 * * *", zone = "Asia/Ho_Chi_Minh")
  public void timeoutMienTrung() {
    timeoutCheck("MT");
  }

  @Scheduled(cron = "0 5 18 * * *", zone = "Asia/Ho_Chi_Minh")
  public void verifyMienTrung() {
    verifyRegion("MT", urlMienTrung);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MIỀN BẮC  (Miền Bắc quay từ Nhất → Bảy, Đặc Biệt quay sau cùng ~18:35)
  // ═════════════════════════════════════════════════════════════════════════════

  @Scheduled(cron = "0 15 18 * * *", zone = "Asia/Ho_Chi_Minh")
  public void startLiveMienBac() {
    startLivePolling("MB", urlMienBac);
  }

  @Scheduled(cron = "0 50 18 * * *", zone = "Asia/Ho_Chi_Minh")
  public void timeoutMienBac() {
    timeoutCheck("MB");
  }

  @Scheduled(cron = "0 10 19 * * *", zone = "Asia/Ho_Chi_Minh")
  public void verifyMienBac() {
    verifyRegion("MB", urlMienBac);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 1 – LIVE
  // ═════════════════════════════════════════════════════════════════════════════

  private void startLivePolling(String region, String url) {
    LocalDate today = LocalDate.now();

    if (today.equals(lastSavedDate.get(region))) {
      log.info("[{}] Dữ liệu hôm nay ({}) đã được lưu trước đó. Bỏ qua Live phase.", region, today);
      return;
    }

    // Reset trạng thái cho ngày mới
    specialPrizeFound.put(region, false);
    lastFetchedData.remove(region);

    log.info("[{}] ══ PHASE 1 (LIVE) bắt đầu – poll mỗi {} giây ══", region, liveIntervalSeconds);

    ScheduledFuture<?> future = taskScheduler.scheduleAtFixedRate(
        () -> liveTask(region, url),
        Instant.now(),
        Duration.ofSeconds(liveIntervalSeconds)
    );
    liveTasks.put(region, future);
  }

  private void liveTask(String region, String url) {
    // Nếu đã tìm thấy ĐB (race condition guard) thì dừng ngay
    if (Boolean.TRUE.equals(specialPrizeFound.get(region))) {
      cancelLiveTask(region);
      return;
    }

    LocalDate today = LocalDate.now();
    try {
      Map<String, Map<String, List<String>>> dataMap = getXoSo.fetchData(url);
      if (dataMap == null || dataMap.isEmpty()) {
        log.debug("[{}] Live: Trang chưa có dữ liệu.", region);
        return;
      }

      boolean allSpecialFound = checkSpecialPrizeComplete(dataMap);

      if (allSpecialFound) {
        log.info("[{}] ✓ Giải Đặc Biệt đầy đủ → Lưu DB và dừng Live phase.", region);
        saveToDb(region, today, dataMap, url);
        lastSavedDate.put(region, today);
        lastFetchedData.put(region, dataMap);
        specialPrizeFound.put(region, true);
        cancelLiveTask(region);
      } else {
        // Đang crawl dở – lưu tạm để Verify phase có thể so sánh
        log.debug("[{}] Live: Giải ĐB chưa đủ, tiếp tục poll...", region);
        lastFetchedData.put(region, dataMap);
      }

    } catch (Exception e) {
      log.error("[{}] Lỗi trong Live phase: {}", region, e.getMessage(), e);
    }
  }

  /**
   * Điều kiện dừng Live phase:
   * Giải ĐB (prizeLevel="1") của MỌI tỉnh phải có ít nhất 1 số hợp lệ (≥5 chữ số).
   */
  private boolean checkSpecialPrizeComplete(Map<String, Map<String, List<String>>> dataMap) {
    for (Map.Entry<String, Map<String, List<String>>> entry : dataMap.entrySet()) {
      List<String> specialNumbers = entry.getValue().get("1");
      if (specialNumbers == null || specialNumbers.isEmpty()) return false;
      boolean hasValidNumber = specialNumbers.stream()
          .anyMatch(n -> n != null && n.trim().replaceAll("[^0-9]", "").length() >= 5);
      if (!hasValidNumber) return false;
    }
    return true;
  }

  private void cancelLiveTask(String region) {
    ScheduledFuture<?> future = liveTasks.remove(region);
    if (future != null && !future.isCancelled()) {
      future.cancel(false);
      log.info("[{}] ══ PHASE 1 (LIVE) kết thúc ══", region);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TIMEOUT CHECK
  // ═════════════════════════════════════════════════════════════════════════════

  private void timeoutCheck(String region) {
    if (Boolean.TRUE.equals(specialPrizeFound.get(region))) {
      log.info("[{}] Timeout check: Dữ liệu đã hoàn tất đúng hạn. ✓", region);
      return;
    }
    // Vẫn chưa có ĐB → cảnh báo và force cancel
    log.warn("[{}] ⚠ TIMEOUT: Đã hết khung giờ nhưng chưa thu được Giải Đặc Biệt! "
        + "Có thể nguồn đã đổi cấu trúc HTML hoặc bị chặn IP. Kiểm tra ngay!", region);
    cancelLiveTask(region);
    // TODO: Gửi alert qua Telegram / Email tại đây
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 2 – VERIFY
  // ═════════════════════════════════════════════════════════════════════════════

  private void verifyRegion(String region, String url) {
    LocalDate today = LocalDate.now();
    log.info("[{}] ══ PHASE 2 (VERIFY) bắt đầu ══", region);

    try {
      Map<String, Map<String, List<String>>> freshData = getXoSo.fetchData(url);
      if (freshData == null || freshData.isEmpty()) {
        log.warn("[{}] Verify: Không lấy được dữ liệu để kiểm tra lại.", region);
        return;
      }

      Map<String, Map<String, List<String>>> savedData = lastFetchedData.get(region);
      if (savedData != null && !freshData.equals(savedData)) {
        log.warn("[{}] ⚠ Verify: Phát hiện dữ liệu KHÁC với lần crawl trước! "
            + "Nguồn đã sửa kết quả → Cập nhật lại DB.", region);
        // Xóa records cũ của hôm nay rồi lưu lại data mới đã được sửa
        drawResultRepository.deleteByRegionAndDrawDate(region, today);
        saveToDb(region, today, freshData, url);
        lastFetchedData.put(region, freshData);
        log.info("[{}] ✓ Verify: Đã đồng bộ lại dữ liệu chính xác hơn.", region);
      } else {
        log.info("[{}] ✓ Verify: Dữ liệu nhất quán, không cần cập nhật.", region);
      }

    } catch (Exception e) {
      log.error("[{}] Lỗi trong Verify phase: {}", region, e.getMessage(), e);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HELPER – LƯU VÀO DATABASE
  // ═════════════════════════════════════════════════════════════════════════════

  private void saveToDb(String region, LocalDate drawDate,
      Map<String, Map<String, List<String>>> dataMap, String url) {
    List<DrawResult> drawResults = new ArrayList<>();

    for (Map.Entry<String, Map<String, List<String>>> provinceEntry : dataMap.entrySet()) {
      String province = provinceEntry.getKey();
      for (Map.Entry<String, List<String>> prizeEntry : provinceEntry.getValue().entrySet()) {
        String prizeLevel = prizeEntry.getKey();
        String numbersString = String.join(",", prizeEntry.getValue()) + ",";

        drawResults.add(DrawResult.builder()
            .provinceCode(province)
            .region(region)
            .prizeLevel(prizeLevel)
            .numbers(numbersString)
            .drawDate(drawDate)
            .sourceUrl(url)
            .build());
      }
    }

    drawResultRepository.saveAll(drawResults);
    log.info("[{}] ✓ Đã lưu {} records vào database.", region, drawResults.size());
  }
}
