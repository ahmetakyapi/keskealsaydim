package com.keskealsaydim.service;

import com.keskealsaydim.dto.stock.StockHistoryDto;
import com.keskealsaydim.dto.stock.StockPriceDto;
import com.keskealsaydim.dto.stock.StockSearchResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class DataServiceClient {

    private final WebClient webClient;

    public DataServiceClient(@Value("${data-service.url}") String dataServiceUrl,
                             @Value("${data-service.timeout}") int timeout) {
        this.webClient = WebClient.builder()
                .baseUrl(dataServiceUrl)
                .build();
    }

    @Cacheable(value = "stockPrice", key = "#symbol", unless = "#result == null")
    public StockPriceDto getPrice(String symbol) {
        try {
            return webClient.get()
                    .uri("/price/{symbol}", symbol)
                    .retrieve()
                    .bodyToMono(StockPriceDto.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (Exception e) {
            log.error("Failed to get price for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    public Mono<StockPriceDto> getPriceAsync(String symbol) {
        return webClient.get()
                .uri("/price/{symbol}", symbol)
                .retrieve()
                .bodyToMono(StockPriceDto.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorResume(e -> {
                    log.error("Failed to get price for {}: {}", symbol, e.getMessage());
                    return Mono.empty();
                });
    }

    public Map<String, StockPriceDto> getPrices(List<String> symbols) {
        try {
            return webClient.post()
                    .uri("/prices")
                    .bodyValue(Map.of("symbols", symbols))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, StockPriceDto>>() {})
                    .timeout(Duration.ofSeconds(15))
                    .block();
        } catch (Exception e) {
            log.error("Failed to get prices: {}", e.getMessage());
            return Map.of();
        }
    }

    public StockHistoryDto getHistory(String symbol, LocalDate from, LocalDate to, String interval) {
        try {
            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/history/{symbol}")
                            .queryParam("from", from.toString())
                            .queryParam("to", to.toString())
                            .queryParam("interval", interval)
                            .build(symbol))
                    .retrieve()
                    .bodyToMono(StockHistoryDto.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();
        } catch (Exception e) {
            log.error("Failed to get history for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    public List<StockSearchResult> search(String query) {
        try {
            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<StockSearchResult>>() {})
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (Exception e) {
            log.error("Failed to search stocks: {}", e.getMessage());
            return List.of();
        }
    }

    public Map<String, Object> getMarketOverview() {
        try {
            return webClient.get()
                    .uri("/market/overview")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(15))
                    .block();
        } catch (Exception e) {
            log.error("Failed to get market overview: {}", e.getMessage());
            return Map.of();
        }
    }
}
