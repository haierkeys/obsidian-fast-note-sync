import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";


/**
 * i18n Translation Script using OpenAI API
 * 批次原子同步模式：
 * 1. 字典 (.translate-dict.json) 记录 zh-CN 的 Key -> 内容 MD5。
 * 2. 只有当一个 Batch (40条) 在所有目标语言中都翻译成功后，才更新字典。
 * 3. 这保证了跨语言间的高度同步性。
 *
 * Usage:
 *   OPENAI_API_KEY=sk-xxx node scripts/translate-i18n.mjs
 */

// ──────────────────────────── Config ────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../src/i18n/locales");
const DICT_FILE = path.resolve(__dirname, "../src/i18n/locales/.translate-dict.json");
const SOURCE_LANG = "zh-CN";

const TARGET_LANGS = {
  en: "English",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  "zh-TW": "Traditional Chinese (繁體中文)",
};

const BATCH_SIZE = 70;

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
function hasFlag(name) {
  return args.includes(`--${name}`);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://www.dmxapi.cn/v1";
const MODEL = getArg("model") || "qwen3.5-27b";
const langFilter = getArg("lang");
const forceAll = hasFlag("force");

if (!OPENAI_API_KEY) {
  console.error("❌ 请设置环境变量 OPENAI_API_KEY");
  process.exit(1);
}

// ──────────────────────────── Core ────────────────────────────

/** 计算字符串的 MD5 */
function md5(str) {
  return crypto.createHash("md5").update(str, "utf-8").digest("hex");
}

/** 读取字典 (扁平结构: key -> md5) */
function loadDict() {
  if (fs.existsSync(DICT_FILE)) {
    try {
      const content = fs.readFileSync(DICT_FILE, "utf-8").trim();
      return content ? JSON.parse(content) : {};
    } catch (e) {
      console.warn(`⚠️  字典文件解析失败: ${e.message}，将重建`);
    }
  }
  return {};
}

/** 保存字典 */
function saveDict(dict) {
  try {
    fs.writeFileSync(DICT_FILE, JSON.stringify(dict, null, 2), "utf-8");
  } catch (e) {
    console.error(`❌ 字典保存失败: ${e.message}`);
  }
}

// ──────────────────────────── Helpers ────────────────────────────

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m${s % 60}s`;
}

function renderProgressBar(current, total, barWidth = 30) {
  if (total === 0) return "█".repeat(barWidth) + " 100% (0/0)";
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${bar} ${pct}% (${current}/${total})`;
}

function writeProgress(text) {
  if (process.stdout.clearLine) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
  process.stdout.write(text);
}

function parseLocaleFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error(`Cannot parse locale file: ${filePath}`);
  return new Function(`return ${match[1]}`)();
}

function writeLocaleFile(filePath, translations, sourceContent) {
  const lines = sourceContent.split(/\r?\n/);
  const outputLines = [];
  for (const line of lines) {
    const match = line.match(/^(\s*)"(.+?)":\s*"(.*)"(,?)(\s*)$/);
    if (match) {
      const [, indent, key, , comma] = match;
      if (key in translations) {
        const val = translations[key]
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n");
        outputLines.push(`${indent}"${key}": "${val}"${comma}`);
      } else {
        outputLines.push(line);
      }
    } else {
      outputLines.push(line);
    }
  }
  fs.writeFileSync(filePath, outputLines.join("\n"), "utf-8");
}

function loadExistingTranslations(langCode) {
  const filePath = path.join(LOCALES_DIR, `${langCode}.ts`);
  if (fs.existsSync(filePath)) {
    try {
      return parseLocaleFile(filePath);
    } catch {
      return {};
    }
  }
  return {};
}

