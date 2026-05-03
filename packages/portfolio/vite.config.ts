import { defineConfig, type IndexHtmlTransformContext } from "vite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import * as v from "valibot";
import tailwindcss from "@tailwindcss/vite";
import {
  renderExperience,
  experienceIntro,
  renderCommunity,
  renderWork,
} from "./build-renderers.js";
import {
  Profile as ProfileSchema,
  WorkPayload as WorkSchema,
  ExperiencePayload as ExperienceSchema,
  CommunityPayload as CommunitySchema,
  formatIssues,
  type Profile,
} from "./build-schemas.js";

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_DIR = resolve(__dirname, "node_modules/.vite/agent-cache");

interface CachedAsset {
  body: string;
  etag?: string;
  fetchedAt: number;
}

function readCache(filename: string): CachedAsset | null {
  const path = resolve(CACHE_DIR, `${filename}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CachedAsset;
  } catch {
    return null;
  }
}

function writeCache(filename: string, asset: CachedAsset): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(resolve(CACHE_DIR, `${filename}.json`), JSON.stringify(asset));
}

async function loadDataFile<S extends v.GenericSchema>(
  filename: string,
  buildAgentEndpoint: string,
  schema: S,
): Promise<v.InferOutput<S>> {
  const url = `${buildAgentEndpoint.replace(/\/+$/, "")}/data/${filename}`;
  const cache = readCache(filename);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  let body: string;
  try {
    const headers: Record<string, string> = {};
    if (cache?.etag) headers["If-None-Match"] = cache.etag;
    const res = await fetch(url, { headers, signal: ctrl.signal });

    if (res.status === 304 && cache) {
      // eslint-disable-next-line no-console
      console.log(`[portfolio build] ${filename} 304 (cache hit)`);
      body = cache.body;
    } else if (res.ok) {
      body = await res.text();
      const etag = res.headers.get("etag") ?? undefined;
      writeCache(filename, { body, etag, fetchedAt: Date.now() });
      // eslint-disable-next-line no-console
      console.log(`[portfolio build] ${filename} ${res.status}${etag ? ` etag=${etag}` : ""}`);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (cache) {
      // eslint-disable-next-line no-console
      console.warn(`[portfolio build] ${filename} fetch failed (${err instanceof Error ? err.message : err}); using cached copy`);
      body = cache.body;
    } else {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[portfolio build] could not fetch ${filename} from ${buildAgentEndpoint}: ${reason}. ` +
          `Set PORTFOLIO_AGENT_ENDPOINT to a reachable agent.`,
      );
    }
  } finally {
    clearTimeout(timer);
  }

  const raw = JSON.parse(body) as unknown;
  const parsed = v.safeParse(schema, raw);
  if (!parsed.success) throw new Error(formatIssues(filename, parsed.issues));
  return parsed.output;
}

function buildContext(
  profile: Profile,
  agentEndpoint: string,
  html: { work: string; experience: string; experienceIntro: string; community: string },
): Record<string, unknown> {
  const locParts = profile.location.split(",").map((s: string) => s.trim());
  const knowsAbout = Array.from(new Set(Object.values(profile.stack).flat()));
  const nameParts = profile.name.split(" ");
  const firstName = profile.preferredName ?? nameParts[0] ?? profile.name;
  return {
    profile: {
      ...profile,
      firstName,
      lastName: nameParts.slice(1).join(" "),
      username: profile.contact.github.replace(/\/+$/, "").split("/").pop() ?? "",
      locationCity: locParts[0] ?? profile.location,
      locationRegion: locParts[1] ?? "",
      locationCountry: locParts[locParts.length - 1] ?? "",
      knowsAboutJson: JSON.stringify(knowsAbout),
      keywords: knowsAbout.join(", "),
      focusAreas: profile.focus?.areas?.join(" · ") ?? "",
    },
    agentEndpoint,
    html,
  };
}

function substitute(input: string, ctx: Record<string, unknown>): string {
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path.split(".").reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]),
      ctx,
    );
    return value == null ? "" : String(value);
  });
}

