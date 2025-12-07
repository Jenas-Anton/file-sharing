"use client";

import { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "uploads";

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [localFiles, setLocalFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
    loadLocalFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setStatus("Loading...");
      const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
      if (error) throw error;

      // Map to include public URL
      const withUrls = data.map((f) => {
        const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
        return { ...f, publicUrl };
      });

      setFiles(withUrls);
      setStatus("");
    } catch (err) {
      console.error(err);
      const msg = err?.message || String(err);
      if (msg.includes("Bucket not found") || msg.includes("bucket")) {
        setStatus(
          `Failed to load files: ${msg}. Make sure a storage bucket named '${BUCKET}' exists and set NEXT_PUBLIC_SUPABASE_BUCKET if you use a different name.`
        );
      } else {
        setStatus(`Failed to load files: ${msg}`);
      }
    }
  };

  const loadLocalFiles = () => {
    try {
      const key = 'uploadedFiles';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      setLocalFiles(existing);
    } catch (e) {
      console.warn('Could not read local stored files', e);
      setLocalFiles([]);
    }
  };

  const removeLocalFile = (index) => {
    (async () => {
      try {
        const key = 'uploadedFiles';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');

        // try to determine path to delete from bucket
        const entry = existing[index];
        let path = entry?.path || null;
        if (!path && entry?.url) {
          // try to derive path from public URL pattern
          try {
            const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
            if (entry.url.startsWith(base)) path = entry.url.slice(base.length);
          } catch (e) {
            // ignore
          }
        }

        if (path) {
          // call server API to delete
          try {
            const res = await fetch('/api/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || json?.message || res.statusText);
            setStatus(`Deleted ${entry.name} from bucket`);
          } catch (err) {
            console.warn('Failed to delete from bucket', err);
            setStatus(`Failed to delete from bucket: ${err.message || err}`);
          }
        }

        existing.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(existing));
        setLocalFiles(existing);
      } catch (e) {
        console.warn('Could not remove local file', e);
      }
    })();
  };

  const removeBucketFile = async (name) => {
    try {
      const path = name; // in our listing, path is the file name
      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || res.statusText);
      setStatus(`Deleted ${name} from bucket`);
      // refresh lists
      await fetchFiles();
      loadLocalFiles();
    } catch (err) {
      console.error('Failed to delete bucket file', err);
      setStatus(`Failed to delete: ${err.message || err}`);
    }
  };

  const refresh = async () => {
    setStatus('Refreshing...');
    await fetchFiles();
    loadLocalFiles();
    setStatus('');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Files Page</h1>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Files</h2>
          <div>
            <button onClick={refresh} style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
              Refresh
            </button>
            <span style={{ color: '#666', fontSize: 13 }}>
              Total: {(() => {
                // compute unique combined count
                const map = new Map();
                localFiles.forEach((l) => map.set(l.url || l.path || `${l.name}:${l.uploadedAt}`, true));
                files.forEach((b) => map.set(b.publicUrl || b.name, true));
                return map.size;
              })()}
            </span>
          </div>
        </div>

        {localFiles.length === 0 && files.length === 0 && !status && <div>No files found in bucket or local storage.</div>}

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {/* Render local files first (they may include recent uploads) */}
          {localFiles.map((f, i) => (
            <li key={`local-${i}`} style={{ marginBottom: 18 }}>
              <div>
                <strong>{f.name}</strong>
                <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>({new Date(f.uploadedAt).toLocaleString()})</span>
              </div>
              <div>
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>No URL available (private file)</span>
                )}
                <button style={{ marginLeft: 8 }} onClick={() => removeLocalFile(i)}>
                  Remove
                </button>
              </div>
              {f.url && f.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img src={f.url} alt={f.name} style={{ maxWidth: 400, marginTop: 8 }} />
              )}
            </li>
          ))}

          {/* Then render unique bucket files that are not already listed in localFiles */}
          {(() => {
            const seen = new Set(localFiles.map((l) => l.url || l.path || l.name));
            return files
              .filter((b) => {
                const key = b.publicUrl || b.name;
                return !seen.has(key);
              })
              .map((f) => (
                <li key={`bucket-${f.name}`} style={{ marginBottom: 18 }}>
                  <div>
                    <strong>{f.name}</strong>
                  </div>
                  <div>
                    <a href={f.publicUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button style={{ marginLeft: 8 }} onClick={() => removeBucketFile(f.name)}>
                      Delete
                    </button>
                  </div>
                  {f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                    <img src={f.publicUrl} alt={f.name} style={{ maxWidth: 400, marginTop: 8 }} />
                  )}
                </li>
              ));
          })()}
        </ul>
      </div>
    </div>
  );
}
