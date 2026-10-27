"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Doodle } from "@/lib/doodles";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/toolkit/shared";
import { DoodlePractice } from "./doodle-practice";
import { DrawPad } from "./draw-pad";
import { DoodleWall } from "./doodle-wall";

type Tab = "guess" | "wall" | "draw";

export function DoodleGame({ role, wall }: { role: Role | null; wall: Doodle[] | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(role && role !== "student" && wall?.some((d) => d.report_count > 0) ? "wall" : "guess");
  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "guess", label: "Guess our doodles" },
          { value: "wall", label: "Doodle Wall" },
          { value: "draw", label: "Draw your own" },
        ]}
      />
      {tab === "guess" && <DoodlePractice />}
      {tab === "draw" && (
        <DrawPad
          signedIn={!!role}
          onPosted={() => {
            router.refresh();
            setTab("wall");
          }}
        />
      )}
      {tab === "wall" &&
        (role && wall ? (
          <DoodleWall key={wall.map((d) => d.id).join()} initial={wall} role={role} onDraw={() => setTab("draw")} />
        ) : (
          <div className="rounded-3xl bg-gradient-to-br from-lilac-soft to-rose-soft p-8 text-center">
            <p className="text-5xl">🖼️</p>
            <p className="mt-3 font-display text-2xl text-ink">The Doodle Wall is for students at your school</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">Log in to guess what other students drew and post your own doodles.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/register">Create an account</Link>
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
