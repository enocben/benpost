import index from "./index.html";

// Compilation Tailwind : le dev server de Bun ne transforme pas les <link>
// CSS, on compile donc global.css avec Bun.build et on sert le résultat.
async function compileStyles(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [new URL("./global.css", import.meta.url).pathname],
    target: "browser",
    tailwind: true,
  });
  if (!result.success) {
    throw new Error("Échec de la compilation CSS : " + result.logs.join("\n"));
  }
  return result.outputs[0]!.text();
}

const isDev = process.env.NODE_ENV !== "production";
let stylesCache: string | null = null;

async function getStyles(): Promise<string> {
  // En dev on recompile à chaque requête pour suivre les changements de classes
  if (!isDev && stylesCache !== null) return stylesCache;
  const css = await compileStyles();
  if (!isDev) stylesCache = css;
  return css;
}

const server = Bun.serve({
  port: 3001,
  routes: {
    "/styles.css": async () =>
      new Response(await getStyles(), {
        headers: { "content-type": "text/css; charset=utf-8" },
      }),
    "/": index,
    // Toutes les routes client retombent sur la SPA (react-router)
    "/*": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🧭 Admin Benpost : http://localhost:${server.port}`);
