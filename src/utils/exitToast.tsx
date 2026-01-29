import React from 'react'
import { toast, ToastContent, ToastOptions } from 'react-toastify'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ExitAlert {
  symbol: string
  exit_reason: string
  return_pct: number
  exit_price: number
  entry_price: number
  exit_time: string
}

const exitReasonLabels: Record<string, string> = {
  'TARGET_HIT': '🎯 Target Hit',
  'STOP_LOSS': '🛡️ Stop Loss',
  'TIME_EXIT': '⏰ Time Exit',
  'TRAILING_STOP': '📈 Trailing Stop',
  'EOD_AUTO_EXIT': '🌆 EOD Auto-Exit'
}

const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export const showExitToast = (exit: ExitAlert, isMobile: boolean = false) => {
  const isProfit = exit.return_pct >= 0
  
  const toastContent: ToastContent = (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {isProfit ? (
          <TrendingUp size={isMobile ? 20 : 24} className="text-green-600" />
        ) : (
          <TrendingDown size={isMobile ? 20 : 24} className="text-red-600" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} ${isProfit ? 'text-green-900' : 'text-red-900'}`}>
            ⚡ {exit.symbol}
          </span>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
            {isProfit ? '+' : ''}{exit.return_pct.toFixed(2)}%
          </span>
        </div>
        
        <div className={`text-xs mb-1 ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
          {formatTime(exit.exit_time)} • {exitReasonLabels[exit.exit_reason] || exit.exit_reason}
        </div>
        
        <div className={`text-xs ${isProfit ? 'text-green-800' : 'text-red-800'}`}>
          ₹{exit.entry_price.toFixed(2)} → ₹{exit.exit_price.toFixed(2)}
        </div>
      </div>
    </div>
  )

  const toastOptions: ToastOptions = {
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    progress: undefined,
    theme: 'light',
    className: isProfit 
      ? 'border-l-4 border-green-600 bg-gradient-to-r from-green-50 to-green-100 exit-toast-profit' 
      : 'border-l-4 border-red-600 bg-gradient-to-r from-red-50 to-red-100 exit-toast-loss',
    style: {
      minWidth: isMobile ? '260px' : '320px',
      maxWidth: isMobile ? '90vw' : '400px',
      margin: isMobile ? '0 16px' : '0',
      fontSize: isMobile ? '13px' : '14px',
      boxShadow: isProfit 
        ? '0 4px 12px rgba(34, 197, 94, 0.15)' 
        : '0 4px 12px rgba(239, 68, 68, 0.15)'
    }
  }

  toast(toastContent, toastOptions)
}

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
  })
}

export const showErrorToast = (message: string) => {
  toast.error(message, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
  })
}

export const showInfoToast = (message: string) => {
  toast.info(message, {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
  })
}
