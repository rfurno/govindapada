import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { LEXICON } from "../lib/lexicon.ts";
import { issueSummary, validatePiece } from "../lib/piece.ts";

const STALE_MS = 30 * 60 * 1000;
const GROK_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_ATTEMPTS = 2;

const MODE_LABEL = { story: "história", poem: "poema", haiku: "haiku" };
const KIND_LABEL = {
  misturada: "misturada, qualquer classe",
  F: "somente palavras femininas",
  N: "somente palavras neutras",
  M: "somente palavras masculinas",
  V: "somente verbos",
};
const SIZE_LABEL = { curta: "curta", media: "média", longa: "longa" };

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parseInterval(raw) {
  if (!raw) {
    return 30 * 1000;
  }
  const match = String(raw).trim().match(/^(\d+)\s*(ms|s|m|h)$/i);
  if (!match) {
    throw new Error(`Bad interval "${raw}". Use 10s, 30s, or 1m.`);
  }
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = unit === "ms" ? n : unit === "s" ? n * 1000 : unit === "m" ? n * 60 * 1000 : n * 60 * 60 * 1000;
  if (ms < 10 * 1000) {
    throw new Error("Interval must be at least 10s");
  }
  return ms;
}

function resolveGrokBin() {
  if (process.env.GROK_BIN) {
    return process.env.GROK_BIN;
  }
  const homeBin = join(homedir(), ".grok", "bin", "grok");
  return existsSync(homeBin) ? homeBin : "grok";
}

function grokEnv() {
  const env = { ...process.env };
  delete env.XAI_API_KEY;
  return env;
}

function runGrok(bin, cwd, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      bin,
      [
        "-p",
        prompt,
        "--cwd",
        cwd,
        "--yolo",
        "--no-auto-update",
        "--model",
        process.env.GROK_MODEL || "grok-4.7-build-fast",
        "--reasoning-effort",
        process.env.GROK_EFFORT || "low",
        "--disable-web-search",
        "--no-subagents",
      ],
      {
        cwd,
        env: grokEnv(),
        stdio: "inherit",
      },
    );
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`grok timed out after ${GROK_TIMEOUT_MS / 60000}m`));
    }, GROK_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error && error.code === "ENOENT" ? new Error("grok not found. Install the CLI or set GROK_BIN.") : error);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(signal ? `grok killed (${signal})` : `grok exited ${code}`));
    });
  });
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Supabase env vars are not set");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function wordsFor(ids) {
  const wanted = new Set(ids);
  return LEXICON.filter((word) => wanted.has(word.id));
}

function writeBrief(dir, row, words) {
  mkdirSync(dir, { recursive: true });
  const lines = [
    `# Kathā ${row.id}`,
    "",
    `Modo: ${MODE_LABEL[row.mode] ?? row.mode}`,
    `Tipo: ${KIND_LABEL[row.kind] ?? row.kind}`,
    row.mode === "haiku" ? "Tamanho: haiku de 3 linhas" : `Tamanho: ${SIZE_LABEL[row.size] ?? row.size}`,
    "",
    "Palavras (use cada uma uma vez, nesta forma «id|superfície»):",
    "",
    ...words.map((word) => `- ${word.id} | ${word.devanagari} | ${word.tag} | ${word.gloss}`),
    "",
  ];
  const dest = join(dir, `${row.id}.md`);
  writeFileSync(dest, lines.join("\n"));
  return dest;
}

async function releaseStale(db) {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { error } = await db
    .from("requests")
    .update({ status: "pending", claimed_at: null })
    .eq("status", "running")
    .lt("claimed_at", cutoff);
  if (error) {
    throw new Error(error.message);
  }
}

async function claim(db) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: rows, error } = await db
      .from("requests")
      .select("id, cache_key, mode, kind, size, word_ids, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) {
      throw new Error(error.message);
    }
    const row = rows?.[0];
    if (!row) {
      return null;
    }
    const { data: claimed, error: claimError } = await db
      .from("requests")
      .update({
        status: "running",
        claimed_at: new Date().toISOString(),
        attempts: row.attempts + 1,
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id, cache_key, mode, kind, size, word_ids, attempts")
      .maybeSingle();
    if (claimError) {
      throw new Error(claimError.message);
    }
    if (claimed) {
      return claimed;
    }
  }
  return null;
}

async function fail(db, row, message) {
  const done = row.attempts >= MAX_ATTEMPTS;
  const { error } = await db
    .from("requests")
    .update({
      status: done ? "error" : "pending",
      error: message,
      claimed_at: null,
      finished_at: done ? new Date().toISOString() : null,
    })
    .eq("id", row.id);
  if (error) {
    throw new Error(error.message);
  }
  console.error(`[katha] ${row.id} ${done ? "error" : "retry"}: ${message}`);
}

async function succeed(db, row, body) {
  const { data: piece, error: pieceError } = await db
    .from("pieces")
    .insert({
      cache_key: row.cache_key,
      mode: row.mode,
      kind: row.kind,
      size: row.size,
      word_ids: row.word_ids,
      body,
    })
    .select("id")
    .single();
  if (pieceError || !piece) {
    throw new Error(pieceError?.message ?? "Could not store the piece");
  }
  const { error } = await db
    .from("requests")
    .update({
      status: "done",
      piece_id: piece.id,
      error: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) {
    throw new Error(error.message);
  }
  console.log(`[katha] stored ${piece.id} for ${row.id}`);
}

async function tick(db, cwd) {
  await releaseStale(db);
  const row = await claim(db);
  if (!row) {
    console.log("[katha] no pending requests");
    return;
  }
  const words = wordsFor(row.word_ids);
  if (words.length !== row.word_ids.length) {
    await fail(db, row, "A request names a word that is not in the lexicon.");
    return;
  }
  const requestsDir = join(cwd, ".data", "katha", "requests");
  const outDir = join(cwd, ".data", "katha", "out");
  mkdirSync(outDir, { recursive: true });
  const brief = writeBrief(requestsDir, row, words);
  const outFile = join(outDir, `${row.id}.md`);
  rmSync(outFile, { force: true });
  console.log(`[katha] brief ${brief}`);
  try {
    await runGrok(
      resolveGrokBin(),
      cwd,
      `Run /katha for request ${row.id}. Read ${brief}. Write only ${outFile}. Follow the katha skill exactly. Do not set or use XAI_API_KEY. Do not write to Supabase.`,
    );
  } catch (error) {
    await fail(db, row, error instanceof Error ? error.message : String(error));
    return;
  }
  if (!existsSync(outFile)) {
    await fail(db, row, "Grok did not write the piece file.");
    return;
  }
  const body = readFileSync(outFile, "utf8").trim();
  const issues = validatePiece(body, words, row.mode);
  if (issues.length > 0) {
    await fail(db, row, issueSummary(issues));
    return;
  }
  await succeed(db, row, body);
}

function loadEnvFile(file) {
  if (!existsSync(file)) {
    return;
  }
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));

const once = process.argv.includes("--once");
const interval = parseInterval(argValue("--interval") ?? process.env.KATHA_LOOP_INTERVAL);
const cwd = process.cwd();
const db = supabase();

console.log(`[katha] pull → grok → store${once ? " once" : ` every ${interval / 1000}s`}`);
await tick(db, cwd);
if (!once) {
  setInterval(() => {
    tick(db, cwd).catch((error) => {
      console.error(`[katha] ${error instanceof Error ? error.message : error}`);
    });
  }, interval);
}
