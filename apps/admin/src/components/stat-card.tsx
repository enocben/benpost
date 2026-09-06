import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: number | undefined;
  hint?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("@container/card", className)}>
      <CardHeader className="relative">
        <CardDescription className="text-muted-foreground text-sm">
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-8 w-16" /> : (value ?? 0)}
        </CardTitle>
        {hint ? (
          <div className="text-muted-foreground text-xs">{hint}</div>
        ) : null}
        <div className="bg-primary/5 text-primary absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </div>
      </CardHeader>
    </Card>
  );
}
