import { useState } from "react";
import { cn } from "@/lib/utils";

interface GracefulImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

const GracefulImage = ({ src, alt, className, wrapperClassName, ...props }: GracefulImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-secondary" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
};

export default GracefulImage;
