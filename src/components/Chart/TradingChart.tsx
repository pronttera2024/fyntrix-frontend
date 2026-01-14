import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
} from 'lightweight-charts';
import { classifyPickDirection } from '../../utils/recommendation';

interface AIAnalysis {
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
}

interface TradingChartProps {
  symbol: string;
  data: CandlestickData[];
  analysis?: AIAnalysis;
  darkMode?: boolean;
  primaryMode?: string;
}

export function TradingChart({ symbol, data, analysis, darkMode = true, primaryMode = 'Swing' }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const direction = analysis ? classifyPickDirection(analysis.score, primaryMode) : null;
  const recommendationLabel = direction?.label || analysis?.recommendation;
  const recommendationSide =
    direction?.side ||
    (analysis?.recommendation === 'Buy'
      ? 'long'
      : analysis?.recommendation === 'Sell'
      ? 'short'
      : undefined);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    setIsLoading(false);

    // Chart colors for dark/light mode
    const colors = darkMode ? {
      background: '#0f172a',
      textColor: '#94a3b8',
      gridColor: '#1e293b',
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    } : {
      background: '#ffffff',
      textColor: '#1e293b',
      gridColor: '#e2e8f0',
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    };

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: colors.background },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: colors.gridColor,
      },
      timeScale: {
        borderColor: colors.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUpColor,
      borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });

    candlestickSeries.setData(data);

    // Add AI markers if analysis exists
    if (analysis && data.length > 0) {
      const markers = [];
      const lastCandle = data[data.length - 1];

      // Entry marker
      if (recommendationSide === 'long') {
        markers.push({
          time: lastCandle.time,
          position: 'belowBar' as const,
          color: colors.upColor,
          shape: 'arrowUp' as const,
          text: `${recommendationLabel || 'Buy'} @ ₹${analysis.entry_price} | AI: ${analysis.score.toFixed(1)}`,
          size: 2,
        });
      } else if (recommendationSide === 'short') {
        markers.push({
          time: lastCandle.time,
          position: 'aboveBar' as const,
          color: colors.downColor,
          shape: 'arrowDown' as const,
          text: `${recommendationLabel || 'Sell'} @ ₹${analysis.entry_price} | AI: ${analysis.score.toFixed(1)}`,
          size: 2,
        });
      }

      candlestickSeries.setMarkers(markers);

      // Add price lines for SL and Targets
      if (recommendationSide === 'long' || recommendationSide === 'short') {
        // Stop Loss line
        candlestickSeries.createPriceLine({
          price: analysis.stop_loss,
          color: colors.downColor,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL ₹${analysis.stop_loss}`,
        });

        // Target lines
        candlestickSeries.createPriceLine({
          price: analysis.target_1,
          color: colors.upColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `T1 ₹${analysis.target_1}`,
        });

        candlestickSeries.createPriceLine({
          price: analysis.target_2,
          color: colors.upColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `T2 ₹${analysis.target_2}`,
        });

        candlestickSeries.createPriceLine({
          price: analysis.target_3,
          color: colors.upColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `T3 ₹${analysis.target_3}`,
        });
      }
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, analysis, darkMode]);

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg">
          <div className="text-slate-400">Loading chart...</div>
        </div>
      )}
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg shadow-lg border border-slate-700"
      />
      {analysis && (
        <div className="mt-4 flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-md font-semibold ${
              recommendationSide === 'long'
                ? 'bg-green-500/20 text-green-400'
                : recommendationSide === 'short'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {recommendationLabel}
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-slate-300 font-medium">AI Score:</span>{' '}
              {analysis.score.toFixed(1)}/100
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-slate-300 font-medium">Confidence:</span>{' '}
              <span className={
                analysis.confidence === 'High'
                  ? 'text-green-400'
                  : analysis.confidence === 'Medium'
                  ? 'text-yellow-400'
                  : 'text-orange-400'
              }>
                {analysis.confidence}
              </span>
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-green-400">{analysis.agents_bullish}</span>/
              <span className="text-red-400">{analysis.agents_bearish}</span> agents
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-400">Entry:</span>{' '}
              <span className="text-slate-200 font-medium">₹{analysis.entry_price}</span>
            </div>
            <div>
              <span className="text-slate-400">SL:</span>{' '}
              <span className="text-red-400 font-medium">₹{analysis.stop_loss}</span>
            </div>
            <div>
              <span className="text-slate-400">T1:</span>{' '}
              <span className="text-green-400 font-medium">₹{analysis.target_1}</span>
            </div>
            <div>
              <span className="text-slate-400">T2:</span>{' '}
              <span className="text-green-400 font-medium">₹{analysis.target_2}</span>
            </div>
            <div>
              <span className="text-slate-400">T3:</span>{' '}
              <span className="text-green-400 font-medium">₹{analysis.target_3}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
