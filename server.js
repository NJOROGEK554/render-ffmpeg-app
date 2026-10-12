const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const app = express();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.get("/", (req, res) => {
  res.json({
    service: "FFmpeg API",
    status: "running",
    endpoints: ["/health", "/convert"]
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/convert", (req, res, next) => {
  if (!API_KEY || req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}, upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Upload a video in the 'video' field." });
  }

  const input = req.file.path;
  const output = path.join(os.tmpdir(), `${crypto.randomUUID()}.mp4`);

  execFile("ffmpeg", [
    "-nostdin",
    "-y",
    "-i", input,
    "-c:v", "libx264",
    "-c:a", "aac",
    "-movflags", "+faststart",
    output
  ], { timeout: 120000 }, (error) => {
    fs.rm(input, { force: true }, () => {});

    if (error) {
      fs.rm(output, { force: true }, () => {});
      return res.status(500).json({ error: "Video conversion failed." });
    }

    res.download(output, "converted.mp4", () => {
      fs.rm(output, { force: true }, () => {});
    });
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FFmpeg API listening on port ${PORT}`);
});
