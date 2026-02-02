import { Nav } from "./nav";
import { BackgroundBlur } from "../ui/background-blur";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

export function Hero() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="z-1 grid w-full place-items-center p-8">
      <BackgroundBlur className="-top-40 md:-top-0" />
      <Nav />
      <div className="mt-16 flex flex-col items-center gap-6">
        <h1 className="text-center text-4xl leading-[1.1] font-medium tracking-tight sm:text-7xl">
          AI-First<span className="text-blue-900 block">Trading Platform</span>
        </h1>
        <p className="max-w-2xl my-2 text-center leading-6 tracking-tight sm:text-xl">
          Fyntrix is your AI Trading Coach, Research Buddy, and Strategist Chat. It delivers real‑time, AI‑driven trading signals backed by a transparent ledger so you always know <b className="text-blue-900">what</b> to do, <b className="text-blue-900">why</b> you're doing it, and <b className="text-blue-900">how</b> it has performed.
        </p>
        <div className="flex gap-4">
        <Button className="mb-10 w-fit" size="lg" asChild>
          <a href="https://fyntrix.ai/login" target="_blank" rel="noopener noreferrer">Get Started</a>
        </Button>
        <Button className="mb-10 w-fit" size="lg" asChild>
          <Link to="#">Download App</Link>
        </Button>
        </div>
        
        {/* Fyntrix AI Chat Interface Section */}
        <div className="w-full max-w-2xl mx-auto mt-8 mb-10">
          <div className="bg-muted/50 rounded-2xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center">
                <img src="/MacBook Pro 14_ - 39 (4).png" alt="Fyntrix AI Logo" width={24} height={24} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Fyntrix Strategist</h3>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-blue-800 text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                  <p className="text-sm">Analyze NIFTY 50 sentiment for tomorrow&apos;s trading session.</p>
                </div>
              </div>
              
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-600">ANALYSIS COMPLETE</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    Based on 11 specialized AI agents, <span className="font-semibold">NIFTY 50</span> shows <span className="font-semibold text-green-600">Bullish Bias (72%)</span>. Technical Analysis Agent confirms uptrend, Risk Agent suggests moderate position sizing.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-2">
              <input 
                type="text" 
                placeholder="Ask Fyntrix anything... (e.g. Analyze BANK NIFTY for swing trading)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
                value={inputValue}
                autoFocus
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button 
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={() => window.open('https://fyntrix.ai/login', '_blank', 'noopener,noreferrer')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
