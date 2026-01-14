import { useState } from 'react';
import { StockPage } from './pages/StockPage';
import { Search } from 'lucide-react';

/**
 * Simple demo page to test TradingView charts with AI markers
 * Can be accessed by modifying main.tsx temporarily to render this component
 */
export default function ChartDemo() {
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [searchInput, setSearchInput] = useState('');

  const popularSymbols = [
    'RELIANCE',
    'TCS',
    'INFY',
    'HDFCBANK',
    'SBIN',
    'WIPRO',
    'ITC',
    'BAJFINANCE',
    'TATAMOTORS',
    'ASIANPAINT',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedSymbol(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation */}
      <div className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">ARISE Charts</h1>
              <p className="text-sm text-slate-400">AI-Powered Technical Analysis</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search symbol..."
                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Analyze
              </button>
            </form>
          </div>

          {/* Quick Symbol Selector */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-400 mr-2">Quick Select:</span>
            {popularSymbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Chart Page */}
      <StockPage symbol={selectedSymbol} />
    </div>
  );
}
