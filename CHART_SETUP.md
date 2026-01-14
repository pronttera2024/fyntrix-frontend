# 📊 ARISE Charts - Setup Guide

**Status:** ✅ Chart components ready!  
**TradingView Lightweight Charts:** Installed  
**AI Markers:** Implemented

---

## 🚀 Quick Start (2 Options)

### **Option A: Test Charts Immediately** ⭐ RECOMMENDED

**1. Update `main.tsx` to use ChartDemo:**

```typescript
// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChartDemo from './ChartDemo.tsx'  // ← Change this line
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChartDemo />  {/* ← Change this line */}
  </StrictMode>,
)
```

**2. Start the backend:**
```bash
cd backend
python -m uvicorn main:app --reload
```

**3. Start the frontend:**
```bash
cd frontend
npm run dev
```

**4. Open browser:**
```
http://localhost:5173
```

**You'll see:**
- Interactive TradingView candlestick chart
- AI markers (Entry/SL/Target) on chart
- AI recommendation cards
- Quick symbol selector (RELIANCE, TCS, INFY, etc.)

---

### **Option B: Integrate into Existing App**

Add a "Charts" tab/route to your existing App.tsx

**1. Add routing:**
```typescript
// In App.tsx
import { StockPage } from './pages/StockPage'

// Add a state for showing charts
const [showCharts, setShowCharts] = useState(false)
const [chartSymbol, setChartSymbol] = useState('RELIANCE')

// Render conditionally
{showCharts && <StockPage symbol={chartSymbol} />}
```

**2. Add navigation button:**
```typescript
<button onClick={() => setShowCharts(true)}>
  View Charts
</button>
```

---

## 📁 Files Created

### **Components:**
```
frontend/src/
├── components/
│   └── Chart/
│       └── TradingChart.tsx     ← Main chart component
├── pages/
│   └── StockPage.tsx            ← Complete stock analysis page
├── services/
│   └── chartService.ts          ← Data fetching & formatting
└── ChartDemo.tsx                ← Standalone demo app
```

### **Features Implemented:**

**1. TradingChart Component:**
- Candlestick chart with TradingView
- AI markers (Entry arrows)
- Price lines (SL, T1, T2, T3)
- Dark/Light mode support
- Responsive design
- Auto-resize
- Beautiful tooltips

**2. StockPage:**
- Full stock analysis layout
- Price header with change %
- Timeframe selector (1D, 5D, 1M, 3M, 6M, 1Y)
- AI recommendation cards
- Price levels card
- Risk management card
- Key signals display

**3. ChartService:**
- Fetch historical data from API
- Convert to TradingView format
- Fetch AI analysis
- Sample data generator (fallback)
- Support/Resistance calculator

---

## 🎨 What You'll See

### **Chart Features:**
```
✅ Candlestick chart (green/red candles)
✅ Entry point marker (arrow + AI score)
✅ Stop Loss line (red dashed)
✅ Target 1, 2, 3 lines (green dashed)
✅ Interactive crosshair
✅ Timeframe selector
✅ Auto-scaling
```

### **AI Analysis Cards:**
```
✅ Recommendation card (Buy/Sell/Hold)
✅ AI Score (0-100)
✅ Confidence level (High/Medium/Low)
✅ Agent consensus (7 agents)
✅ Entry price
✅ Stop Loss level
✅ Target levels (T1, T2, T3)
✅ Risk % and Risk:Reward ratio
✅ Upside potential %
```

### **Key Signals:**
```
✅ Display all key signals from AI
✅ Organized in grid layout
✅ Clear bullet points
✅ Easy to read
```

---

## 🔌 API Integration

### **Endpoints Used:**

**1. Historical Data:**
```
GET /v1/market-data/{symbol}/historical?interval=day&days=90
```

**2. AI Analysis:**
```
POST /v1/analyze
Body: { symbol: "RELIANCE", exchange: "NSE" }
```

### **Fallback:**
If API is not available, the chart service generates sample data automatically for demo purposes.

---

## 🎯 Testing the Charts

### **Step 1: Start Backend**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Backend should be running on: `http://localhost:8000`

### **Step 2: Update main.tsx**

Edit `frontend/src/main.tsx`:
```typescript
import ChartDemo from './ChartDemo.tsx'

// In render:
<ChartDemo />
```

