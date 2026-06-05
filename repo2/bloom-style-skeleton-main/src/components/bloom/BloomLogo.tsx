import { Link } from "@tanstack/react-router";
import { Flower2 } from "lucide-react";

export function BloomLogo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-blush text-hotpink shadow-sm">
        <Flower2 className="h-5 w-5" />
      </span>
      <span className="font-script text-3xl leading-none text-hotpink">Bloom</span>
    </Link>
  );
}