import React, { useState, useCallback } from 'react';
import AlertMsg from './AlertMsg';
import FilePreview from './FilePreview';
import ProgressBar from './ProgressBar';

function humanFileSize(size) {
  if (!size) return '0 B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  return `${(size / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

export default function UploadForm({ uploadBtnClick, progress }) {
  const [file, setFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const onFileSelect = useCallback(
    (selectedFile) => {
      if (!selectedFile) return;
      if (selectedFile.size > 2 * 1024 * 1024) {
        setErrorMsg('Maximum file size is 2 MB');
        return;
      }
      setErrorMsg(null);
      setFile(selectedFile);
    },
    [setFile, setErrorMsg]
  );

  const onInputChange = (e) => onFileSelect(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    onFileSelect(f);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative group rounded-xl transition-shadow bg-white dark:bg-gray-800 shadow-sm ${
          dragOver ? 'ring-4 ring-blue-200 dark:ring-blue-900' : ''
        }`}
      >
        <label htmlFor="dropzone-file" className="flex flex-col md:flex-row items-center gap-6 p-6 cursor-pointer">
          <div className="flex items-center justify-center w-28 h-28 rounded-lg bg-blue-50 dark:bg-gray-700 flex-shrink-0 transition-transform group-hover:scale-105">
            <svg
              className="w-12 h-12 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16l3-3m0 0l3 3m-3-3v8M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6M16 6l-4-4-4 4" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{file ? 'Ready to upload' : 'Click to upload or drag and drop'}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">SVG, PNG, JPG or GIF — Max size: <strong>2 MB</strong></p>

            {file ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">{file.name}</div>
                <div className="text-xs text-gray-400">{humanFileSize(file.size)}</div>
                <button type="button" onClick={() => setFile(null)} className="ml-auto text-sm text-red-600 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-400">Drop here or click to browse</div>
            )}
          </div>

          <input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={onInputChange} aria-label="File upload" />
        </label>
      </div>

      <div className="mt-4">
        {errorMsg && <AlertMsg msg={errorMsg} />}

        {file ? (
          <>
            <div className="mt-4">
              <FilePreview file={file} removeFile={() => setFile(null)} />
            </div>

            <div className="mt-4 flex items-center gap-3">
              {progress > 0 ? (
                <div className="flex-1">
                  <ProgressBar progress={progress} />
                </div>
              ) : (
                <button
                  disabled={!file}
                  onClick={() => uploadBtnClick(file)}
                  className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:brightness-105 disabled:opacity-60 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5-5 5 5M12 5v12" />
                  </svg>
                  <span className="font-medium">Upload</span>
                </button>
              )}

              <button type="button" onClick={() => setFile(null)} className="ml-auto text-sm px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 text-center text-sm text-gray-500">No file selected</div>
        )}
      </div>
    </div>
  );
}
