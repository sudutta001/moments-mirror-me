import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function WinWindow({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="win-out w-full p-[3px]">
      <div className="win-titlebar flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center border border-win-title-fg text-[9px] font-bold">
            ◉
          </span>
          <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        </div>
        <div className="flex gap-[2px]">
          <span className="win-btn flex h-5 w-5 items-center justify-center text-[11px] font-bold">
            _
          </span>
          <span className="win-btn flex h-5 w-5 items-center justify-center text-[11px] font-bold">
            □
          </span>
          <button
            onClick={onClose}
            className="win-btn flex h-5 w-5 items-center justify-center text-[11px] font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function WinInput({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      {label ? <span className="w-24 shrink-0">{label}</span> : null}
      <input {...props} className="win-in w-full px-1 py-1 text-[13px] outline-none" />
    </label>
  );
}

export function WinButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`win-btn px-3 py-1 text-[13px] ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

/** Signed URL for a file stored in the private `media` bucket. */
export function useMediaUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return data ?? null;
}

export function Avatar({
  path,
  username,
  size = 40,
}: {
  path: string | null | undefined;
  username: string;
  size?: number;
}) {
  const url = useMediaUrl(path);
  return url ? (
    <img
      src={url}
      alt={`${username} avatar`}
      loading="lazy"
      className="pixelated shrink-0 rounded-full border-2 border-[var(--win-face-darker)] object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--win-face-darker)] bg-[var(--win-face)] text-[14px] font-bold uppercase"
      style={{ width: size, height: size }}
    >
      {username.charAt(0) || "?"}
    </span>
  );
}

export function PostImage({ path, alt }: { path: string; alt: string }) {
  const url = useMediaUrl(path);
  return url ? (
    <img src={url} alt={alt} loading="lazy" className="pixelated w-full object-cover" />
  ) : (
    <div className="aspect-square w-full animate-pulse bg-[var(--win-face)]" />
  );
}
