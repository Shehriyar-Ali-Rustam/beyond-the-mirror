import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/* -----------------------------------------------------------------------------
   "Breathe with the rain": six slow breaths (about a minute), with the rain
   swelling and settling as you breathe.
----------------------------------------------------------------------------- */

const IN = 4;
const OUT = 6;
const ROUNDS = 6;

export function BreatheOverlay({ onClose, onBreath, still }: { onClose: () => void; onBreath: (level: number) => void; still: boolean }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    if (phase === "done") {
      onBreath(1);
      return;
    }
    onBreath(phase === "in" ? 1.35 : 0.75);
    const t = setTimeout(
      () => {
        if (phase === "in") setPhase("out");
        else if (round + 1 >= ROUNDS) setPhase("done");
        else {
          setRound((r) => r + 1);
          setPhase("in");
        }
      },
      (phase === "in" ? IN : OUT) * 1000,
    );
    return () => clearTimeout(t);
  }, [phase, round, onBreath]);

  useEffect(() => () => onBreath(1), [onBreath]);

  const big = phase === "in";
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#120e1c]/45 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Breathe with the rain"
    >
      <button type="button" onClick={onClose} aria-label="Stop breathing exercise" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25">
        <X className="size-4" />
      </button>
      {phase === "done" ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-6 max-w-sm rounded-3xl bg-surface/95 p-6 text-center shadow-lg">
          <p className="font-display text-2xl text-ink">Lovely.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Six slow breaths, done. Notice your shoulders, your jaw, your hands. A little softer now?</p>
          <Button className="mt-5 rounded-full" onClick={onClose}>
            Back to the room
          </Button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center text-center text-white">
          <div className="relative flex size-44 items-center justify-center sm:size-56">
            <motion.span
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,236,206,0.55),rgba(186,200,255,0.18)_60%,transparent_72%)]"
              animate={{ scale: still ? 1 : big ? 1.15 : 0.62 }}
              transition={{ duration: big ? IN : OUT, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute size-16 rounded-full bg-[radial-gradient(circle,rgba(255,250,240,0.85),rgba(255,236,206,0.45)_70%,rgba(255,236,206,0.15))] shadow-[0_0_50px_rgba(255,236,206,0.7)] sm:size-20"
              animate={{ scale: still ? 1 : big ? 1.6 : 0.9 }}
              transition={{ duration: big ? IN : OUT, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-3 font-display text-2xl drop-shadow sm:text-3xl" aria-live="polite">
            {big ? "Breathe in..." : "...and slowly out"}
          </p>
          <p className="mt-1 text-sm text-white/80">
            Breath {round + 1} of {ROUNDS}
          </p>
        </div>
      )}
    </motion.div>
  );
}
