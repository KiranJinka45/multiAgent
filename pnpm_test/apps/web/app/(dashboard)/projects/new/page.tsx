// app/projects/new/page.tsx
"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export default function NewProject() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!prompt) return toast.error("Please describe your app");
    
    setLoading(true);
    try {
      const response = await axios.post(`${GATEWAY_URL}/build`, { prompt });
      toast.success("Build started! Redirecting to project...");
      router.push(`/projects/${response.data.id || ""}`);
    } catch (err) {
      toast.error("Failed to start build");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Create New Project</h1>
      
      <div className="bg-white border rounded-2xl p-8 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What would you like to build?
        </label>
        <textarea
          className="w-full h-40 border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-black focus:border-transparent text-lg text-gray-800"
          placeholder="e.g. A modern todo app with dark mode and authentication..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button 
          onClick={handleCreate}
          disabled={loading}
          className={`mt-6 w-full py-4 rounded-xl font-bold text-white transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 shadow-lg'}`}
        >
          {loading ? "Initializing Agents..." : "Generate Magic 🚀"}
        </button>
      </div>
    </div>
  );
}
