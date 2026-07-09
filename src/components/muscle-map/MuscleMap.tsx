"use client";

import { useState } from "react";
import { femaleFrontPaths } from "./female-front-paths";
import { femaleBackPaths } from "./female-back-paths";
import type { BodyPartPathData } from "./types";

// Silhouette-only parts — drawn but never selectable.
const DECOR = new Set(["hair", "head", "hands", "feet"]);

const LABELS: Record<string, string> = {
  abs: "Abs", adductors: "Inner thighs", ankles: "Ankles", biceps: "Biceps",
  calves: "Calves", chest: "Chest", deltoids: "Shoulders", forearm: "Forearms",
  gluteal: "Glutes", hamstring: "Hamstrings", knees: "Knees", "lower-back": "Lower back",
  neck: "Neck", obliques: "Obliques", quadriceps: "Quads", serratus: "Serratus",
  tibialis: "Shins", trapezius: "Traps", triceps: "Triceps", "upper-back": "Upper back",
  lats: "Lats",
};

export function muscleLabel(slug: string) {
  return LABELS[slug] ?? slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Body({
  paths, viewBox, selected, onToggle, readonly,
}: {
  paths: BodyPartPathData[];
  viewBox: string;
  selected: Set<string>;
  onToggle?: (slug: string) => void;
  readonly?: boolean;
}) {
  return (
    <svg viewBox={viewBox} className="h-[320px] w-auto select-none" xmlns="http://www.w3.org/2000/svg">
      {paths.map((p) => {
        const decor = DECOR.has(p.slug);
        const active = !decor && selected.has(p.slug);
        const clickable = !decor && !readonly;
        return (
          <g
            key={p.slug}
            onClick={clickable ? () => onToggle?.(p.slug) : undefined}
            className={clickable ? "cursor-pointer" : undefined}
          >
            {!decor && <title>{muscleLabel(p.slug)}</title>}
            {[...p.common, ...p.left, ...p.right].map((d, i) => (
              <path
                key={i}
                d={d}
                fill={active ? "var(--color-brand)" : decor ? "var(--color-line)" : "var(--color-line-2)"}
                stroke={active ? "var(--color-brand-ink)" : "var(--color-muted)"}
                strokeWidth={active ? 1.4 : 0.6}
                strokeOpacity={active ? 0.6 : 0.35}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Clickable front/back body map (ported from the original SoulPilates MuscleMapJS).
 * Editable mode keeps a hidden `muscles` input in sync for plain form posts.
 */
export default function MuscleMap({ initial, readonly }: { initial: string[]; readonly?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <div>
      {!readonly && <input type="hidden" name="muscles" value={[...selected].sort().join(",")} />}
      <div className="flex items-start justify-center gap-10">
        <div className="text-center">
          <Body paths={femaleFrontPaths} viewBox="0 0 650 1450" selected={selected} onToggle={toggle} readonly={readonly} />
          <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Front</div>
        </div>
        <div className="text-center">
          <Body paths={femaleBackPaths} viewBox="823 0 650 1450" selected={selected} onToggle={toggle} readonly={readonly} />
          <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Back</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {[...selected].sort().map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2.5 py-1 text-[11.5px] font-bold text-brand">
            {muscleLabel(s)}
            {!readonly && (
              <button type="button" onClick={() => toggle(s)} className="text-brand/60 hover:text-brand" aria-label={`Remove ${s}`}>×</button>
            )}
          </span>
        ))}
        {selected.size === 0 && <span className="text-[12px] text-muted">{readonly ? "" : "Tap a muscle group to mark what this class works."}</span>}
      </div>
    </div>
  );
}
