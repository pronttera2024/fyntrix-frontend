import React from "react";
import { cn } from "../../lib/utils";

type Props = {
  className?: string;
};

export function FooterBlur({ className }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-0 left-0 -z-10 h-full w-full bg-[url('/footer-blur-mobile.png')] hue-rotate-[332deg] mask-t-from-90% bg-cover bg-center bg-no-repeat md:bg-[url('/footer-blur-desktop.png')] hue-rotate-[332deg]",
        className,
      )}
    />
  );
}
