'use client';

import React, { useState } from 'react';

interface BuilderFormProps {
  onGenerate: (prompt: string) => void;
}

export const BuilderForm: React.FC<BuilderFormProps> = ({ onGenerate }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'SaaS Dashboard',
    vibe: 'Premium Dark',
    features: [] as string[],
    customGoal: ''
  });

  const appTypes = ['SaaS Dashboard', 'Portfolio', 'E-commerce', 'Landing Page', 'Admin Panel'];
  const vibes = ['Premium Dark', 'Clean Light', 'High-Tech Neon', 'Minimalist Mono'];
  const featureList = ['Auth system', 'Stripe payments', 'Data charts', 'CMS/Blog', 'User settings'];

  const toggleFeature = (f: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(f) 
        ? prev.features.filter(x => x !== f)
        : [...prev.features, f]
    }));
  };

  const handleFinish = () => {
    const finalPrompt = `Build a ${formData.vibe} ${formData.type}. 
      Key features: ${formData.features.join(', ')}. 
      Specific goal: ${formData.customGoal || 'Follow industry best practices.'}`;
    onGenerate(finalPrompt);
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-2xl p-8 max-w-2xl w-full space-y-8 shadow-2xl">
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <h2 className="text-xl font-bold">Guided Builder</h2>
        <span className="text-xs text-gray-500">Step {step} of 3</span>
      </div>
      
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-500" 
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-400">What kind of application are we building?</p>
          <div className="grid grid-cols-2 gap-3">
            {appTypes.map(t => (
              <button 
                key={t}
                onClick={() => setFormData({...formData, type: t})}
                className={`p-4 rounded-xl border text-left text-sm transition-all ${
                  formData.type === t ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-400">Choose the design aesthetic.</p>
          <div className="grid grid-cols-2 gap-3">
            {vibes.map(v => (
              <button 
                key={v}
                onClick={() => setFormData({...formData, vibe: v})}
                className={`p-4 rounded-xl border text-left text-sm transition-all ${
                  formData.vibe === v ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-400">Select core features & describe specifics.</p>
          <div className="flex flex-wrap gap-2">
            {featureList.map(f => (
              <button 
                key={f}
                onClick={() => toggleFeature(f)}
                className={`px-4 py-2 rounded-full border text-xs transition-all ${
                  formData.features.includes(f) ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <textarea 
            placeholder="Any specific goals or details?"
            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm mt-4 outline-none focus:border-purple-500/50"
            value={formData.customGoal}
            onChange={e => setFormData({...formData, customGoal: e.target.value})}
          />
        </div>
      )}

      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-sm text-gray-400 hover:text-white">Back</button>
        ) : <div />}
        
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="px-8 py-3 bg-white text-black rounded-xl font-bold">Next</button>
        ) : (
          <button onClick={handleFinish} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20">
            Launch Engine
          </button>
        )}
      </div>
    </div>
  );
};
