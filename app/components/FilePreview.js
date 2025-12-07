import React from 'react';

export default function FilePreview({ file, removeFile }) {
  if (!file) return null;

  const isImage = file.type?.startsWith('image/');

  return (
    <div className="mt-3 flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
      <div className="w-20 h-20 flex items-center justify-center bg-white rounded-md overflow-hidden border">
        {isImage ? (
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="object-cover w-full h-full"
            onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
          />
        ) : (
          <div className="text-sm text-gray-500 px-2">{file.name}</div>
        )}
      </div>

      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</div>
        <div className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</div>
      </div>

      <div>
        <button
          onClick={removeFile}
          className="text-sm text-red-600 hover:underline"
          type="button"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
