// useUploads.jsx — photo uploads that can't lose or corrupt an order.
//
// The old flow saved a base64 preview INTO the order (so a few phone photos could push
// the document past MongoDB's 16 MB limit), then swapped in the Cloudinary URL with a
// second save built from a stale snapshot (so multi-photo selections kept only one
// photo, and stage changes made mid-upload were reverted).
//
// New flow: upload to Cloudinary first, keeping the picture only in browser memory (as
// a temporary preview). Only once the upload has succeeded is a { name, type, url,
// publicId } entry added to the order — as its own small, queued save. Failed uploads
// stay on screen with Retry / Remove; nothing is written to the order until they work.
import { useState, useRef, useEffect, useCallback } from "react";
import { uploadFile } from "./api";

let counter = 0;

export function useUploads(onUploaded) {
  const [pending, setPending] = useState([]);
  const handler = useRef(onUploaded);
  handler.current = onUploaded;            // always call the latest handler
  const files = useRef(new Map());         // tempId -> { file, uploaded, previewUrl }

  useEffect(() => () => {
    files.current.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    files.current.clear();
  }, []);

  const patch = useCallback((tempId, changes) => {
    setPending(list => list.map(e => (e.tempId === tempId ? { ...e, ...changes } : e)));
  }, []);

  const finish = useCallback(tempId => {
    const f = files.current.get(tempId);
    if (f && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    files.current.delete(tempId);
    setPending(list => list.filter(e => e.tempId !== tempId));
  }, []);

  const run = useCallback(async tempId => {
    const rec = files.current.get(tempId);
    if (!rec) return;
    patch(tempId, { status: "uploading", error: null });
    try {
      if (!rec.uploaded) {
        const r = await uploadFile(rec.file, "orders");
        rec.uploaded = { name: rec.file.name, type: rec.file.type, url: r.url, publicId: r.publicId };
      }
      // Hand the finished upload to the order. The save queue applies it on top of the
      // latest order, so it can't overwrite anything else.
      const res = handler.current(rec.scope, rec.uploaded);
      if (res && res.accepted === false) {
        patch(tempId, { status: "failed", error: "Uploaded, but not added to the order — resolve the red 'not saved' warning, then press retry." });
        return;
      }
      finish(tempId);
    } catch (e) {
      patch(tempId, { status: "failed", error: (e && e.message) || "Upload failed." });
    }
  }, [patch, finish]);

  const addFiles = useCallback((scope, fileList) => {
    for (const file of Array.from(fileList || [])) {
      const tempId = `up_${Date.now()}_${++counter}`;
      const previewUrl = file.type && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      files.current.set(tempId, { file, uploaded: null, previewUrl, scope });
      setPending(list => [...list, { tempId, scope, name: file.name, type: file.type, previewUrl, status: "uploading", error: null }]);
      run(tempId);
    }
  }, [run]);

  const retry = useCallback(tempId => run(tempId), [run]);
  const dismiss = useCallback(tempId => finish(tempId), [finish]);

  return { pending, addFiles, retry, dismiss };
}

// Tiles for uploads that are still in progress or failed.
export function PendingTiles({ items, onRetry, onDismiss, size = 72 }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map(p => (
        <div key={p.tempId} style={{ position: "relative", width: size, height: size }} title={p.error || ""}>
          <div style={{ width: size, height: size, borderRadius: 8, border: `0.5px solid ${p.status === "failed" ? "#F09595" : "var(--color-border-secondary)"}`, overflow: "hidden", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {p.previewUrl
              ? <img src={p.previewUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <i className="ti ti-file" style={{ fontSize: 20, color: "var(--color-text-secondary)" }} />}
          </div>
          <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: p.status === "failed" ? "rgba(192,57,43,0.55)" : "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
            {p.status === "failed" ? (
              <>
                <div style={{ fontSize: 9, color: "white", fontWeight: 600 }}>Failed</div>
                <button onClick={() => onRetry(p.tempId)} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, border: "none", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Retry</button>
              </>
            ) : (
              <div style={{ fontSize: 9, color: "white", fontWeight: 500 }}>Uploading…</div>
            )}
          </div>
          {p.status === "failed" && (
            <button onClick={() => onDismiss(p.tempId)} title="Remove" style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#C0392B", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
