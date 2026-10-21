import Image from "next/image";
import { PHOTOS, type PhotoName } from "@/lib/photos";
import { cn } from "@/lib/utils";

const TONES = {
  peach: "bg-coral-soft",
  sun: "bg-sun-soft",
  mint: "bg-mint-soft",
  sky: "bg-sky-soft",
  lavender: "bg-lilac-soft",
  rose: "bg-rose-soft",
  teal: "bg-primary-soft",
} as const;

/**
 * A photo seen "through the mirror": the brand's arch shape, with a soft
 * coloured arch offset behind it.
 */
export function ArchPhoto({
  name,
  tone = "peach",
  className,
  sizes = "(min-width: 1024px) 380px, 80vw",
  priority,
  offset = true,
}: {
  name: PhotoName;
  tone?: keyof typeof TONES;
  className?: string;
  sizes?: string;
  priority?: boolean;
  offset?: boolean;
}) {
  const photo = PHOTOS[name];
  return (
    <div className={cn("relative", className)}>
      {offset && <div aria-hidden className={cn("arch absolute inset-0 translate-x-4 translate-y-4", TONES[tone])} />}
      <div className="arch relative h-full w-full overflow-hidden shadow-lg ring-4 ring-surface">
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} placeholder="blur" priority={priority} className="object-cover" />
      </div>
    </div>
  );
}

/** Rounded rectangular photo (cards, banners). */
export function Photo({
  name,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority,
  imgClassName,
}: {
  name: PhotoName;
  className?: string;
  sizes?: string;
  priority?: boolean;
  imgClassName?: string;
}) {
  const photo = PHOTOS[name];
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} placeholder="blur" priority={priority} className={cn("object-cover", imgClassName)} />
    </div>
  );
}
