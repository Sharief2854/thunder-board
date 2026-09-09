import React from 'react';

interface LoadingScreenProps {
  fadingOut?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ fadingOut = false }) => {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0e1117] text-slate-100 transition-opacity duration-500 ease-out select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Loading Bar */}
        <div className="w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 mb-3 relative">
          <div className="h-full bg-blue-500 rounded-full animate-loading-bar" />
        </div>

        {/* Status Text */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>Loading workspace & canvas...</span>
        </div>
      </div>

      {/* Bottom Subtle Tag */}
      <div className="absolute bottom-6 text-[11px] text-slate-500 tracking-wider uppercase font-medium">
        Offline-first • Hardware Accelerated
      </div>
    </div>
  );
};
