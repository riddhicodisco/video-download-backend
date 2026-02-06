const express = require("express");
const router = express.Router();

// Import yt-dlp controller (Robust implementation)
const {
  getVideoInfoYtDlp,
  downloadVideoYtDlp,
  downloadAudioYtDlp,
} = require("../controllers/ytDlpController");

// Import play-dl controller (Keeping for reference/legacy)
const {
  getVideoInfoPlayDl,
  downloadVideoPlayDl,
  downloadAudioPlayDl,
} = require("../controllers/playDlController");

// Import simple controller (fallback)
const {
  getVideoInfoSimple,
  downloadVideoSimple,
  downloadAudioSimple,
} = require("../controllers/simpleController");

// Main routes using yt-dlp (Most reliable)
router.post("/info", getVideoInfoYtDlp);
router.post("/download/video", downloadVideoYtDlp);
router.post("/download/audio", downloadAudioYtDlp);

// Fallback route using noembed
router.post("/info-fallback", getVideoInfoSimple); // Switched to simple which uses noembed

// play-dl routes (Secondary)
router.post("/info-playdl", getVideoInfoPlayDl);
router.post("/download/video-playdl", downloadVideoPlayDl);
router.post("/download/audio-playdl", downloadAudioPlayDl);

// Simple fallback routes
router.post("/info-simple", getVideoInfoSimple);
router.post("/download/video-simple", downloadVideoSimple);
router.post("/download/audio-simple", downloadAudioSimple);

// Debug route
const { debugYtDlp } = require("../controllers/ytDlpController");
router.get("/debug-yt", debugYtDlp);

module.exports = router;
