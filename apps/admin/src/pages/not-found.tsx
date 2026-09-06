import { Link } from "react-router";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
        <FileQuestion className="text-muted-foreground size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Retour au dashboard</Link>
      </Button>
    </div>
  );
}