export default defineConfig(async ({ command }) => {
  if (command === "build" && !process.env.PORTFOLIO_AGENT_ENDPOINT) {
    throw new Error(
      "[portfolio build] PORTFOLIO_AGENT_ENDPOINT is required for `vite build`. " +
        "Set it (e.g. https://agent-ten-nu.vercel.app) or run `vite` (dev) instead. " +
        "Building without it ships a dist that points at localhost:8787.",
    );
  }
  const agentEndpoint =
    process.env.PORTFOLIO_AGENT_ENDPOINT ??
    (command === "serve" ? "http://localhost:8787" : "https://agent-ten-nu.vercel.app");

  const [profile, workData, experienceData, communityData] = await Promise.all([
    loadDataFile("profile.json", agentEndpoint, ProfileSchema),
    loadDataFile("work.json", agentEndpoint, WorkSchema),
    loadDataFile("experience.json", agentEndpoint, ExperienceSchema),
    loadDataFile("community.json", agentEndpoint, CommunitySchema),
  ]);

  const ctx: Record<string, unknown> = buildContext(profile, agentEndpoint, {
    work: renderWork(workData),
    experience: renderExperience(experienceData),
    experienceIntro: experienceIntro(experienceData),
    community: renderCommunity(communityData),
  });

  async function refreshContext(): Promise<void> {
    const [p, w, e, c] = await Promise.all([
      loadDataFile("profile.json", agentEndpoint, ProfileSchema),
      loadDataFile("work.json", agentEndpoint, WorkSchema),
      loadDataFile("experience.json", agentEndpoint, ExperienceSchema),
      loadDataFile("community.json", agentEndpoint, CommunitySchema),
    ]);
    const next = buildContext(p, agentEndpoint, {
      work: renderWork(w),
      experience: renderExperience(e),
      experienceIntro: experienceIntro(e),
      community: renderCommunity(c),
    });
    for (const key of Object.keys(ctx)) delete ctx[key];
    Object.assign(ctx, next);
  }

  return {
    root: "src",
    base: "/",
    plugins: [
      tailwindcss(),
      {
        name: "agent-data-hmr",
        apply: "serve",
        configureServer(server) {
          const filenames = [
            "profile.json",
            "work.json",
            "experience.json",
            "community.json",
          ];
          const lastEtags: Record<string, string | null> = {};
          let timer: ReturnType<typeof setInterval> | null = null;

          async function tick() {
            let changed = false;
            for (const f of filenames) {
              try {
                const headers: Record<string, string> = {};
                if (lastEtags[f]) headers["If-None-Match"] = lastEtags[f]!;
                const res = await fetch(`${agentEndpoint}/data/${f}`, { headers });
                const etag = res.headers.get("etag");
                if (res.status === 200) {
                  if (lastEtags[f] !== undefined && etag !== lastEtags[f]) {
                    changed = true;
                  }
                  lastEtags[f] = etag;
                }
              } catch {
                /* ignore */
              }
            }
            if (changed) {
              try {
                await refreshContext();
                server.ws.send({ type: "full-reload", path: "*" });
                // eslint-disable-next-line no-console
                console.log("[agent-data-hmr] data changed → reloaded");
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error("[agent-data-hmr]", err);
              }
            }
          }

          timer = setInterval(tick, 2000);
          server.httpServer?.once("close", () => {
            if (timer) clearInterval(timer);
          });
        },
      },
      {
        name: "inject-template-tokens",
        transformIndexHtml: {
          order: "pre",
          handler: (html: string, _ctx: IndexHtmlTransformContext) => {
            const out = substitute(html, ctx);
            const leak = out.match(/\{\{\s*[\w.]+\s*\}\}/);
            if (leak) {
              throw new Error(
                `[portfolio build] unresolved template ${leak[0]} in index.html. ` +
                  `Add the path to buildContext() or fix the typo.`,
              );
            }
            return out;
          },
        },
      },
      {
        name: "csp-tighten",
        apply: "build",
        transformIndexHtml: {
          order: "post",
          handler: (html: string) => {
            const inlineScript =
              /<script(?![^>]*\bsrc=)(?![^>]*\btype=["']?application\/ld\+json)([^>]*)>([\s\S]*?)<\/script>/gi;
            const hashes: string[] = [];
            let m: RegExpExecArray | null;
            while ((m = inlineScript.exec(html))) {
              const sha = createHash("sha256").update(m[2], "utf8").digest("base64");
              hashes.push(`'sha256-${sha}'`);
            }
            let out = html;
            if (hashes.length > 0) {
              out = out.replace(
                /script-src 'self' 'unsafe-inline'/,
                `script-src 'self' ${hashes.join(" ")}`,
              );
            }
            return out;
          },
        },
      },
      {
        name: "inject-tokens-into-assets",
        writeBundle() {
          const outDir = resolve(__dirname, "dist");
          const targets = [".well-known/agent-card.json"];
          for (const rel of targets) {
            const full = resolve(outDir, rel);
            if (!existsSync(full)) continue;
            const original = readFileSync(full, "utf8");
            const replaced = substitute(original, ctx);
            if (replaced !== original) writeFileSync(full, replaced, "utf8");
          }
        },
      },
    ],
    server: {
      port: 5173,
      open: true,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      assetsDir: "assets",
      sourcemap: false,
      target: "es2022",
    },
  };
});
