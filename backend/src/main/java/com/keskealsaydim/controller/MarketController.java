package com.keskealsaydim.controller;

import com.keskealsaydim.service.DataServiceClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
@Tag(name = "Market", description = "Piyasa genel görünümü")
public class MarketController {

    private final DataServiceClient dataServiceClient;

    @GetMapping("/overview")
    @Operation(summary = "Piyasa genel görünümü")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(dataServiceClient.getMarketOverview());
    }
}
