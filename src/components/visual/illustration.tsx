import Image from "next/image";
import { cn } from "@/lib/utils";

export type IllustrationName =
  | "conversation" | "anonymous-feedback" | "online-community" | "studying" | "meditation" | "mindfulness"
  | "friendship" | "message-sent" | "booked" | "calendar" | "secure-login" | "feeling-happy" | "in-thought"
  | "showing-support" | "chatting" | "active-support" | "posting-photo" | "feeling-blue" | "a-moment-to-relax"
  | "together" | "empty-mailbox" | "book-reading" | "safe" | "booking" | "letter" | "happy-news"
  | "relaxed-reading" | "sorting-thoughts" | "podcast-listener" | "audio-conversation" | "listening" | "recording"
  | "gaming" | "character-drawing" | "having-fun" | "choose-color";

/** Illustrations from unDraw (open licence), recoloured to the brand palette. */
export function Illustration({ name, className, alt = "" }: { name: IllustrationName; className?: string; alt?: string }) {
  return (
    <Image
      src={`/illustrations/${name}.svg`}
      alt={alt}
      width={480}
      height={400}
      unoptimized
      className={cn("h-auto select-none", className)}
      draggable={false}
    />
  );
}
