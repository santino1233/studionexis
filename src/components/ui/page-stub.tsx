import { Card } from "@/components/ui/card";
import { Hammer } from "lucide-react";

export function PageStub({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="grid size-[42px] place-items-center rounded-xl bg-brand-wash text-brand">
            <Hammer className="size-5" />
          </div>
          <div className="font-display text-lg font-extrabold text-ink">Being rebuilt on the new stack</div>
          <p className="max-w-sm text-[13px] text-muted">
            This area is next in line in the ground-up rebuild. The current live system keeps running until this reaches parity.
          </p>
        </div>
      </Card>
    </div>
  );
}
