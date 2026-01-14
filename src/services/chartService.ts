import { CandlestickData, Time } from 'lightweight-charts';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/v1';

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AIAnalysis {
  recommendation: 'Buy' | 'Sell' | 'Hold';
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3: number;
  confidence: 'High' | 'Medium' | 'Low';
  score: number;
  agents_bullish: number;
  agents_bearish: number;
  reasoning: string;
  key_signals: string[];
}

/**
 * Convert OHLC data to TradingView Lightweight Charts format
 */
export function convertToChartData(ohlcData: OHLCData[]): CandlestickData[] {
  return ohlcData.map((item) => ({
    time: (new Date(item.date).getTime() / 1000) as Time,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
  }));
}

/**
 * Fetch historical price data for a symbol
 */
export async function fetchHistoricalData(
  symbol: string,
  interval: string = 'day',
  days: number = 90
): Promise<CandlestickData[]> {
  try {
    // Try to get data from ARISE backend
    const response = await axios.get(`${API_BASE_URL}/market-data/${symbol}/historical`, {
      params: { interval, days },
    });

    if (response.data && response.data.data) {
      return convertToChartData(response.data.data);
    }

    // Fallback: Generate sample data for demo
    return generateSampleData(symbol, days);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    // Return sample data for demo
    return generateSampleData(symbol, days);
  }
}

/**
 * Fetch AI analysis for a symbol
 */
export async function fetchAIAnalysis(symbol: string): Promise<AIAnalysis | null> {
  try {
    const response = await axios.post(`${API_BASE_URL}/analyze`, {
      symbol,
      exchange: 'NSE',
    });

    if (response.data && response.data.status === 'success') {
      const data = response.data.data;

      // Extract analysis data
      const bullishAgents = data.agent_signals?.filter((a: any) => a.signal === 'Bullish').length || 0;
      const bearishAgents = data.agent_signals?.filter((a: any) => a.signal === 'Bearish').length || 0;

      // Get current price from data
      const currentPrice = data.current_price || 2500;

      // Calculate levels based on recommendation
      let entry_price = currentPrice;
      let stop_loss = currentPrice * 0.97; // 3% SL
      let target_1 = currentPrice * 1.03; // 3% T1
      let target_2 = currentPrice * 1.06; // 6% T2
      let target_3 = currentPrice * 1.10; // 10% T3

      if (data.recommendation === 'Sell') {
        stop_loss = currentPrice * 1.03;
        target_1 = currentPrice * 0.97;
        target_2 = currentPrice * 0.94;
        target_3 = currentPrice * 0.90;
      }

      return {
        recommendation: data.recommendation,
        entry_price: Math.round(entry_price * 100) / 100,
        stop_loss: Math.round(stop_loss * 100) / 100,
        target_1: Math.round(target_1 * 100) / 100,
        target_2: Math.round(target_2 * 100) / 100,
        target_3: Math.round(target_3 * 100) / 100,
        confidence: data.confidence,
        score: data.blend_score,
        agents_bullish: bullishAgents,
        agents_bearish: bearishAgents,
        reasoning: data.reasoning || 'AI analysis based on 7 expert agents',
        key_signals: data.key_signals || [],
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching AI analysis:', error);
    return null;
  }
}

/**
 * Generate sample chart data for demo purposes
 */
function generateSampleData(symbol: string, days: number): CandlestickData[] {
  const data: CandlestickData[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Base price varies by symbol
  let basePrice = 2500;
  if (symbol === 'TCS') basePrice = 3500;
  if (symbol === 'INFY') basePrice = 1500;
  if (symbol === 'HDFCBANK') basePrice = 1600;
  if (symbol === 'SBIN') basePrice = 600;

  let price = basePrice;
  let trend = 0.001; // Slight uptrend

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * msPerDay);
    const time = (date.getTime() / 1000) as Time;

    // Add some randomness
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility * price;
    price = price + change + (price * trend);

    // Generate OHLC
    const open = price + (Math.random() - 0.5) * 0.01 * price;
    const close = price + (Math.random() - 0.5) * 0.01 * price;
    const high = Math.max(open, close) + Math.random() * 0.01 * price;
    const low = Math.min(open, close) - Math.random() * 0.01 * price;

    data.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });
  }

  return data;
}

/**
 * Calculate support and resistance levels
 */
export function calculateSupportResistance(data: CandlestickData[]): {
  support: number[];
  resistance: number[];
} {
  if (data.length < 20) {
    return { support: [], resistance: [] };
  }

  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  // Simple pivot point calculation
  const recentData = data.slice(-20);
  const avgHigh = recentData.reduce((sum, d) => sum + d.high, 0) / recentData.length;
  const avgLow = recentData.reduce((sum, d) => sum + d.low, 0) / recentData.length;
  const avgClose = recentData.reduce((sum, d) => sum + d.close, 0) / recentData.length;

  const pivot = (avgHigh + avgLow + avgClose) / 3;

  const resistance1 = 2 * pivot - avgLow;
  const resistance2 = pivot + (avgHigh - avgLow);
  const support1 = 2 * pivot - avgHigh;
  const support2 = pivot - (avgHigh - avgLow);

  return {
    resistance: [
      Math.round(resistance1 * 100) / 100,
      Math.round(resistance2 * 100) / 100,
    ],
    support: [
      Math.round(support1 * 100) / 100,
      Math.round(support2 * 100) / 100,
    ],
  };
}

/**
 * Get timeframe options for chart
 */
export const TIMEFRAME_OPTIONS = [
  { label: '1D', value: '1', days: 1 },
  { label: '5D', value: '5', days: 5 },
  { label: '1M', value: '30', days: 30 },
  { label: '3M', value: '90', days: 90 },
  { label: '6M', value: '180', days: 180 },
  { label: '1Y', value: '365', days: 365 },
];
