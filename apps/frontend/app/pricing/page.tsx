'use client';

import React from 'react';

const plans = [
    {
        name: 'Free',
        price: '$0',
        features: ['3 Optimizations / day', 'Basic ATS Scan', 'Markdown Export'],
        cta: 'Current Plan',
        highlight: false
    },
    {
        name: 'Pro',
        price: '$19',
        pricePeriod: '/month',
        features: ['Unlimited Optimizations', 'FAANG-tier Impact Rewriting', 'PDF/Word Exports', 'Priority Support'],
        cta: 'Upgrade to Pro',
        highlight: true,
        productId: 'prod_resume_pro_monthly'
    }
];

export default function PricingPage() {
    const handleUpgrade = async (productId: string) => {
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            const { url } = await response.json();
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Checkout failed', err);
        }
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans p-8">
            <div className="max-w-5xl mx-auto text-center py-20">
                <h1 className="text-5xl font-black mb-6 tracking-tight">Simple, transparent pricing.</h1>
                <p className="text-xl text-gray-500 mb-16">Invest in your career. Get hired 3x faster with Pro features.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {plans.map((plan) => (
                        <div key={plan.name} className={`p-10 rounded-[40px] border-2 text-left flex flex-col ${plan.highlight ? 'border-black bg-black text-white shadow-2xl' : 'border-gray-100'}`}>
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-5xl font-black">{plan.price}</span>
                                <span className="text-gray-400 font-medium">{plan.pricePeriod}</span>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feat) => (
                                    <li key={feat} className="flex gap-3 items-center">
                                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${plan.highlight ? 'bg-green-400 text-black' : 'bg-gray-100'}`}>✓</span>
                                        <span className={plan.highlight ? 'text-gray-300' : 'text-gray-600'}>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => plan.productId && handleUpgrade(plan.productId)}
                                className={`w-full py-4 font-bold rounded-2xl transition ${plan.highlight ? 'bg-white text-black hover:bg-gray-100' : 'border-2 border-black hover:bg-gray-50'}`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
