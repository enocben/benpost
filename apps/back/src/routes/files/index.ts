import { Elysia } from "elysia";
import { s3 } from "../../utils/s3";

const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export const filesRoutes = new Elysia({ prefix: "/files" }).get(
  "/*",
  async ({ params: { "*": path } }) => {
    // Seul le dossier cover/ est exposé publiquement
    if (!path.startsWith("cover/") || path.includes("..")) {
      return new Response("Not found", { status: 404 });
    }

    const file = s3.file(path);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }

    // Bun refuse new Response(s3File, options) : on lit le fichier en mémoire
    // (les couvertures sont limitées à 10 Mo côté upload)
    const body = await file.arrayBuffer();
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return new Response(body, {
      headers: {
        "content-type": mimeTypes[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }
);
