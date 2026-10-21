import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS, toolBySlug, type ToolSlug } from "@/lib/toolkit";
import { ToolView } from "@/components/toolkit/toolkit-views";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/toolkit/[tool]">): Promise<Metadata> {
  const t = toolBySlug((await params).tool);
  return { title: t?.title ?? "Toolkit", description: t?.description };
}

export default async function PublicToolPage({ params }: PageProps<"/toolkit/[tool]">) {
  const { tool } = await params;
  if (!toolBySlug(tool)) notFound();
  return (
    <div className="px-5 py-12 sm:px-8 sm:py-16">
      <ToolView slug={tool as ToolSlug} base="/toolkit" context="public" />
    </div>
  );
}
