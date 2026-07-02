import { AppIcon } from "./AppIcon"

export function BloomLogo({ to = "/", className = "" }: { to?: string; className?: string }) {
  return (
    <a href={to} className={`flex items-center gap-2.5 group ${className}`}>
      <div className="transition-transform group-hover:scale-105 shrink-0">
        <AppIcon size={38} />
      </div>
      <span className="font-script text-xl leading-none bg-gradient-to-r from-hotpink to-rose bg-clip-text text-transparent pr-1">
        Bloom &amp; Zein
      </span>
    </a>
  )
}
