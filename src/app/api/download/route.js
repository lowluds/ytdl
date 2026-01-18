import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const MAX_LOG_LENGTH = 6000;

const trimLog = (log) => {
  if (log.length <= MAX_LOG_LENGTH) {
    return log;
  }
  return log.slice(-MAX_LOG_LENGTH);
};

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const url = typeof payload?.url === "string" ? payload.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Missing YouTube URL." }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
  }

  const downloadsDir = path.join(process.cwd(), "downloads");
  await fs.mkdir(downloadsDir, { recursive: true });
  const outputTemplate = path.join(downloadsDir, "%(title)s.%(ext)s");

  const args = ["--no-playlist", "-o", outputTemplate, url];
  const ytdlpCommand = process.env.YTDLP_PATH || "yt-dlp";

  const result = await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(ytdlpCommand, args, { windowsHide: true });

    child.stdout.on("data", (chunk) => {
      stdout = trimLog(`${stdout}${chunk.toString()}`);
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

  if (!result.ok) {
    if (result.error?.code === "ENOENT") {
      return NextResponse.json(
        {
          error:
            "yt-dlp was not found. Make sure it is installed and on your PATH.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          result.stderr?.trim() ||
          result.error?.message ||
          "Download failed.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    outputDir: downloadsDir,
    log: result.stdout?.trim(),
  });
}
