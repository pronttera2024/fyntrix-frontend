import { FeaturesCarousel } from "./features-carousel";
import { FeaturesTabs } from "./features-tabs";
import { Badge } from "../ui/badge";
import { Brain, TrendingUp, Shield, BarChart3 } from "lucide-react";
import type { Feature } from "./feature-details";

const features: Feature[] = [
  {
    icon: <Brain size={20} />,
    title: "Multi-Agent AI Engine",
    description: "11 specialized AI agents including Technical Analysis, Sentiment, Risk, and Market Regime agents collaborate for comprehensive insights.",
    image: "/app-images/multi-ai-agent.png",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "AI Trading Coach & Strategist Chat",
    description: "Chat with Fyntrix like you would with a senior trader: break down a setup, stress‑test a plan, or ask for a cleaner risk‑reward alternative.",
    image: "/app-images/ai-stratergist.png",
  },
  {
    icon: <Shield size={20} />,
    title: "Risk Management Focus",
    description: "Decision-support system that provides recommendations without executing trades, keeping final control with you.",
    image: "/app-images/risk-management.png",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Real‑Time Signal Feed",
    description: "Live, actionable picks with entry price, stop‑loss, target, conviction level, and mode ready to execute.",
    image: "/app-images/market-coverage.png",
  },
];

export function Features() {
  return (
    <div id="features" className="flex w-full flex-col items-center gap-6 px-6 py-14 md:px-10 md:py-25">
      <Badge variant="secondary" className="uppercase">
        Features
      </Badge>
      <h2 className="text-center text-3xl leading-[1.1] font-medium tracking-tight sm:text-5xl">
        Advanced<div className="text-blue-800">Trading Intelligence</div>
      </h2>
      <p className="mb-3 max-w-lg text-center leading-6 tracking-tight sm:text-xl lg:mb-8">
        Our multi-agent AI system provides comprehensive trading insights while keeping you in complete control of your trading decisions
      </p>
      <FeaturesCarousel features={features} className="block lg:hidden" />
      <FeaturesTabs features={features} className="hidden lg:block" />
    </div>
  );
}
