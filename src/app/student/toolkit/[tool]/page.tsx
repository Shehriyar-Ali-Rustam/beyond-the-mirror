import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS, toolBySlug, type ToolSlug } from "@/lib/toolkit";
import { ToolView } from "@/components/toolkit/toolkit-views";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/student/toolkit/[tool]">): Promise<Metadata> {
  const t = toolBySlug((await params).tool);
  return { title: t?.title ?? "Toolkit" };
}

export default async function StudentToolPage({ params }: PageProps<"/student/toolkit/[tool]">) {
  const { tool } = await params;
  if (!toolBySlug(tool)) notFound();
  return <ToolView slug={tool as ToolSlug} base="/student/toolkit" context="student" />;
}
