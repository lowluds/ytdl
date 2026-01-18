const express = require("express");
const cors = require("cors");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "4kb" }));

const binDir = path.join(__dirname, "bin");
const bundledYtdlp = path.join(
  binDir,
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
);
const ytdlpCommand =
  process.env.YTDLP_PATH ||
  (fs.existsSync(bundledYtdlp) ? bundledYtdlp : "yt-dlp");

const MAX_LOG_LENGTH = 6000;

const trimLog = (log) => {
  if (!log) {
    return "";
  }
  return log.length <= MAX_LOG_LENGTH ? log : log.slice(-MAX_LOG_LENGTH);
};

const sanitizeFilename = (name) => {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, 120) : "video";
};

const resolveFilename = (url) =>
  new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--print",
      "filename",
      "-o",
      "%(title)s.%(ext)s",
      url,
    ];
    const child = spawn(ytdlpCommand, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr = trimLog(`${stderr}${chunk.toString()}`);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(sanitizeFilename(stdout.trim()));
        return;
      }
      const error = new Error(stderr || "Unable to resolve filename.");
      error.code = code;
      reject(error);
    });
  });

const runVersion = () =>
  new Promise((resolve) => {
    const child = spawn(ytdlpCommand, ["--version"], { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr = trimLog(`${stderr}${chunk.toString()}`);
    });

    child.on("error", (error) => {
      resolve({ ok: false, error, stdout, stderr });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/version", async (req, res) => {
  const result = await runVersion();

  if (!result.ok) {
    if (result.error?.code === "ENOENT") {
      res.status(500).json({
        error:
          "yt-dlp was not found. Set YTDLP_PATH or use the bundled binary.",
      });
      return;
    }

    res.status(500).json({
      error:
        result.stderr?.trim() ||
        result.error?.message ||
        "Unable to run yt-dlp.",
    });
    return;
  }

  res.json({
    ok: true,
    version: result.stdout.trim(),
    command: ytdlpCommand,
  });
});

app.get("/download", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!url) {
    res.status(400).json({ error: "Missing YouTube URL." });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL format." });
    return;
  }

  let filename = "video.mp4";
  try {
    const resolvedName = await resolveFilename(url);
    filename = resolvedName || filename;
  } catch (error) {
    console.warn(
      "Unable to resolve filename, continuing with fallback.",
      error?.message || error
    );
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");

  const args = ["--no-playlist", "-f", "best", "-o", "-", url];
  const child = spawn(ytdlpCommand, args, { windowsHide: true });
  let stderr = "";

  req.on("close", () => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  });

  child.stdout.pipe(res);

  child.stderr.on("data", (chunk) => {
    stderr = trimLog(`${stderr}${chunk.toString()}`);
  });

  child.on("error", (error) => {
    if (!res.headersSent) {
      res.status(500).json({
        error:
          error?.code === "ENOENT"
            ? "yt-dlp was not found. Set YTDLP_PATH."
            : error?.message || "Download failed.",
      });
    } else {
      res.end();
    }
  });

  child.on("close", (code) => {
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({
        error: stderr?.trim() || "Download failed.",
      });
      return;
    }

    if (!res.writableEnded) {
      res.end();
    }
  });
});

app.listen(PORT, () => {
  console.log(`Downloader service listening on port ${PORT}.`);
});
