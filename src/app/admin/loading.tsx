import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-3xl" />
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}
