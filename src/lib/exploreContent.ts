/**
 * exploreContent — the growing libraries the plan-reasoning sheet recommends from.
 *
 * Reads come from readsData (ARTICLES). Flows & meditations live here. Add a new
 * entry to either array and it automatically starts surfacing in the "Explore
 * more" recommendations (phase-matched, rotated), so as more flows / meditation
 * audios ship, the recommendations stay fresh on their own — no other change.
 */
import type { DietPhaseKey } from "@/components/bloom/cyclePhase";

export interface ExploreItem {
  id: string;
  title: string;
  sub: string;                 // short "12 min · Gentle"
  image: string;
  href: string;
  /** Phases this suits best; omit = suits any phase. */
  phases?: DietPhaseKey[];
}

/** Yoga flows — add new flows here; they auto-appear in plan recommendations. */
export const FLOWS: ExploreItem[] = [
  { id: "restorative",  title: "Restorative Flow",   sub: "15 min · Gentle",    image: "/images/pose-childs-pose.webp",  href: "/app/tools/yoga", phases: ["menstrual", "luteal"] },
  { id: "legs-up-wall", title: "Legs Up the Wall",   sub: "10 min · Calming",   image: "/images/pose-legs-up-wall.webp", href: "/app/tools/yoga", phases: ["menstrual", "luteal"] },
  { id: "energizing",   title: "Energizing Flow",    sub: "20 min · Uplifting", image: "/images/pose-warrior-2.webp",    href: "/app/tools/yoga", phases: ["follicular"] },
  { id: "balance",      title: "Balance & Strength", sub: "18 min · Steady",    image: "/images/pose-tree.webp",         href: "/app/tools/yoga", phases: ["follicular", "ovulatory"] },
  { id: "power",        title: "Power Flow",         sub: "20 min · Strong",    image: "/images/pose-triangle.webp",     href: "/app/tools/yoga", phases: ["ovulatory"] },
  { id: "calming",      title: "Calming Flow",       sub: "18 min · Grounding", image: "/images/pose-forward-fold.webp", href: "/app/tools/yoga", phases: ["luteal"] },
  { id: "hip-open",     title: "Hip-Opening Flow",   sub: "15 min · Release",   image: "/images/pose-pigeon.webp",       href: "/app/tools/yoga" },
];

/** Meditations — add new audios here; they auto-appear in plan recommendations. */
export const MEDITATIONS: ExploreItem[] = [
  { id: "morning-calm", title: "Morning Calm",       sub: "5 min · Breath",  image: "/images/pose-easy-seat.webp",         href: "/app/tools/yoga" },
  { id: "box-breath",   title: "Box Breathing",      sub: "4 min · Reset",   image: "/images/pose-box-breathing.webp",     href: "/app/tools/yoga" },
  { id: "body-scan",    title: "Body Scan",          sub: "8 min · Unwind",  image: "/images/pose-savasana.webp",          href: "/app/tools/yoga", phases: ["luteal", "menstrual"] },
  { id: "cramp-ease",   title: "Cramp-Ease Breath",  sub: "6 min · Soothe",  image: "/images/pose-supported-savasana.webp", href: "/app/tools/yoga", phases: ["menstrual"] },
  { id: "nostril",      title: "Alternate Nostril",  sub: "5 min · Balance", image: "/images/pose-alternate-nostril.webp", href: "/app/tools/yoga" },
];
