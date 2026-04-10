import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    target: "node20",
    outfile: path.resolve(distDir, "index.js"),
    banner: {
      js: `import { createRequire } from 'module'; import { fileURLToPath as __fup } from 'url'; import { dirname as __dn } from 'path'; const require = createRequire(import.meta.url); const __filename = __fup(import.meta.url); const __dirname = __dn(__filename);`,
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    packages: "external",
    minify: true,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
