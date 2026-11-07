import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Height of the 3D computer's canvas, shared by the loading placeholder so the
 * layout never shifts. On phones the computer sits above the bio, so its
 * height is whatever is left of the viewport after the hero text and CTAs
 * (`100svh - 30.5rem`), clamped to a usable range.
 */
export const HERO_COMPUTER_HEIGHT =
  "h-[clamp(12rem,calc(100svh-30.5rem),20rem)] sm:h-[22rem] lg:h-[34rem]";

/** Flat 2D stand-in for the 3D computer, shown only when WebGL isn't available. */
export function HeroComputerPoster({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 flex items-center justify-center", className)}>
      <div className="w-[62%] max-w-[22rem] rounded-[1.6rem] bg-[#cdbf9f] p-[4.5%] shadow-2xl shadow-black/30">
        <div className="relative aspect-[1.26] overflow-hidden rounded-xl bg-[#030806]">
          <Image
            src="/headshot.webp"
            alt="Davide Fedele"
            fill
            sizes="(max-width: 1024px) 60vw, 22rem"
            className="object-cover object-[50%_35%]"
          />
          <div className="absolute inset-0 bg-emerald-500/15 mix-blend-color" />
          <div aria-hidden className="crt-scanlines absolute inset-0" />
          <div aria-hidden className="crt-vignette absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
