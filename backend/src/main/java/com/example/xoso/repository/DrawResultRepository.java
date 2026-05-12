package com.example.xoso.repository;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.example.xoso.model.DrawResult;

@Repository
public interface DrawResultRepository extends JpaRepository<DrawResult, UUID> {

  boolean existsByProvinceCodeAndDrawDateAndPrizeLevelAndNumbersContaining(String provinceCode, LocalDate drawDate,
      String prizeLevel, String ticketNumber);

  @Query("SELECT d.numbers FROM DrawResult d WHERE d.provinceCode = :provinceCode AND d.drawDate = :drawDate AND d.prizeLevel = :prizeLevel")
  String findNumbersByProvinceCodeAndDrawDateAndPrizeLevel(@Param("provinceCode") String provinceCode,
      @Param("drawDate") LocalDate drawDate,
      @Param("prizeLevel") String prizeLevel);

  @Modifying
  @Transactional
  @Query("DELETE FROM DrawResult d WHERE d.region = :region AND d.drawDate = :drawDate")
  void deleteByRegionAndDrawDate(@Param("region") String region, @Param("drawDate") LocalDate drawDate);
}

