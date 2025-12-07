import React from 'react';

export default function AlertMsg({ msg }) {
  if (!msg) return null;
  return (
    <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-800">
      <div className="text-sm">{msg}</div>
    </div>
  );
}
