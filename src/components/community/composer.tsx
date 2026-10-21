"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { HelpCircle, ImagePlus, Loader2, Send, Sparkles, VenetianMask, X } from "lucide-react";
import { createPost } from "@/actions/community";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIDE = 1600;

/**
 * Re-draws the photo on a canvas: shrinks big phone photos and, importantly,
 * strips hidden metadata such as GPS location before anything is uploaded.
 */
async function preparePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not process that image.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function Composer({ name, hue, role }: { name: string; hue: number; role: "student" | "counselor" }) {
  const [state, action, pending] = useActionState(createPost, null);
  const [kind, setKind] = useState<"advice" | "share">("advice");
  const [anonymous, setAnonymous] = useState(false);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Posted to the community");
      /* eslint-disable react-hooks/set-state-in-effect -- reset the composer after a successful post */
      setBody("");
      setPhoto(null);
      setPreview(null);
      setAnonymous(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    } else toast.error(state.error);
  }, [state]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image.");
    setProcessing(true);
    try {
      const prepared = await preparePhoto(file);
      setPhoto(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch {
      toast.error("That image couldn't be used. Try a JPG or PNG.");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("body", body);
    fd.set("kind", kind);
    if (anonymous) fd.set("anonymous", "on");
    if (photo) fd.set("image", photo);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex gap-3">
        {anonymous ? (
          <span className="arch-sm flex size-10 shrink-0 items-center justify-center bg-lilac-soft text-lilac">
            <VenetianMask className="size-5" />
          </span>
        ) : (
          <Avatar name={name} hue={hue} />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type of post">
            {(
              [
                { value: "advice", label: "Ask for advice", icon: HelpCircle, on: "bg-sun-soft text-[#8a5a00] border-sun" },
                { value: "share", label: "Share something", icon: Sparkles, on: "bg-sky-soft text-[#1f5f97] border-sky" },
              ] as const
            ).map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition",
                  kind === k.value ? k.on : "border-line text-ink-3 hover:text-ink",
                )}
              >
                <k.icon className="size-3.5" /> {k.label}
              </button>
            ))}
          </div>
          <label htmlFor="post-body" className="sr-only">
            Your post
          </label>
          <textarea
            id="post-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={kind === "advice" ? "What would you like advice on? Others can reply with suggestions." : "Share a win, a thought, a tip, or something that made you smile."}
            className="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
          />

          <AnimatePresence>
            {preview && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-3 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={preview} alt="Selected photo preview" className="max-h-64 rounded-2xl border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPreview(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-white backdrop-blur hover:bg-ink"
                  aria-label="Remove photo"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={fileInput} type="file" accept="image/*" className="sr-only" id="post-photo" onChange={(e) => void pick(e.target.files?.[0])} />
            <label
              htmlFor="post-photo"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-mint transition hover:bg-mint-soft"
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Photo
            </label>
            {role === "student" && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-2 transition hover:bg-lilac-soft">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-4 accent-[var(--lilac)]" />
                <VenetianMask className="size-4 text-lilac" /> Post anonymously
              </label>
            )}
            <Button type="submit" size="sm" className="ml-auto" loading={pending} disabled={!body.trim() || processing}>
              {!pending && <Send />} Post
            </Button>
          </div>
          {anonymous && (
            <p className="mt-2 text-xs leading-relaxed text-ink-3">
              Other students won&apos;t see your name. Counselors can, so they can help keep everyone safe.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
