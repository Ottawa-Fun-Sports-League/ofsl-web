import { ReactNode } from "react";

interface HeroBannerProps {
  image: string;
  imageAlt: string;
  containerClassName?: string;
  className?: string;
  children: ReactNode;
}

export function HeroBanner({
  image,
  imageAlt,
  containerClassName = "h-[604px]",
  className = "",
  children,
}: HeroBannerProps) {
  return (
    <div className={`relative w-full ${containerClassName} ${className}`.trim()}>
      <img
        className="w-full h-full object-cover"
        alt={imageAlt}
        src={image}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent sm:bg-gradient-to-t sm:from-black/80 sm:via-black/45 sm:to-transparent">
        {children}
      </div>
    </div>
  );
}
