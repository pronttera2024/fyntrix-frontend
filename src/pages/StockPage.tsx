import { useEffect, useState } from 'react';
import { TradingChart } from '../components/Chart/TradingChart';
import { fetchHistoricalData, fetchAIAnalysis, AIAnalysis, TIMEFRAME_OPTIONS } from '../services/chartService';
import { CandlestickData } from 'lightweight-charts';
import { TrendingUp, TrendingDown, Activity, Target, Shield, AlertCircle } from 'lucide-react';
import { classifyPickDirection } from '../utils/recommendation';

interface StockPageProps {
  symbol?: string;
}

export function StockPage({ symbol = 'RELIANCE' }: StockPageProps) {
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('90');
  const [stockInfo, setStockInfo] = useState({
    name: 'Reliance Industries Ltd.',
    currentPrice: 0,
    change: 0,
    changePercent: 0,
  });

  const [primaryMode] = useState<string>(() => {
    try {
      return localStorage.getItem('arise_primary_mode') || 'Swing';
    } catch {
      return 'Swing';
    }
  });

  useEffect(() => {
    loadStockData();
  }, [symbol, selectedTimeframe]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      // Fetch chart data
      const days = parseInt(selectedTimeframe);
      const data = await fetchHistoricalData(symbol, 'day', days);
      setChartData(data);

      // Calculate current price and change
      if (data.length > 1) {
        const current = data[data.length - 1];
        const previous = data[data.length - 2];
        const change = current.close - previous.close;
        const changePercent = (change / previous.close) * 100;

        setStockInfo({
          name: getStockName(symbol),
          currentPrice: current.close,
          change,
          changePercent,
        });
      }

      // Fetch AI analysis
      const aiAnalysis = await fetchAIAnalysis(symbol);
      setAnalysis(aiAnalysis);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockName = (sym: string): string => {
    const names: Record<string, string> = {
      RELIANCE: 'Reliance Industries Ltd.',
      TCS: 'Tata Consultancy Services Ltd.',
      INFY: 'Infosys Ltd.',
      HDFCBANK: 'HDFC Bank Ltd.',
      SBIN: 'State Bank of India',
      WIPRO: 'Wipro Ltd.',
      ITC: 'ITC Ltd.',
    };
    return names[sym] || sym;
  };

  const blendScore = analysis ? analysis.score : 0;
  const direction = analysis ? classifyPickDirection(blendScore, primaryMode) : null;
  const recLabel = direction?.label || analysis?.recommendation || 'Hold';
  const recSide =
    direction?.side ||
    (analysis?.recommendation === 'Buy'
      ? 'long'
      : analysis?.recommendation === 'Sell'
      ? 'short'
      : undefined);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{symbol}</h1>
              <p className="text-slate-400">{stockInfo.name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                ₹{stockInfo.currentPrice.toFixed(2)}
              </div>
              <div className={`flex items-center gap-2 justify-end ${
                stockInfo.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stockInfo.changePercent >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {stockInfo.change >= 0 ? '+' : ''}
                  {stockInfo.change.toFixed(2)} ({stockInfo.changePercent >= 0 ? '+' : ''}
                  {stockInfo.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-4 flex items-center gap-2">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedTimeframe(option.value)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedTimeframe === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-96 bg-slate-900 rounded-lg border border-slate-700">
            <div className="text-center">
              <Activity className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Trading Chart */}
            <TradingChart
              symbol={symbol}
              data={chartData}
              analysis={analysis || undefined}
              darkMode={true}
              primaryMode={primaryMode}
            />

            {/* AI Analysis Details */}
            {analysis && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recommendation Card */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">AI Recommendation</h3>
                  </div>
                  <div className={`text-4xl font-bold mb-2 ${
                    recSide === 'long'
                      ? 'text-green-400'
                      : recSide === 'short'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}>
                    {recLabel}
                  </div>
                  <p className="text-slate-400 mb-4">{analysis.reasoning}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Confidence</span>
                    <span className={`font-semibold ${
                      analysis.confidence === 'High'
                        ? 'text-green-400'
                        : analysis.confidence === 'Medium'
                        ? 'text-yellow-400'
                        : 'text-orange-400'
                    }`}>
                      {analysis.confidence}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">AI Score</span>
                    <span className="font-semibold text-white">{analysis.score.toFixed(1)}/100</span>
                  </div>
                </div>

                {/* Entry & Targets Card */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Price Levels</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Entry Price</span>
                      <span className="font-semibold text-white">₹{analysis.entry_price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target 1 (T1)</span>
                      <span className="font-semibold text-green-400">₹{analysis.target_1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target 2 (T2)</span>
                      <span className="font-semibold text-green-400">₹{analysis.target_2}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target 3 (T3)</span>
                      <span className="font-semibold text-green-400">₹{analysis.target_3}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                      <span className="text-slate-400">Upside Potential</span>
                      <span className="font-semibold text-green-400">
                        {(((analysis.target_3 - analysis.entry_price) / analysis.entry_price) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Management Card */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Risk Management</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Stop Loss</span>
                      <span className="font-semibold text-red-400">₹{analysis.stop_loss}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Risk</span>
                      <span className="font-semibold text-red-400">
                        {(((analysis.entry_price - analysis.stop_loss) / analysis.entry_price) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Risk:Reward (T1)</span>
                      <span className="font-semibold text-white">
                        1:{(
                          (analysis.target_1 - analysis.entry_price) /
                          (analysis.entry_price - analysis.stop_loss)
                        ).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Agent Consensus</span>
                      <span className="font-semibold text-white">
                        {analysis.agents_bullish}/{analysis.agents_bullish + analysis.agents_bearish}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Signals */}
            {analysis && analysis.key_signals && analysis.key_signals.length > 0 && (
              <div className="mt-6 bg-slate-900 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Key Signals</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.key_signals.map((signal, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-slate-300 bg-slate-800 rounded p-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
