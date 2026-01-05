import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import Navigation from '@/components/Navigation';

export default function AvatarPage() {
  const { user } = useAuthStore();
  const [selectedRig, setSelectedRig] = useState('R15');

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0e27] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-[#00D7FF] mb-8">AVATAR EDITOR</h1>

          <div className="grid grid-cols-3 gap-8">
            {/* 3D Preview */}
            <div className="col-span-2 card">
              <div className="bg-[#2a3050] w-full h-96 rounded mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-[#888888]">3D Avatar Preview</p>
                  <p className="text-[#666666] text-sm mt-2">({selectedRig} Rig)</p>
                </div>
              </div>

              {/* 3D Controls */}
              <div className="grid grid-cols-3 gap-2">
                <button className="btn-secondary py-2 text-sm">← Rotate Left</button>
                <button className="btn-secondary py-2 text-sm">Zoom</button>
                <button className="btn-secondary py-2 text-sm">Rotate Right →</button>
              </div>
            </div>

            {/* Customization Panel */}
            <div className="card h-fit">
              <h2 className="text-xl font-bold text-[#00D7FF] mb-4">Customize</h2>

              {/* Rig Selection */}
              <div className="mb-6">
                <label className="block text-[#888888] font-semibold mb-2">Rig Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRig('R6')}
                    className={`flex-1 py-2 rounded text-sm ${
                      selectedRig === 'R6' ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    R6
                  </button>
                  <button
                    onClick={() => setSelectedRig('R15')}
                    className={`flex-1 py-2 rounded text-sm ${
                      selectedRig === 'R15' ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    R15
                  </button>
                </div>
              </div>

              {/* Skin Tone */}
              <div className="mb-6">
                <label className="block text-[#888888] font-semibold mb-2">Skin Tone</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Light', 'Medium', 'Dark', 'Tan'].map((tone) => (
                    <button
                      key={tone}
                      className="py-2 rounded text-xs btn-secondary hover:btn-primary transition"
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Scale */}
              <div className="mb-6">
                <label className="block text-[#888888] font-semibold mb-2">Body Scale</label>
                <input type="range" min="0.5" max="1.5" step="0.1" defaultValue="1" className="w-full" />
              </div>

              {/* Save Button */}
              <button className="w-full btn-primary py-2 font-bold mt-8">SAVE AVATAR</button>
            </div>
          </div>

          {/* Equipped Items */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-[#00D7FF] mb-6">Equipped Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { name: 'Hat', slot: 'head' },
                { name: 'Hair', slot: 'hair' },
                { name: 'Face', slot: 'face' },
                { name: 'Shirt', slot: 'shirt' },
                { name: 'Pants', slot: 'pants' },
                { name: 'Shoes', slot: 'shoes' },
              ].map((item) => (
                <div key={item.slot} className="card text-center">
                  <div className="bg-[#2a3050] w-full h-24 rounded mb-2 flex items-center justify-center">
                    <span className="text-[#666666] text-sm">Empty</span>
                  </div>
                  <p className="text-[#888888] text-sm">{item.name}</p>
                  <button className="text-[#00D7FF] text-xs mt-2 hover:underline">Change</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
