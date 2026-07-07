import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const publicImageDir = path.join(rootDir, "public", "images");
const publicMemeDir = path.join(rootDir, "public", "memes");
const storageDir = resolveStorageDir(process.env.GUGO_STORAGE_DIR ?? "storage");
const pendingDir = path.join(storageDir, "pending");
const approvedDir = path.join(storageDir, "approved");
const pendingMetaDir = path.join(storageDir, "pending-meta");
const approvedMetaDir = path.join(storageDir, "approved-meta");
const port = Number(process.env.PORT ?? 8788);
const uploadPassword = process.env.GUGO_UPLOAD_PASSWORD;
const adminPassword = process.env.GUGO_ADMIN_PASSWORD;
const sessionSecret = process.env.GUGO_SESSION_SECRET;
const referralBaseUrl = "https://gugo.run/register.html";
const allowedExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const allowedMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

if (!uploadPassword || !adminPassword || !sessionSecret) {
  console.error("Missing GUGO_UPLOAD_PASSWORD, GUGO_ADMIN_PASSWORD, or GUGO_SESSION_SECRET.");
  process.exit(1);
}

await fs.mkdir(pendingDir, { recursive: true });
await fs.mkdir(approvedDir, { recursive: true });
await fs.mkdir(pendingMetaDir, { recursive: true });
await fs.mkdir(approvedMetaDir, { recursive: true });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 20
  }
});

app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));

function resolveStorageDir(configuredStorageDir) {
  if (path.isAbsolute(configuredStorageDir)) return configuredStorageDir;
  const parentDir = path.basename(path.dirname(rootDir));
  if (parentDir === "releases") {
    return path.resolve(rootDir, "..", "..", configuredStorageDir);
  }
  return path.resolve(rootDir, configuredStorageDir);
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function adminToken() {
  return crypto.createHmac("sha256", sessionSecret).update(adminPassword).digest("hex");
}

function isAdmin(req) {
  const token = req.cookies?.gugo_admin ?? "";
  return timingSafeEqual(token, adminToken());
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required." });
    return;
  }
  next();
}

function cleanOriginalName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 90);
}

function safeStorageName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExts.has(ext)) throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}-${cleanOriginalName(originalName)}`;
}

function assertImage(file) {
  if (!file) throw new Error("Choose an image first.");
  if (!allowedMimes.has(file.mimetype)) throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.has(ext)) throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
}

function normalizeTwitterHandle(raw) {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!cleaned) return null;
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) {
    throw new Error("Twitter handle should be 1-15 letters, numbers, or underscores.");
  }
  return cleaned;
}

function normalizeReferralCode(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  let code = value.replace(/^@/, "").trim();
  try {
    const parsed = new URL(value);
    code = parsed.searchParams.get("ref") ?? "";
  } catch {
    const refMatch = value.match(/[?&]ref=([^&#]+)/i);
    if (refMatch) code = decodeURIComponent(refMatch[1]);
  }

  code = code.trim().replace(/^@/, "").toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new Error("Referral code should be 3-32 letters, numbers, dashes, or underscores.");
  }
  return code;
}

async function readMeta(metaDir, filename) {
  try {
    const raw = await fs.readFile(path.join(metaDir, `${filename}.json`), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return {};
  }
}

async function writeMeta(metaDir, filename, meta) {
  await fs.writeFile(path.join(metaDir, `${filename}.json`), JSON.stringify(meta, null, 2));
}

async function deleteMeta(metaDir, filename) {
  await fs.rm(path.join(metaDir, `${filename}.json`), { force: true });
}

async function listImages(dir, urlPrefix, startIndex = 0, category = "gugo-images") {
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const imageFiles = files
    .filter((file) => allowedExts.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(imageFiles.map(async (filename, index) => {
    const metaDir = urlPrefix.includes("pending-image") ? pendingMetaDir : urlPrefix.includes("approved") ? approvedMetaDir : null;
    const meta = metaDir ? await readMeta(metaDir, filename) : {};
    const twitterHandle = meta.twitterHandle ?? null;
    const referralCode = meta.referralCode ?? null;
    const imageCategory = typeof category === "function" ? category(filename) : category;
    return {
      id: filename.replace(/\.[^.]+$/, ""),
      title: `GUGO ${String(startIndex + index + 1).padStart(2, "0")}`,
      filename,
      src: `${urlPrefix}/${encodeURIComponent(filename)}`,
      category: imageCategory,
      source: urlPrefix.includes("approved") ? "approved" : "static",
      twitterHandle,
      twitterUrl: twitterHandle ? `https://x.com/${twitterHandle}` : null,
      referralCode,
      referralUrl: referralCode ? `${referralBaseUrl}?ref=${encodeURIComponent(referralCode)}` : null,
      submittedAt: meta.submittedAt ?? null,
      approvedAt: meta.approvedAt ?? null
    };
  }));
}

