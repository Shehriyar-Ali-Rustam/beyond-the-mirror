import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/logo.png";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return <Image src={logo} alt="" width={40} height={40} priority className={cn("size-10 select-none", className)} draggable={false} />;
}

export function Logo({ href = "/", className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)} aria-label="Beyond the Mirror home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
      {!compact && (
        <span className="font-display text-[17px] leading-none text-ink">
          Beyond <span className="italic text-ink-2">the</span> Mirror
        </span>
      )}
    </Link>
  );
}
