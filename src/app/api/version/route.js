import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

export async function GET() {
  const ytdlpCommand = process.env.YTDLP_PATH || "yt-dlp";

  const result = await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(ytdlpCommand, ["--version"], { windowsHide: true });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
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
            "yt-dlp was not found. Make sure it is installed and on your PATH, or set YTDLP_PATH.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          result.stderr?.trim() ||
          result.error?.message ||
          "Unable to run yt-dlp.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    version: result.stdout.trim(),
    command: ytdlpCommand,
  });
}
