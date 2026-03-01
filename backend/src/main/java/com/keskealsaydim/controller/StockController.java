package com.keskealsaydim.controller;

import com.keskealsaydim.dto.stock.StockHistoryDto;
import com.keskealsaydim.dto.stock.StockPriceDto;
import com.keskealsaydim.dto.stock.StockSearchResult;
import com.keskealsaydim.service.DataServiceClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@Tag(name = "Stocks", description = "Hisse senedi verileri")
public class StockController {

    private final DataServiceClient dataServiceClient;

    @GetMapping("/search")
    @Operation(summary = "Hisse ara")
    public ResponseEntity<List<StockSearchResult>> search(@RequestParam String q) {
        return ResponseEntity.ok(dataServiceClient.search(q));
    }

    @GetMapping("/{symbol}/price")
    @Operation(summary = "Anlık fiyat bilgisi")
    public ResponseEntity<StockPriceDto> getPrice(@PathVariable String symbol) {
        StockPriceDto price = dataServiceClient.getPrice(symbol);
        if (price == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(price);
    }

    @GetMapping("/{symbol}/history")
    @Operation(summary = "Geçmiş fiyat verileri")
    public ResponseEntity<StockHistoryDto> getHistory(
            @PathVariable String symbol,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "1d") String interval) {
        StockHistoryDto history = dataServiceClient.getHistory(symbol, from, to, interval);
        if (history == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(history);
    }
}
