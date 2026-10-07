import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { optimizeImage, validateImage } from "../utils/images";
import { uploadPhoto } from "../services/photos";
export function Upload() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file || !profile || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const image = await optimizeImage(file);
      await uploadPhoto(profile.id, crypto.randomUUID(), image);
      navigate("/");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("תמונה")
          ? e.message
          : "לא ניתן להכין או להעלות את התמונה. נסה שוב.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>העלאת תמונה חדשה</h1>
      </div>
      <form onSubmit={submit} className="card upload">
        <label className="dropzone">
          📷<strong>בחירת תמונה</strong>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              setError("");
              setFile(null);
              const next = e.target.files?.[0];
              if (next)
                try {
                  validateImage(next);
                  setFile(next);
                } catch (e) {
                  setError((e as Error).message);
                }
            }}
          />
        </label>
        {preview && (
          <img
            className="preview"
            src={preview}
            alt="תצוגה מקדימה לפני העלאה"
          />
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={!file || busy}>
          {busy ? "מכינים ומעלים…" : "אישור והעלאה"}
        </button>
      </form>
    </>
  );
}
