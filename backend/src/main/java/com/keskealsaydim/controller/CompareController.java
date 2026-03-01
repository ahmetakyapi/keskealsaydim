package com.keskealsaydim.controller;

import com.keskealsaydim.dto.comparison.CompareRequest;
import com.keskealsaydim.dto.comparison.CompareResponse;
import com.keskealsaydim.entity.ComparisonScenario;
import com.keskealsaydim.security.UserPrincipal;
import com.keskealsaydim.service.ComparisonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/compare")
@RequiredArgsConstructor
@Tag(name = "Comparison", description = "Hisse karşılaştırma işlemleri - Ana özellik")
public class CompareController {

    private final ComparisonService comparisonService;

    @PostMapping
    @Operation(summary = "İki hisseyi karşılaştır",
            description = "Belirli bir tarihte iki farklı hisseye yatırım yapılmış olsaydı sonuçları karşılaştırır")
    public ResponseEntity<CompareResponse> compare(
            @Valid @RequestBody CompareRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(comparisonService.compare(
                request, user != null ? user.getId() : null));
    }

    @GetMapping("/history")
    @Operation(summary = "Geçmiş karşılaştırma senaryolarını getir")
    public ResponseEntity<Page<ComparisonScenario>> getHistory(
            @AuthenticationPrincipal UserPrincipal user,
            Pageable pageable) {
        return ResponseEntity.ok(comparisonService.getUserScenarios(user.getId(), pageable));
    }

    @GetMapping("/shared/{shareToken}")
    @Operation(summary = "Paylaşılan senaryoyu görüntüle")
    public ResponseEntity<ComparisonScenario> getSharedScenario(@PathVariable String shareToken) {
        return ResponseEntity.ok(comparisonService.getScenarioByShareToken(shareToken));
    }
}
