import { useEffect, useState } from "react";
import { supabase } from "../services/client";
export function Photo({
  path,
  alt,
  width,
  height,
}: {
  path: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    setUrl("");
    const refresh = async () => {
      const { data, error } = await supabase.storage
        .from("company-photos")
        .createSignedUrl(path, 120);
      if (alive) {
        setError(Boolean(error));
        setUrl(data?.signedUrl || "");
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 90000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path, revision]);
  return error ? (
    <button className="image-error" onClick={() => setRevision((v) => v + 1)}>
      טעינת התמונה נכשלה · נסה שוב
    </button>
  ) : url ? (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setError(true)}
    />
  ) : (
    <div
      className="image-loading"
      style={{ aspectRatio: width && height ? `${width}/${height}` : "4/3" }}
      aria-label="טוען תמונה"
    />
  );
}