async function pendingImages() {
  return (await listImages(pendingDir, "/api/admin/pending-image")).map((image) => ({
    ...image,
    title: image.filename
  }));
}

app.get("/api/gallery", async (_req, res, next) => {
  try {
    const staticImages = await listImages(publicImageDir, "/images", 0, "gugo-images");
    const officialMemes = await listImages(publicMemeDir, "/memes", staticImages.length, "gugo-memes");
    const approvedImages = await listImages(
      approvedDir,
      "/uploads/approved",
      staticImages.length + officialMemes.length,
      (filename) => path.extname(filename).toLowerCase() === ".gif" ? "holder-submitted-gifs" : "holder-submitted"
    );
    res.json({ images: [...staticImages, ...officialMemes, ...approvedImages] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/upload", upload.array("image", 20), async (req, res) => {
  try {
    if (!timingSafeEqual(String(req.body?.password ?? ""), uploadPassword)) {
      res.status(401).json({ error: "Wrong upload password." });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) throw new Error("Choose at least one image first.");
    files.forEach(assertImage);

    const twitterHandle = normalizeTwitterHandle(req.body?.twitterHandle);
    const referralCode = normalizeReferralCode(req.body?.referralCode);
    const submittedAt = new Date().toISOString();
    const filenames = [];

    for (const file of files) {
      const filename = safeStorageName(file.originalname);
      await fs.writeFile(path.join(pendingDir, filename), file.buffer, { flag: "wx" });
      await writeMeta(pendingMetaDir, filename, {
        twitterHandle,
        referralCode,
        originalName: file.originalname,
        submittedAt
      });
      filenames.push(filename);
    }

    res.json({ ok: true, filenames });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed." });
  }
});

app.post("/api/admin/login", (req, res) => {
  if (!timingSafeEqual(String(req.body?.password ?? ""), adminPassword)) {
    res.status(401).json({ error: "Wrong admin password." });
    return;
  }

  res.cookie("gugo_admin", adminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    maxAge: 1000 * 60 * 60 * 12
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie("gugo_admin");
  res.json({ ok: true });
});

app.get("/api/admin/moderation", requireAdmin, async (_req, res, next) => {
  try {
    const pending = await pendingImages();
    const approved = await listImages(approvedDir, "/uploads/approved");
    res.json({ pending, approved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/pending-image/:filename", requireAdmin, async (req, res) => {
  const filename = path.basename(req.params.filename);
  res.sendFile(path.join(pendingDir, filename));
});

app.post("/api/admin/approve", requireAdmin, async (req, res) => {
  try {
    const filename = path.basename(String(req.body?.filename ?? ""));
    if (!filename) throw new Error("Missing filename.");
    await fs.rename(path.join(pendingDir, filename), path.join(approvedDir, filename));
    const meta = await readMeta(pendingMetaDir, filename);
    await writeMeta(approvedMetaDir, filename, {
      ...meta,
      approvedAt: new Date().toISOString()
    });
    await deleteMeta(pendingMetaDir, filename);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Approve failed." });
  }
});

app.post("/api/admin/delete-pending", requireAdmin, async (req, res) => {
  try {
    const filename = path.basename(String(req.body?.filename ?? ""));
    if (!filename) throw new Error("Missing filename.");
    await fs.rm(path.join(pendingDir, filename), { force: true });
    await deleteMeta(pendingMetaDir, filename);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Delete failed." });
  }
});

app.post("/api/admin/delete-approved", requireAdmin, async (req, res) => {
  try {
    const filename = path.basename(String(req.body?.filename ?? ""));
    if (!filename) throw new Error("Missing filename.");
    await fs.rm(path.join(approvedDir, filename), { force: true });
    await deleteMeta(approvedMetaDir, filename);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Delete failed." });
  }
});

app.use("/uploads/approved", express.static(approvedDir, {
  immutable: false,
  maxAge: "5m"
}));
app.use(express.static(distDir, {
  immutable: true,
  maxAge: "1h"
}));
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something broke." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`GUGO app listening on http://127.0.0.1:${port}`);
});
