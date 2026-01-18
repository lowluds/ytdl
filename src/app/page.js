"use client";

import { useState } from "react";

const statusStyles = {
  idle: "text-[color:var(--foreground-muted)]",
  loading: "text-[color:var(--teal)]",
  success: "text-[color:var(--accent-deep)]",
  error: "text-red-600",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState({
    state: "idle",
    message: "Paste a YouTube link and hit download.",
  });
  const [result, setResult] = useState(null);
  const [versionState, setVersionState] = useState({
    state: "idle",
    message: "Check yt-dlp is reachable.",
    version: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResult(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setStatus({ state: "error", message: "Enter a YouTube URL to begin." });
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setStatus({ state: "error", message: "That URL doesn't look valid." });
      return;
    }

    setStatus({ state: "loading", message: "Downloading with yt-dlp..." });

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({
          state: "error",
          message: data?.error || "Download failed. Check the server logs.",
        });
        return;
      }

      setStatus({ state: "success", message: "Download complete." });
      setResult(data);
    } catch (error) {
      setStatus({
        state: "error",
        message: error?.message || "Something went wrong.",
      });
    }
  };

  const handleCheckVersion = async () => {
    setVersionState({ state: "loading", message: "Checking yt-dlp...", version: "" });
    try {
      const response = await fetch("/api/version", { method: "GET" });
      const data = await response.json();

      if (!response.ok) {
        setVersionState({
          state: "error",
          message: data?.error || "Unable to run yt-dlp.",
          version: "",
        });
        return;
      }

      setVersionState({
        state: "success",
        message: "yt-dlp is available.",
        version: data?.version || "",
      });
    } catch (error) {
      setVersionState({
        state: "error",
        message: error?.message || "Unable to run yt-dlp.",
        version: "",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-72 w-72 rounded-full bg-[#ffd7b8]/70 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#baf0e7]/70 blur-[160px]" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16 lg:px-10 lg:py-20">
        <header className="flex flex-col gap-6">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--foreground-muted)]">
            Local Only - Powered by yt-dlp
          </span>
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Download YouTube videos straight to your desktop.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[color:var(--foreground-muted)]">
              This runs entirely on your machine. The browser calls a local API
              route, which launches yt-dlp and saves files to a dedicated
              downloads folder.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel min-w-0 rounded-3xl p-6 sm:p-8">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <label className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--foreground-muted)]">
                YouTube URL
              </label>
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="url"
                  name="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-2xl border border-[color:var(--ring)] bg-white/90 px-5 py-4 text-base shadow-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30"
                  required
                />
                <button
                  type="submit"
                  disabled={status.state === "loading"}
                  className="rounded-2xl bg-[color:var(--accent)] px-6 py-4 text-base font-semibold text-white transition hover:bg-[color:var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status.state === "loading" ? "Working..." : "Download"}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={statusStyles[status.state]}>
                  {status.message}
                </span>
                <span className="text-xs text-[color:var(--foreground-muted)]">
                  Downloads to{" "}
                  <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-[color:var(--foreground)]">
                    downloads/
                  </span>
                </span>
              </div>
            </form>

            {result ? (
              <div className="mt-6 max-w-full rounded-2xl bg-white/70 p-5 text-sm text-[color:var(--foreground-muted)]">
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">
                      Saved to:
                    </span>{" "}
                    <span className="inline-block max-w-full break-all text-[color:var(--foreground-muted)]">
                      {result.outputDir}
                    </span>
                  </div>
                  {result.log ? (
                    <pre className="max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/80 p-4 text-xs leading-5 text-[color:var(--foreground)]">
                      {result.log}
                    </pre>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="glass-panel flex h-full flex-col gap-6 rounded-3xl p-6 sm:p-8">
            <div>
              <h2 className="text-2xl">Before you hit download</h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-muted)]">
                Make sure{" "}
                <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-[color:var(--foreground)]">
                  yt-dlp
                </span>{" "}
                is on your PATH. If not, set{" "}
                <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-[color:var(--foreground)]">
                  YTDLP_PATH
                </span>{" "}
                in{" "}
                <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-[color:var(--foreground)]">
                  .env.local
                </span>
                . This UI talks to the local binary, so nothing is uploaded
                anywhere.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ring)] bg-white/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">
                    Verify yt-dlp
                  </p>
                  <p className={`mt-1 ${statusStyles[versionState.state]}`}>
                    {versionState.message}
                  </p>
                  {versionState.version ? (
                    <p className="mt-2 text-xs text-[color:var(--foreground-muted)]">
                      Version:{" "}
                      <span className="font-mono text-[11px] text-[color:var(--foreground)]">
                        {versionState.version}
                      </span>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleCheckVersion}
                  disabled={versionState.state === "loading"}
                  className="rounded-full border border-[color:var(--ring)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)] transition hover:border-transparent hover:bg-[color:var(--accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {versionState.state === "loading" ? "Checking" : "Test yt-dlp"}
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-[color:var(--panel-strong)] p-4 text-sm">
              <p className="font-semibold text-[color:var(--foreground)]">
                Default download folder
              </p>
              <p className="mt-2 text-[color:var(--foreground-muted)]">
                <span className="rounded-md bg-white/80 px-2 py-1 font-mono text-[11px] text-[color:var(--foreground)]">
                  {"C:\\Users\\kyle-\\OneDrive\\Desktop\\ytdl\\downloads"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm leading-6 text-[color:var(--foreground-muted)]">
                Want audio-only or custom formats? We can add switches for
                mp3/mp4, resolution, or playlist support next.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
