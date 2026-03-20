'use client';

import { Check, Zap, Rocket, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TIERS = [
  {
    name: 'Hobby',
    price: '0',
    description: 'For individuals exploring autonomous builds.',
    features: ['5 builds per month', 'Public share links', 'Base Agent Grid access', 'Community support'],
    cta: 'Get Started',
    popular: false,
    icon: <Zap className="text-blue-500" />
  },
  {
    name: 'Pro',
    price: '29',
    description: 'For professional developers building SaaS.',
    features: ['Unlimited builds', 'Private projects', 'Advanced Agent Grid (P99)', 'Priority self-healing', 'Custom domains'],
    cta: 'Upgrade to Pro',
    popular: true,
    icon: <Rocket className="text-primary" />
  },
  {
    name: 'Enterprise',
    price: '99',
    description: 'For teams requiring strict governance.',
    features: ['SSO & SCIM (Okta/Azure)', 'Audit Logs', 'Custom Safety Policies', 'Dedicated Worker Nodes', '24/7 Concierge Support'],
    cta: 'Contact Sales',
    popular: false,
    icon: <ShieldCheck className="text-emerald-500" />
  }
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white py-24 px-6 flex flex-col items-center">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-5xl font-black tracking-tighter">Scale with MultiAgent</h1>
        <p className="text-gray-400 max-w-xl mx-auto font-medium">Simple, usage-based pricing that grows as your mission scales. From hobby projects to enterprise-grade autonomous grids.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
        {TIERS.map((tier, i) => (
          <div 
            key={i}
            className={`relative p-8 rounded-[2rem] border transition-all ${tier.popular ? 'bg-primary/10 border-primary shadow-2xl shadow-primary/10' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
          >
            {tier.popular && (
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest">
                Most Popular
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-black/40 rounded-2xl border border-white/5">{tier.icon}</div>
              <h3 className="text-xl font-bold">{tier.name}</h3>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-black">${tier.price}</span>
              <span className="text-gray-500 text-sm ml-2">/ month</span>
            </div>

            <p className="text-sm text-gray-400 mb-8 leading-relaxed">{tier.description}</p>

            <ul className="space-y-4 mb-10">
              {tier.features.map((f, j) => (
                <li key={j} className="flex gap-3 text-xs font-medium text-gray-300">
                  <Check size={14} className="text-primary mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => router.push('/billing')}
              className={`w-full py-4 rounded-xl font-black text-sm transition-all ${tier.popular ? 'bg-primary text-primary-foreground hover:scale-[1.02]' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-20 p-8 bg-white/5 border border-white/10 rounded-[2rem] max-w-2xl w-full text-center space-y-4">
        <h4 className="text-lg font-bold">Usage-Based Metering</h4>
        <p className="text-xs text-gray-500 leading-relaxed">Beyond plan limits, we charge purely on consumption: ₹0.05 per 1k AI Tokens and ₹2 per Build Minute. No hidden fees. Full transparency via your dashboard.</p>
      </div>
    </div>
  );
}
