import { useState } from "react";
import { cn } from "@/lib/utils";

interface GracefulImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

const GracefulImage = ({ src, alt, className, wrapperClassName, ...props }: GracefulImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName, className)}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-secondary" />
      )}
      <img
        src={src}
        alt={alt}
        loading="eager"
        className={cn(
          "transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
        {...props}
      />
    </div>
  );
};

export default GracefulImage;
