export function BloomLogo({ to = "/" }: { to?: string }) {
  return (
    <a href={to} className="flex items-center gap-2 group">
      <div className="relative flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-hotpink drop-shadow-sm">
          {/* Hand-drawn chunky organic 5-petal flower body */}
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
            fill="currentColor"
          />
          
          {/* A cute hand-drawn soft white heart in the center */}
          <path 
            d="M 50,47 
               C 48,44 44,44 44,47 
               C 44,50 48,53 50,55 
               C 52,53 56,50 56,47 
               C 56,44 52,44 50,47 
               Z" 
            fill="white" 
          />

          {/* Cute hand-drawn glossy reflection highlight strokes */}
          <path 
            d="M 23,24 C 27,21 34,25 36,30" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            opacity="0.9" 
          />
          <path 
            d="M 68,17 C 72,21 72,28 69,32" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            opacity="0.9" 
          />

          {/* Whimsical hand-drawn background accent circles */}
          <circle cx="50" cy="5" r="2.5" fill="currentColor" opacity="0.4" />
          <circle cx="88" cy="30" r="2" fill="currentColor" opacity="0.4" />
          <circle cx="75" cy="85" r="2.5" fill="currentColor" opacity="0.4" />
          <circle cx="25" cy="88" r="2" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="41" r="2.5" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <span className="font-script text-xl leading-none bg-gradient-to-r from-hotpink to-rose bg-clip-text text-transparent pr-3">B &amp; Z</span>
    </a>
  );
}