async function callOpenAIStream(messages, { onToken } = {}) {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      stream: true,
      messages,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error: ${res.status} ${body}`);
  }

  let fullContent = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onToken?.(delta, fullContent);
        }
      } catch { }
    }
  }
  return fullContent;
}

async function callOpenAI(messages) {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages,
      thinking: { type: "disabled" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

function buildSystemPrompt(targetLangName) {
  return `You are a professional translator for software UI localization.
Translate the following JSON key-value pairs from Chinese (Simplified) to ${targetLangName}.

CRITICAL RULES:
1. Preserve ALL HTML tags exactly as-is (e.g. <a href="...">, <b>, <u>, <br/>, <div>, <ul>, <li>, etc.)
2. Preserve ALL template variables exactly as-is (e.g. {{count}}, {{title}}, {{size}}, {{uid}}, {{version}}, {{scheme}})
3. Preserve ALL escape sequences (e.g. \\n, \\", &nbsp;, &amp;)
4. Preserve ALL CSS class names in HTML attributes
5. Preserve ALL URLs and links unchanged
6. Do NOT translate brand names like "Fast Note Sync", "Obsidian", "WebDAV", "MinIO", "Cloudflare", "Ngrok", "GitHub", "Telegram", "Golang", "Websocket", "Sqlite", "React", "PostgreSQL", "MySQL", "SQLite", "S3", "OSS", "R2", "Git", "Cron", "GC", "PDF", "FNS", "CNB"
7. Keep technical terms like "Endpoint", "Access Key", "Token", "WebSocket", "Host", "Port", "UID" etc. in their original form
8. For "zh-TW" target, convert Simplified Chinese to Traditional Chinese accurately
9. Return ONLY a valid JSON object with the same keys, no markdown fences, no explanation

Output a valid JSON object ONLY.`;
}

function extractJSON(content) {
  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  return JSON.parse(jsonStr);
}

async function translateBatch(entries, targetLangName) {
  if (entries.length === 0) return {};
  const jsonPayload = JSON.stringify(Object.fromEntries(entries), null, 2);
  const systemPrompt = buildSystemPrompt(targetLangName);
  const batchStart = Date.now();
  let charCount = 0;

  const content = await callOpenAIStream(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: jsonPayload },
    ],
    {
      onToken: (delta, full) => {
        charCount += delta.length;
        const elapsed = formatDuration(Date.now() - batchStart);
        const keysReceived = (full.match(/"[^"]+"\s*:/g) || []).length;
        writeProgress(`     ⏳ 流式接收中... ${keysReceived}/${entries.length} keys | ${charCount} chars | ${elapsed}`);
      },
    }
  );

  process.stdout.write("\n");
  try {
    return extractJSON(content);
  } catch (e) {
    console.error(`     ⚠️  JSON 解析失败，正在重试...`);
    const retryContent = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: jsonPayload },
      { role: "user", content: "Your previous response was not valid JSON. Please return ONLY a valid JSON object." },
    ]);
    return extractJSON(retryContent);
  }
}

// ──────────────────────────── Main ────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  i18n Translation Script (OpenAI) - 批次原子同步模式");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Model:      ${MODEL}`);
  console.log(`  API Base:   ${OPENAI_BASE_URL}`);

  const sourceFile = path.join(LOCALES_DIR, `${SOURCE_LANG}.ts`);
  const sourceContent = fs.readFileSync(sourceFile, "utf-8");
  const sourceTranslations = parseLocaleFile(sourceFile);
  const sourceKeys = Object.keys(sourceTranslations);
  console.log(`📖 Source: ${SOURCE_LANG} (${sourceKeys.length} keys)`);

  let dict = forceAll ? {} : loadDict();
  console.log(`📚 Dict: 已缓存 ${Object.keys(dict).length} 个 Key 的同步指纹`);

  let targetLangs = Object.entries(TARGET_LANGS);
  if (langFilter) {
    const filter = langFilter.split(",").map((s) => s.trim());
    targetLangs = targetLangs.filter(([code]) => filter.includes(code));
  }

  const allMergedTranslations = {};
  for (const [langCode] of targetLangs) {
    allMergedTranslations[langCode] = loadExistingTranslations(langCode);
  }
  console.log(`🌐 目标语言: ${targetLangs.map(l => l[1]).join(", ")}\n`);

  // 检测变更并分批
  const changedSourceEntries = [];
  for (const [key, val] of Object.entries(sourceTranslations)) {
    if (forceAll || dict[key] !== md5(val)) {
      changedSourceEntries.push([key, val]);
    }
  }

  if (changedSourceEntries.length === 0) {
    console.log("✨ 所有内容均已同步。");
    process.exit(0);
  }

  console.log(`📊 检测到 ${changedSourceEntries.length} 条 Key 发生变更 (zh-CN)`);

  const batches = [];
  for (let i = 0; i < changedSourceEntries.length; i += BATCH_SIZE) {
    batches.push(changedSourceEntries.slice(i, i + BATCH_SIZE));
  }

  const globalStart = Date.now();
  let totalApiCalls = 0;
  let totalKeysTranslated = 0;

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    const progress = renderProgressBar(bIdx, batches.length, 20);
    console.log(`\n📦 [Batch ${bIdx + 1}/${batches.length}] ${progress}`);
    console.log("─".repeat(50));

    const batchStart = Date.now();
    let batchSuccessCount = 0;

    for (let lIdx = 0; lIdx < targetLangs.length; lIdx++) {
      const [langCode, langName] = targetLangs[lIdx];
      console.log(`  🌐 ${langName} (${lIdx + 1}/${targetLangs.length})`);
      try {
        const result = await translateBatch(batch, langName);
        totalApiCalls++;
        for (const [key] of batch) {
          if (result[key]) allMergedTranslations[langCode][key] = result[key];
          else if (!(key in allMergedTranslations[langCode])) allMergedTranslations[langCode][key] = sourceTranslations[key];
        }
        writeLocaleFile(path.join(LOCALES_DIR, `${langCode}.ts`), allMergedTranslations[langCode], sourceContent);
        batchSuccessCount++;
      } catch (err) {
        console.error(`     ❌ ${langName} 失败: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    if (batchSuccessCount === targetLangs.length) {
      for (const [key, val] of batch) dict[key] = md5(val);
      saveDict(dict);
      totalKeysTranslated += batch.length;
      console.log(`  ✅ 批次完成 | 💾 字典已更新 | ⏱️ ${formatDuration(Date.now() - batchStart)}`);
    } else {
      console.warn(`  ⚠️  部分语言失败 (${batchSuccessCount}/${targetLangs.length})，字典未更新。`);
    }
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log(`  ✅ 任务结束 | ⏱️ ${formatDuration(Date.now() - globalStart)} | 🔄 API: ${totalApiCalls} | 📝 Key: ${totalKeysTranslated}`);
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
