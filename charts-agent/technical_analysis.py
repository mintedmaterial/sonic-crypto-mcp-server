#!/usr/bin/env python3
"""
Technical Analysis Service for Charts Agent
Provides advanced TA indicators, pattern recognition, and AI-powered analysis
"""

import json
import sys
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np
import pandas as pd
import talib

@dataclass
class OHLCVData:
    """OHLCV candlestick data"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

@dataclass
class TechnicalIndicators:
    """Collection of technical indicators"""
    # Trend Indicators
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None

    # Momentum Indicators
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None

    # Volatility Indicators
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    atr_14: Optional[float] = None

    # Volume Indicators
    obv: Optional[float] = None
    vwap: Optional[float] = None

@dataclass
class PatternRecognition:
    """Candlestick pattern recognition results"""
    patterns_found: List[str]
    bullish_patterns: List[str]
    bearish_patterns: List[str]
    strength: str  # 'weak', 'moderate', 'strong'

@dataclass
class TrendAnalysis:
    """Trend analysis results"""
    trend_direction: str  # 'bullish', 'bearish', 'neutral', 'sideways'
    trend_strength: float  # 0-100
    support_levels: List[float]
    resistance_levels: List[float]
    pivot_points: Dict[str, float]

@dataclass
class TechnicalAnalysisResult:
    """Complete technical analysis result"""
    symbol: str
    timestamp: int
    current_price: float
    indicators: TechnicalIndicators
    patterns: PatternRecognition
    trend: TrendAnalysis
    signals: Dict[str, str]  # buy/sell/hold signals
    confidence: float  # 0-100

class TechnicalAnalyzer:
    """Main technical analysis engine"""

    def __init__(self):
        self.min_periods = 200  # Minimum data points for reliable analysis

    def analyze(self, ohlcv_data: List[Dict]) -> TechnicalAnalysisResult:
        """
        Perform complete technical analysis on OHLCV data

        Args:
            ohlcv_data: List of OHLCV dictionaries with keys: timestamp, open, high, low, close, volume

        Returns:
            TechnicalAnalysisResult object
        """
        # Convert to pandas DataFrame
        df = pd.DataFrame(ohlcv_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.sort_values('timestamp')

        # Extract numpy arrays for TA-Lib
        close = df['close'].values
        high = df['high'].values
        low = df['low'].values
        open_prices = df['open'].values
        volume = df['volume'].values

        # Calculate indicators
        indicators = self._calculate_indicators(close, high, low, open_prices, volume)

        # Recognize patterns
        patterns = self._recognize_patterns(open_prices, high, low, close)

        # Analyze trend
        trend = self._analyze_trend(close, high, low, indicators)

        # Generate trading signals
        signals = self._generate_signals(indicators, patterns, trend)

        # Calculate confidence score
        confidence = self._calculate_confidence(indicators, patterns, trend, len(df))

        return TechnicalAnalysisResult(
            symbol=ohlcv_data[0].get('symbol', 'UNKNOWN'),
            timestamp=int(df['timestamp'].iloc[-1].timestamp() * 1000),
            current_price=float(close[-1]),
            indicators=indicators,
            patterns=patterns,
            trend=trend,
            signals=signals,
            confidence=confidence
        )

    def _calculate_indicators(self, close, high, low, open_prices, volume) -> TechnicalIndicators:
        """Calculate all technical indicators"""

        # Trend Indicators
        sma_20 = talib.SMA(close, timeperiod=20)
        sma_50 = talib.SMA(close, timeperiod=50)
        sma_200 = talib.SMA(close, timeperiod=200)
        ema_12 = talib.EMA(close, timeperiod=12)
        ema_26 = talib.EMA(close, timeperiod=26)

        # Momentum Indicators
        rsi_14 = talib.RSI(close, timeperiod=14)
        macd, macd_signal, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        stoch_k, stoch_d = talib.STOCH(high, low, close, fastk_period=14, slowk_period=3, slowd_period=3)

        # Volatility Indicators
        bb_upper, bb_middle, bb_lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
        atr_14 = talib.ATR(high, low, close, timeperiod=14)

        # Volume Indicators
        obv = talib.OBV(close, volume)

        # VWAP (Volume Weighted Average Price)
        vwap = (close * volume).cumsum() / volume.cumsum()

        return TechnicalIndicators(
            sma_20=float(sma_20[-1]) if not np.isnan(sma_20[-1]) else None,
            sma_50=float(sma_50[-1]) if not np.isnan(sma_50[-1]) else None,
            sma_200=float(sma_200[-1]) if not np.isnan(sma_200[-1]) else None,
            ema_12=float(ema_12[-1]) if not np.isnan(ema_12[-1]) else None,
            ema_26=float(ema_26[-1]) if not np.isnan(ema_26[-1]) else None,
            rsi_14=float(rsi_14[-1]) if not np.isnan(rsi_14[-1]) else None,
            macd=float(macd[-1]) if not np.isnan(macd[-1]) else None,
            macd_signal=float(macd_signal[-1]) if not np.isnan(macd_signal[-1]) else None,
            macd_histogram=float(macd_hist[-1]) if not np.isnan(macd_hist[-1]) else None,
            stoch_k=float(stoch_k[-1]) if not np.isnan(stoch_k[-1]) else None,
            stoch_d=float(stoch_d[-1]) if not np.isnan(stoch_d[-1]) else None,
            bb_upper=float(bb_upper[-1]) if not np.isnan(bb_upper[-1]) else None,
            bb_middle=float(bb_middle[-1]) if not np.isnan(bb_middle[-1]) else None,
            bb_lower=float(bb_lower[-1]) if not np.isnan(bb_lower[-1]) else None,
            atr_14=float(atr_14[-1]) if not np.isnan(atr_14[-1]) else None,
            obv=float(obv[-1]) if not np.isnan(obv[-1]) else None,
            vwap=float(vwap.iloc[-1]) if not np.isnan(vwap.iloc[-1]) else None,
        )

    def _recognize_patterns(self, open_prices, high, low, close) -> PatternRecognition:
        """Recognize candlestick patterns using TA-Lib"""

        patterns_found = []
        bullish_patterns = []
        bearish_patterns = []

        # Bullish Patterns
        patterns_to_check = {
            'HAMMER': talib.CDLHAMMER,
            'INVERTED_HAMMER': talib.CDLINVERTEDHAMMER,
            'MORNING_STAR': talib.CDLMORNINGSTAR,
            'BULLISH_ENGULFING': talib.CDLENGULFING,
            'PIERCING': talib.CDLPIERCING,
            'THREE_WHITE_SOLDIERS': talib.CDL3WHITESOLDIERS,
            'DOJI': talib.CDLDOJI,
            'DRAGONFLY_DOJI': talib.CDLDRAGONFLYDOJI,
            'HANGING_MAN': talib.CDLHANGINGMAN,
            'SHOOTING_STAR': talib.CDLSHOOTINGSTAR,
            'EVENING_STAR': talib.CDLEVENINGSTAR,
            'BEARISH_ENGULFING': talib.CDLENGULFING,
            'DARK_CLOUD_COVER': talib.CDLDARKCLOUDCOVER,
            'THREE_BLACK_CROWS': talib.CDL3BLACKCROWS,
        }

        for pattern_name, pattern_func in patterns_to_check.items():
            result = pattern_func(open_prices, high, low, close)
            if result[-1] != 0:
                patterns_found.append(pattern_name)
                if result[-1] > 0:
                    bullish_patterns.append(pattern_name)
                else:
                    bearish_patterns.append(pattern_name)

        # Determine pattern strength
        strength = 'weak'
        if len(patterns_found) >= 3:
            strength = 'strong'
        elif len(patterns_found) >= 2:
            strength = 'moderate'

        return PatternRecognition(
            patterns_found=patterns_found,
            bullish_patterns=bullish_patterns,
            bearish_patterns=bearish_patterns,
            strength=strength
        )

    def _analyze_trend(self, close, high, low, indicators: TechnicalIndicators) -> TrendAnalysis:
        """Analyze price trend and identify support/resistance levels"""

        # Determine trend direction
        trend_direction = 'neutral'
        trend_strength = 50.0

        if indicators.sma_50 and indicators.sma_200:
            if close[-1] > indicators.sma_50 > indicators.sma_200:
                trend_direction = 'bullish'
                trend_strength = 75.0
            elif close[-1] < indicators.sma_50 < indicators.sma_200:
                trend_direction = 'bearish'
                trend_strength = 75.0
        elif indicators.ema_12 and indicators.ema_26:
            if indicators.ema_12 > indicators.ema_26:
                trend_direction = 'bullish'
                trend_strength = 60.0
            elif indicators.ema_12 < indicators.ema_26:
                trend_direction = 'bearish'
                trend_strength = 60.0

        # Identify support and resistance levels using pivot points
        support_levels = []
        resistance_levels = []
        pivot_points = {}

        if len(close) > 0:
            # Calculate pivot points
            typical_price = (high[-1] + low[-1] + close[-1]) / 3
            pivot = typical_price

            pivot_points['pivot'] = float(pivot)
            pivot_points['r1'] = float(2 * pivot - low[-1])
            pivot_points['r2'] = float(pivot + (high[-1] - low[-1]))
            pivot_points['r3'] = float(high[-1] + 2 * (pivot - low[-1]))
            pivot_points['s1'] = float(2 * pivot - high[-1])
            pivot_points['s2'] = float(pivot - (high[-1] - low[-1]))
            pivot_points['s3'] = float(low[-1] - 2 * (high[-1] - pivot))

            resistance_levels = [pivot_points['r1'], pivot_points['r2'], pivot_points['r3']]
            support_levels = [pivot_points['s1'], pivot_points['s2'], pivot_points['s3']]

        return TrendAnalysis(
            trend_direction=trend_direction,
            trend_strength=trend_strength,
            support_levels=support_levels,
            resistance_levels=resistance_levels,
            pivot_points=pivot_points
        )

    def _generate_signals(self, indicators: TechnicalIndicators, patterns: PatternRecognition, trend: TrendAnalysis) -> Dict[str, str]:
        """Generate trading signals based on indicators, patterns, and trend"""

        signals = {}

        # RSI Signal
        if indicators.rsi_14:
            if indicators.rsi_14 < 30:
                signals['rsi'] = 'buy'
            elif indicators.rsi_14 > 70:
                signals['rsi'] = 'sell'
            else:
                signals['rsi'] = 'hold'

        # MACD Signal
        if indicators.macd and indicators.macd_signal:
            if indicators.macd > indicators.macd_signal:
                signals['macd'] = 'buy'
            elif indicators.macd < indicators.macd_signal:
                signals['macd'] = 'sell'
            else:
                signals['macd'] = 'hold'

        # Bollinger Bands Signal
        if indicators.bb_upper and indicators.bb_lower:
            current_price = indicators.vwap or 0
            if current_price <= indicators.bb_lower:
                signals['bollinger'] = 'buy'
            elif current_price >= indicators.bb_upper:
                signals['bollinger'] = 'sell'
            else:
                signals['bollinger'] = 'hold'

        # Pattern Signal
        if len(patterns.bullish_patterns) > len(patterns.bearish_patterns):
            signals['pattern'] = 'buy'
        elif len(patterns.bearish_patterns) > len(patterns.bullish_patterns):
            signals['pattern'] = 'sell'
        else:
            signals['pattern'] = 'hold'

        # Trend Signal
        if trend.trend_direction == 'bullish':
            signals['trend'] = 'buy'
        elif trend.trend_direction == 'bearish':
            signals['trend'] = 'sell'
        else:
            signals['trend'] = 'hold'

        # Overall Signal (majority vote)
        buy_count = sum(1 for s in signals.values() if s == 'buy')
        sell_count = sum(1 for s in signals.values() if s == 'sell')

        if buy_count > sell_count:
            signals['overall'] = 'buy'
        elif sell_count > buy_count:
            signals['overall'] = 'sell'
        else:
            signals['overall'] = 'hold'

        return signals

    def _calculate_confidence(self, indicators: TechnicalIndicators, patterns: PatternRecognition, trend: TrendAnalysis, data_points: int) -> float:
        """Calculate confidence score for the analysis"""

        confidence = 0.0

        # Data quality (max 30 points)
        if data_points >= self.min_periods:
            confidence += 30.0
        else:
            confidence += (data_points / self.min_periods) * 30.0

        # Indicator agreement (max 30 points)
        indicator_count = sum(1 for v in asdict(indicators).values() if v is not None)
        confidence += (indicator_count / 12) * 30.0  # 12 total indicators

        # Pattern strength (max 20 points)
        if patterns.strength == 'strong':
            confidence += 20.0
        elif patterns.strength == 'moderate':
            confidence += 12.0
        elif patterns.strength == 'weak':
            confidence += 5.0

        # Trend strength (max 20 points)
        confidence += (trend.trend_strength / 100) * 20.0

        return min(confidence, 100.0)

def main():
    """CLI entry point for technical analysis"""

    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'No OHLCV data provided',
            'usage': 'python technical_analysis.py <json_data>'
        }))
        sys.exit(1)

    try:
        # Parse input JSON data
        ohlcv_data = json.loads(sys.argv[1])

        # Perform analysis
        analyzer = TechnicalAnalyzer()
        result = analyzer.analyze(ohlcv_data)

        # Convert dataclasses to dict for JSON serialization
        output = {
            'symbol': result.symbol,
            'timestamp': result.timestamp,
            'current_price': result.current_price,
            'indicators': asdict(result.indicators),
            'patterns': asdict(result.patterns),
            'trend': asdict(result.trend),
            'signals': result.signals,
            'confidence': result.confidence
        }

        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'type': type(e).__name__
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
