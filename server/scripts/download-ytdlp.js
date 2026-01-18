const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const RELEASE_BASE =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

const platform = process.platform;
const isWin = platform === "win32";
const isMac = platform === "darwin";

const downloadName = isWin ? "yt-dlp.exe" : isMac ? "yt-dlp_macos" : "yt-dlp";
const destName = isWin ? "yt-dlp.exe" : "yt-dlp";

const binDir = path.join(__dirname, "..", "bin");
const destPath = path.join(binDir, destName);

if (process.env.YTDLP_PATH) {
  console.log("YTDLP_PATH is set, skipping bundled download.");
  process.exit(0);
}

if (fs.existsSync(destPath)) {
  console.log("Bundled yt-dlp already present.");
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });

const downloadFile = (url, targetPath) =>
  new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        downloadFile(response.headers.location, targetPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}.`));
        response.resume();
        return;
      }

      const file = fs.createWriteStream(targetPath);
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", (error) => {
        file.close(() => reject(error));
      });
    });

    request.on("error", reject);
  });

const downloadUrl = `${RELEASE_BASE}/${downloadName}`;

downloadFile(downloadUrl, destPath)
  .then(() => {
    if (!isWin) {
      fs.chmodSync(destPath, 0o755);
    }
    console.log(`Downloaded yt-dlp to ${destPath}`);
  })
  .catch((error) => {
    console.error("Failed to download yt-dlp.", error?.message || error);
    process.exit(1);
  });
