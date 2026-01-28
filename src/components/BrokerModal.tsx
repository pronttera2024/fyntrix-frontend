import React from 'react'
import { X, ExternalLink, Shield } from 'lucide-react'
import zerodha from '../../assets/zerodha.png'
import groww from '../../assets/groww.png'
import upstox from '../../assets/upstox.png'
import angel from '../../assets/angel-one.png'
import icici from '../../assets/icici.png'

interface BrokerModalProps {
  isOpen: boolean
  onClose: () => void
}

const brokers = [
  {
    name: 'Zerodha Kite',
    loginUrl: 'https://kite.zerodha.com/',
    icon: '🚀',
    color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    logoPath: zerodha // Update with actual logo path
  },
  {
    name: 'Groww',
    loginUrl: 'https://groww.in/',
    icon: '🌱',
    color: 'bg-gradient-to-r from-green-500 to-green-600',
    logoPath: groww // Update with actual logo path
  },
  {
    name: 'Upstox',
    loginUrl: 'https://upstox.com/',
    icon: '⚡',
    color: 'bg-gradient-to-r from-purple-500 to-purple-600',
    logoPath: upstox // Update with actual logo path
  },
  {
    name: 'Angel One',
    loginUrl: 'https://angelone.in/',
    icon: '👼',
    color: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
    logoPath: angel // Update with actual logo path
  },
  {
    name: 'ICICI Direct',
    loginUrl: 'https://www.icicidirect.com/',
    icon: '🏦',
    color: 'bg-gradient-to-r from-orange-500 to-orange-600',
    logoPath: icici // Update with actual logo path
  }
]

export const BrokerModal: React.FC<BrokerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold">Choose Your Broker</h2>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 md:p-6 overflow-y-auto">
          {/* Disclaimer */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2 md:gap-3">
              <Shield size={16} className="text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1 text-sm md:text-base">Disclaimer</h4>
                <p className="text-xs md:text-sm text-amber-800">
                  We are not affiliated with any of the brokers listed above. Please do your own research before choosing a broker. 
                  Trading involves risk, and you should only invest what you can afford to lose.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            {brokers.map((broker, index) => (
              <a
                key={index}
                href={broker.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center justify-between p-3 md:p-4 ${broker.color} rounded-lg md:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] text-white`}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-white/30 transition-colors">
                    {broker.logoPath && broker.logoPath !== '/assets/placeholder.png' ? (
                      <img 
                        src={broker.logoPath} 
                        alt={`${broker.name} logo`} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const nextElement = target.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className="text-xl md:text-2xl" style={{ display: broker.logoPath && broker.logoPath !== '/assets/placeholder.png' ? 'none' : 'flex' }}>
                      {broker.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-lg">{broker.name}</h3>
                    <p className="text-xs md:text-sm opacity-90">Start trading now</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-xs md:text-sm font-medium">Trade Now</span>
                  <ExternalLink size={14} className="md:size-18 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
