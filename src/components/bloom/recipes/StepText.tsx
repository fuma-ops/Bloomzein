import { useState } from "react";
import { SUBRECIPES } from "./data";

/* Renders a recipe step string with two bits of inline markup:
 *   **ingredient**   → shown in solid pink so it stands out
 *   [[sub-recipe]]   → a tappable word; tapping reveals a one-line how-to
 * Keeps steps short while making every ingredient scannable and every
 * sauce/dip self-explanatory. */

function SubRecipe({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const how = SUBRECIPES[name.toLowerCase()];
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="font-bold text-hotpink underline decoration-dotted decoration-hotpink/50 underline-offset-2 hover:text-magenta transition"
      >
        {name}
      </button>
      {open && how && (
        <span className="mt-1.5 mb-1 block rounded-xl bg-blush/60 border border-petal/60 px-3 py-2 text-[12px] leading-snug text-rose/85">
          <b className="capitalize text-hotpink">{name} · </b>{how}
        </span>
      )}
    </>
  );
}

export function StepText({ text }: { text: string }) {
  // Split on the two token types, keeping the delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <b key={i} className="font-bold text-hotpink">{p.slice(2, -2)}</b>;
        }
        if (p.startsWith("[[") && p.endsWith("]]")) {
          return <SubRecipe key={i} name={p.slice(2, -2)} />;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
