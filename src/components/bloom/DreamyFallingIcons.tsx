import { useMemo } from "react";

interface Props {
  count?: number;
  className?: string;
}

export function DreamyFallingIcons({ count = 16, className = "" }: Props) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Choose a starting position spread across 0 to 100% of the screen width
      const left = Math.round(Math.random() * 100);
      
      // Negative delays ensure they are already mid-fall when the component mounts
      const delay = -Math.round(Math.random() * 25 * 10) / 10;
      
      // Falling duration (slower looks more graceful and dreamy)
      const duration = 18 + Math.round(Math.random() * 14); // 18s - 32s
      
      // Randomized horizontal drift (drift left or right by some amount)
      const driftX = (Math.random() * 140 - 70).toFixed(0) + "px";
      
      // Spin/rotation (some rotate clockwise, some counter-clockwise)
      const rotation = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.round(Math.random() * 360)) + "deg";
      
      // Depth parameters (blur, scale, opacity variation)
      const size = 32 + Math.round(Math.random() * 48); // 32px to 80px
      const startScale = (0.7 + Math.random() * 0.3).toFixed(2);
      const endScale = (1.1 + Math.random() * 0.3).toFixed(2);
      const maxOpacity = (0.45 + Math.random() * 0.45).toFixed(2);
      
      // Blur depth effect for further back elements
      const blurLevel = Math.random() > 0.7 ? "blur-[2px]" : Math.random() > 0.4 ? "blur-[0.5px]" : "";
      
      // Select 3D icon type: 0 = exact flower, 1 = star, 2 = heart, 3 = cloud
      const iconType = i % 4;

      return {
        i,
        left,
        delay,
        duration,
        driftX,
        rotation,
        size,
        startScale,
        endScale,
        maxOpacity,
        blurLevel,
        iconType,
      };
    });
  }, [count]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    >
      {items.map((it) => (
        <div
          key={it.i}
          className={`absolute top-[-100px] animate-bloom-fall ${it.blurLevel}`}
          style={{
            left: `${it.left}%`,
            width: `${it.size}px`,
            height: `${it.size}px`,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
            // @ts-expect-error Custom properties used by styles.css bloom-fall keyframes
            "--drift-x": it.driftX,
            "--rotation": it.rotation,
            "--start-scale": it.startScale,
            "--end-scale": it.endScale,
            "--max-opacity": it.maxOpacity,
          }}
        >
          {it.iconType === 0 && (
            /* EXACT LOGO FLOWER with app's rich gradient colors and 3D details */
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_oklch(0.6_0.2_350_/_0.22)] select-none">
              <defs>
                <linearGradient id={`flowerGrad-${it.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.72 0.27 350)" />
                  <stop offset="45%" stopColor="oklch(0.62 0.24 0)" />
                  <stop offset="100%" stopColor="oklch(0.5 0.26 0)" />
                </linearGradient>
              </defs>
              <path 
                d="M 50,52
                   C 43,51 31,45 23,38
                   C 15,31 16,19 25,18
                   C 35,17 44,28 48,37
                   C 49,27 49,15 57,11
                   C 65,7 76,12 75,23
                   C 74,33 64,42 56,47
                   C 64,48 76,48 83,55
                   C 90,62 86,74 76,75
                   C 66,76 58,66 53,58
                   C 53,67 52,80 43,84
                   C 34,88 26,80 29,69
                   C 32,59 41,54 48,52
                   C 39,55 26,63 18,59
                   C 10,55 9,43 17,37
                   C 25,31 38,39 46,46 
                   Z" 
                fill={`url(#flowerGrad-${it.i})`}
              />
              <path 
                d="M 50,47 
                   C 48,44 44,44 44,47 
                   C 44,50 48,53 50,55 
                   C 52,53 56,50 56,47 
                   C 56,44 52,44 50,47 
                   Z" 
                fill="oklch(0.98 0.015 350)" 
              />
              <path 
                d="M 23,24 C 27,21 34,25 36,30" 
                stroke="white" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                opacity="0.8" 
              />
              <path 
                d="M 68,17 C 72,21 72,28 69,32" 
                stroke="white" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                opacity="0.8" 
              />
            </svg>
          )}

          {it.iconType === 1 && (
            /* DREAMY 3D SPARKLING STAR */
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_oklch(0.8_0.1_350_/_0.22)] select-none">
              <defs>
                <linearGradient id={`starGrad-${it.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.97 0.03 350)" />
                  <stop offset="50%" stopColor="oklch(0.92 0.06 350)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.22 350)" />
                </linearGradient>
              </defs>
              <path 
                d="M 50,10 
                   C 50,40 40,50 10,50 
                   C 40,50 50,60 50,90 
                   C 50,60 60,50 90,50 
                   C 60,50 50,40 50,10 
                   Z" 
                fill={`url(#starGrad-${it.i})`}
              />
              {/* Star highlight lines */}
              <line x1="50" y1="20" x2="50" y2="80" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <line x1="20" y1="50" x2="80" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <circle cx="50" cy="50" r="8" fill="white" opacity="0.75" />
            </svg>
          )}

          {it.iconType === 2 && (
            /* CHUBBY GLOSSY HEART with 3D reflections */
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_8px_16px_oklch(0.55_0.25_350_/_0.22)] select-none">
              <defs>
                <linearGradient id={`heartGrad-${it.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.75 0.24 350)" />
                  <stop offset="100%" stopColor="oklch(0.52 0.27 0)" />
                </linearGradient>
              </defs>
              <path 
                d="M 50,28 
                   C 40,12 12,15 12,45 
                   C 12,71 50,90 50,90 
                   C 50,90 88,71 88,45 
                   C 88,15 60,12 50,28 
                   Z" 
                fill={`url(#heartGrad-${it.i})`}
              />
              {/* Glossy 3D edge highlight */}
              <path 
                d="M 22,33 C 18,45 22,58 32,68" 
                stroke="white" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                opacity="0.55" 
                fill="none" 
              />
              <circle cx="73" cy="33" r="4.5" fill="white" opacity="0.7" />
            </svg>
          )}

          {it.iconType === 3 && (
            /* SOFT FROSTED TRANSLUCENT PINK CLOUD */
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_6px_14px_oklch(0.85_0.07_350_/_0.18)] select-none">
              <defs>
                <linearGradient id={`cloudGrad-${it.i}`} x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(0.96 0.04 350)" />
                  <stop offset="50%" stopColor="oklch(0.92 0.06 350)" />
                  <stop offset="100%" stopColor="oklch(0.98 0.02 10)" />
                </linearGradient>
              </defs>
              <path 
                d="M 25,65 
                   C 14,65 8,55 14,44 
                   C 14,33 25,28 35,34 
                   C 40,18 61,18 68,28 
                   C 78,23 88,33 86,44 
                   C 92,55 86,65 75,65 
                   Z" 
                fill={`url(#cloudGrad-${it.i})`} 
                opacity="0.85"
              />
              {/* Highlight curve */}
              <path 
                d="M 28,40 C 33,33 43,31 48,36" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                opacity="0.7" 
                fill="none" 
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