### **Step 3: Start Frontend**
```bash
cd frontend
npm run dev
```

Frontend will be on: `http://localhost:5173`

### **Step 4: Test!**
- Open `http://localhost:5173`
- You should see RELIANCE chart
- Click other symbols (TCS, INFY, etc.)
- Try different timeframes (1M, 3M, 6M)
- See AI markers on chart
- View analysis cards

---

## 🎨 Customization

### **Change Default Symbol:**
```typescript
// In ChartDemo.tsx or StockPage.tsx
const [selectedSymbol, setSelectedSymbol] = useState('TCS') // Default to TCS
```

### **Add More Symbols:**
```typescript
const popularSymbols = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN',
  'WIPRO', 'ITC', 'BAJFINANCE', 'TATAMOTORS',
  'ASIANPAINT', 'ADANIENT', 'AXISBANK', // ← Add more here
]
```

### **Change Colors:**
```typescript
// In TradingChart.tsx
const colors = {
  upColor: '#10b981',      // Green for up candles
  downColor: '#ef4444',    // Red for down candles
  background: '#0f172a',   // Dark background
  gridColor: '#1e293b',    // Grid lines
}
```

### **Adjust Timeframes:**
```typescript
// In chartService.ts
export const TIMEFRAME_OPTIONS = [
  { label: '1D', value: '1', days: 1 },
  { label: '1W', value: '7', days: 7 },
  { label: '1M', value: '30', days: 30 },
  // Add more timeframes...
]
```

---

## 🐛 Troubleshooting

### **"Cannot find module 'lightweight-charts'"**
**Solution:**
```bash
cd frontend
npm install
```

### **Chart not showing**
**Check:**
1. Backend is running on port 8000
2. Frontend is running on port 5173
3. No CORS errors in browser console
4. Data is being fetched (check Network tab)

### **No AI markers on chart**
**Check:**
1. Analysis API is working: `POST http://localhost:8000/v1/analyze`
2. Response contains recommendation, entry_price, stop_loss, targets
3. Browser console for errors

### **CORS Error**
**Backend needs CORS enabled:**
```python
# In backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎉 Success Criteria

**You'll know it's working when you see:**
- ✅ Candlestick chart loads
- ✅ Green/Red candles display correctly
- ✅ Entry arrow appears on chart
- ✅ SL and Target lines visible
- ✅ AI recommendation card shows "Buy/Sell/Hold"
- ✅ Price levels displayed correctly
- ✅ Can switch between symbols
- ✅ Can change timeframes

---

## 🚀 Next Steps

**After charts are working:**

1. **Add More Indicators:**
   - RSI, MACD, Bollinger Bands
   - Volume bars
   - Moving averages

2. **Pattern Recognition:**
   - Mark patterns on chart
   - Head & Shoulders
   - Support/Resistance zones

3. **Live Updates:**
   - WebSocket integration
   - Real-time price updates
   - Live candle animation

4. **User Interactions:**
   - Click markers for details
   - Drawing tools
   - Save chart layouts

---

## 📊 Demo Screenshots

**What you should see:**

```
┌─────────────────────────────────────────────┐
│  ARISE Charts - AI-Powered Analysis        │
│  Quick Select: [RELIANCE] [TCS] [INFY]...  │
├─────────────────────────────────────────────┤
│  RELIANCE                        ₹2,500.00  │
│  Reliance Industries Ltd.        +2.5%      │
│                                             │
│  [1D] [5D] [1M] [3M] [6M] [1Y] ← Timeframe│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    CANDLESTICK CHART                │   │
│  │    With AI Markers:                 │   │
│  │    • Entry Arrow ↑                  │   │
│  │    • Stop Loss Line (red dashed)    │   │
│  │    • Target Lines (green dashed)    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌───────────┬────────────┬──────────────┐ │
│  │   BUY     │  Levels    │  Risk Mgmt   │ │
│  │  Score:78 │  T1: ₹2580 │  SL: ₹2420   │ │
│  │  High     │  T2: ₹2650 │  Risk: 3.2%  │ │
│  └───────────┴────────────┴──────────────┘ │
└─────────────────────────────────────────────┘
```

---

**Ready to test? Update `main.tsx` and run `npm run dev`!** 🚀
