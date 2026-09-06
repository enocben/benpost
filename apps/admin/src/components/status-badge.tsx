import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/hooks/api";
import type { PostStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<PostStatus, string> = {
  published: "bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-500/15 dark:text-emerald-400",
  draft: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-500/15 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
