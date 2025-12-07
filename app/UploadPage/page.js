// app/UploadPage/page.js (or wherever your UploadPage component is)
"use client";

import { useEffect, useRef, useState } from "react";
import supabase from "../../lib/supabaseClient"; // not needed here, uncomment only if used

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "uploads";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [progress, setProgress] = useState(0); // 0 - 100
  const [uploading, setUploading] = useState(false);
  const [speed, setSpeed] = useState(null); // bytes/sec
  const [eta, setEta] = useState(null); // seconds
  const [elapsed, setElapsed] = useState(0);
  const [recent, setRecent] = useState([]);
  const xhrRef = useRef(null);
  const startedAtRef = useRef(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    // load recent uploads from localStorage
    try {
      const key = "uploadedFiles";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      setRecent(existing);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (uploading) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
      }, 500);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [uploading]);

  const onFiles = (f) => {
    setFile(f);
    setPublicUrl("");
    setStatus("");
    setProgress(0);
    setSpeed(null);
    setEta(null);
  };

  // drag & drop handlers
  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) onFiles(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => e.preventDefault();

  const cancelUpload = () => {
    if (xhrRef.current) {
      try {
        xhrRef.current.abort();
      } catch (e) {
        console.warn("Error aborting xhr", e);
      }
      xhrRef.current = null;
    }
    setUploading(false);
    setStatus("Upload cancelled");
  };

  const uploadFile = async (e) => {
    e?.preventDefault?.();
    if (!file) {
      setStatus("Please select a file first.");
      return;
    }

    setStatus("Preparing upload...");
    setProgress(0);
    setPublicUrl("");
    setUploading(true);
    setSpeed(null);
    setEta(null);
    startedAtRef.current = Date.now();
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();

    try {
      const fd = new FormData();
      fd.append("file", file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("POST", "/api/upload", true);

      // upload progress
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          setProgress(percent);

          // measure speed
          const now = Date.now();
          const deltaBytes = ev.loaded - lastLoadedRef.current;
          const deltaTime = (now - lastTimeRef.current) / 1000; // seconds
          if (deltaTime > 0) {
            const currentSpeed = deltaBytes / deltaTime; // bytes/sec
            setSpeed(currentSpeed);
            const remainingBytes = ev.total - ev.loaded;
            const est = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : null;
            setEta(est);
          }
          lastLoadedRef.current = ev.loaded;
          lastTimeRef.current = now;
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setStatus("Upload failed: network error");
        xhrRef.current = null;
      };

      xhr.onabort = () => {
        setUploading(false);
        setStatus("Upload cancelled");
        xhrRef.current = null;
      };

      xhr.onload = () => {
        xhrRef.current = null;
        setUploading(false);

        if (xhr.status >= 200 && xhr.status < 300) {
          let json = {};
          try {
            json = JSON.parse(xhr.responseText);
          } catch (e) {
            setStatus("Upload failed: invalid JSON response from server");
            return;
          }

          // handle server warnings/errors
          if (json?.error || json?.message) {
            const msg = json.error || json.message;
            if (String(msg).includes("Bucket not found") || String(msg).includes("bucket")) {
              setStatus(
                `Upload failed: ${msg}. Make sure a storage bucket named '${BUCKET}' exists in your Supabase project and that NEXT_PUBLIC_SUPABASE_BUCKET is set.`
              );
            } else if (String(msg).includes("Row-level security") || String(msg).includes("row-level")) {
              setStatus(`Upload failed: ${msg}. This looks like a DB RLS error (check your table policies).`);
            } else {
              setStatus(`Upload failed: ${msg}`);
            }
            return;
          }

          const url = json.publicUrl || json.url || json.signedUrl || "";
          setPublicUrl(url || "");
          setStatus("Upload successful");

          // save to localStorage as before
          try {
            const key = "uploadedFiles";
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const item = {
              url,
              name: file.name,
              path: json.path || null,
              uploadedAt: new Date().toISOString(),
            };
            existing.unshift(item);
            localStorage.setItem(key, JSON.stringify(existing));
            setRecent(existing);
          } catch (e) {
            console.warn("Could not save uploaded file to localStorage", e);
          }
        } else {
          // non-2xx response
          let json = {};
          try {
            json = JSON.parse(xhr.responseText || "{}");
          } catch {}
          const msg = json?.error || json?.message || xhr.statusText || `Status ${xhr.status}`;
          if (String(msg).includes("Bucket not found") || String(msg).includes("bucket")) {
            setStatus(
              `Upload failed: ${msg}. Make sure a storage bucket named '${BUCKET}' exists in your Supabase project and that NEXT_PUBLIC_SUPABASE_BUCKET is set.`
            );
          } else {
            setStatus(`Upload failed: ${msg}`);
          }
        }
      };

      // send
      xhr.send(fd);
    } catch (err) {
      console.error(err);
      setUploading(false);
      setStatus(`Upload failed: ${err?.message || String(err)}`);
    }
  };

  const humanBytes = (n) => {
    if (!n && n !== 0) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let num = n;
    while (num >= 1024 && i < units.length - 1) {
      num /= 1024;
      i++;
    }
    return `${num.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  };

  const prettyTime = (s) => {
    if (s == null) return "-";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h2>Upload Page</h2>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          border: "2px dashed #888",
          borderRadius: 8,
          padding: 18,
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Drag & drop a file here or</div>
          <label
            style={{
              display: "inline-block",
              marginTop: 8,
              background: "#1f2937",
              padding: "8px 12px",
              borderRadius: 6,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFiles(f);
              }}
            />
            Choose file
          </label>
          <div style={{ marginTop: 8, fontSize: 13, color: "#cbd5e1" }}>
            Selected: {file ? `${file.name} (${humanBytes(file.size)})` : "none"}
          </div>
        </div>

        <div style={{ minWidth: 220, textAlign: "right" }}>
          <button
            onClick={uploadFile}
            disabled={uploading || !file}
            style={{
              background: uploading ? "#374151" : "#10b981",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 6,
              cursor: uploading || !file ? "not-allowed" : "pointer",
              marginRight: 8,
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          <button
            onClick={() => {
              setFile(null);
              setPublicUrl("");
              setStatus("");
              setProgress(0);
            }}
            disabled={uploading && !xhrRef.current}
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              padding: "10px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* progress box */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Status:</strong> {status || (uploading ? "Preparing..." : "Idle")}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            {uploading ? `Elapsed: ${prettyTime(elapsed)}` : null}
          </div>
        </div>

        {/* progress bar */}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              height: 12,
              width: "100%",
              background: "#111827",
              borderRadius: 6,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                transition: "width 160ms linear",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>{progress}%</div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              {speed ? `${humanBytes(Math.round(speed))}/s` : "-"} {eta ? ` • ETA ${prettyTime(eta)}` : ""}
            </div>
          </div>

          {uploading && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={cancelUpload}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                }}
              >
                Cancel Upload
              </button>
            </div>
          )}
        </div>
      </div>

      {/* public url + preview */}
      {publicUrl && (
        <div style={{ marginTop: 14 }}>
          <strong>Public URL:</strong>
          <div style={{ marginTop: 6 }}>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
          </div>
          {publicUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
            <img src={publicUrl} alt="uploaded" style={{ maxWidth: "100%", marginTop: 8 }} />
          )}
        </div>
      )}

      {/* recent uploads */}
      <div style={{ marginTop: 22 }}>
        <h3 style={{ marginBottom: 8 }}>Recent uploads</h3>
        {recent.length === 0 && <div style={{ color: "#94a3b8" }}>No uploads yet.</div>}
        <ul style={{ paddingLeft: 14 }}>
          {recent.map((r, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{r.name}</strong> <span style={{ color: "#94a3b8", fontSize: 12 }}>• {new Date(r.uploadedAt).toLocaleString()}</span>
              </div>
              {r.url ? (
                <div>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.url}
                  </a>
                </div>
              ) : (
                <div style={{ color: "#94a3b8" }}>No URL available (private file)</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
