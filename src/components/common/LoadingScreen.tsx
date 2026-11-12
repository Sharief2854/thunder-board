import React from 'react';
import { APP_ICON_BASE64 } from '../../assets/iconBase64';

interface LoadingScreenProps {
  fadingOut?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ fadingOut = false }) => {
  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-slate-100 select-none transition-opacity duration-200 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 mb-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
          <img
            src={APP_ICON_BASE64}
            alt="ThunderBoard"
            className="w-8 h-8 rounded object-contain"
          />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          ThunderBoard
        </h1>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          Digital Teaching Whiteboard & Code Canvas
        </p>

        {/* Clean, minimal loading progress */}
        <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-blue-500 rounded-full w-2/5" />
        </div>
      </div>

      {/* Footer attribution */}
      <div className="absolute bottom-6 text-[11px] text-slate-500 font-medium tracking-wide">
        Developed by Sharief
      </div>
    </div>
  );
};
