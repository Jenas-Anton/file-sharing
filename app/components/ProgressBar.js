import React from 'react';

export default function ProgressBar({ progress = 0 }) {
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
