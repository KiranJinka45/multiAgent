// app/billing/page.tsx
"use client";

import axios from "axios";
import { toast } from "sonner";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export default function Billing() {
  const handleUpgrade = async () => {
    try {
      const response = await axios.post(`${GATEWAY_URL}/billing/checkout`, { plan: "PRO" });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch {
      toast.error("Failed to initiate checkout");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-10">Choose Your Plan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border rounded-2xl bg-white flex flex-col items-center">
          <h2 className="text-xl font-bold">Free Tier</h2>
          <p className="text-4xl font-black mt-4">$0</p>
          <ul className="mt-8 space-y-4 text-gray-600 mb-10">
            <li>5 Managed Builds / Month</li>
            <li>Basic AI Orchestration</li>
            <li>Public Projects only</li>
          </ul>
          <button disabled className="mt-auto w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold cursor-not-allowed">
            Current Plan
          </button>
        </div>

        <div className="p-8 border-2 border-black rounded-2xl bg-white flex flex-col items-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-black text-white px-4 py-1 text-xs font-bold rounded-bl-lg">POPULAR</div>
          <h2 className="text-xl font-bold">Pro Tier</h2>
          <p className="text-4xl font-black mt-4 text-black">$29<span className="text-sm font-normal text-gray-500"> /mo</span></p>
          <ul className="mt-8 space-y-4 text-gray-600 mb-10">
            <li>Unlimited Hyper-Fast Builds</li>
            <li>Advanced Agent Security</li>
            <li>Private Team Sandboxes</li>
            <li>Custom Domain Support</li>
          </ul>
          <button 
            onClick={handleUpgrade}
            className="mt-auto w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Upgrade Now 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
