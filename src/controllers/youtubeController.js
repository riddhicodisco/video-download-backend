const ytdl = require("@distube/ytdl-core");
const axios = require("axios");

// Get video information
const getVideoInfo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log("Fetching video info:", url);
    const info = await ytdl.getInfo(url);

    res.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      duration: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name,
    });
  } catch (error) {
    console.error("Error fetching video info:", error.message);

    // Check for specific ytdl-core errors
    if (
      error.message.includes("decipher") ||
      error.message.includes("cipher")
    ) {
      return res.status(500).json({
        error: "YouTube encryption issue detected",
        details: "ytdl-core cannot decrypt this video due to YouTube updates",
        suggestion: "Try a different video or wait for library updates",
        workaround: "Some videos may work, try older videos",
      });
    }

    if (
      error.message.includes("Video unavailable") ||
      error.message.includes("private")
    ) {
      return res.status(400).json({
        error: "Video not available",
        details: "This video is private, deleted, or region-restricted",
      });
    }

    res.status(500).json({
      error: "Failed to fetch video information",
      details: error.message,
      note: "ytdl-core may need updates for recent YouTube changes",
    });
  }
};

// Simple fallback using noembed API
const getVideoInfoFallback = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    // Extract video ID
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    );
    if (!videoId || !videoId[1]) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log("Fetching video info with noembed fallback:", url);

    // Use noembed for basic info
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId[1]}`;
    const response = await axios.get(noembedUrl);

    const data = response.data;

    res.json({
      title: data.title || "Unknown Title",
      thumbnail: data.thumbnail_url || "",
      duration: 0, // noembed doesn't provide duration
      author: data.author_name || "Unknown Channel",
    });
  } catch (error) {
    console.error("Error fetching video info with noembed:", error.message);
    res.status(500).json({
      error: "Failed to fetch video information",
      details: error.message,
    });
  }
};

// Download video with audio
const downloadVideo = async (req, res) => {
  const { url, quality = "auto" } = req.body;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  console.log("Fetching video info for download:", url, "Quality:", quality);

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

    // Set response headers
    res.setHeader("Content-Disposition", `attachment; filename="${title}.mp4"`);
    res.setHeader("Content-Type", "video/mp4");

    console.log("Starting video download stream...");

    // Determine format based on quality
    let formatOptions = {
      quality: "lowest",
      filter: "audioandvideo",
    };

    // Custom quality handling
    if (quality && quality !== "auto") {
      if (quality.includes("p")) {
        // Video quality like 1080p, 720p, etc.
        const height = parseInt(quality.replace("p", ""));
        formatOptions = {
          filter: (format) =>
            format.height === height && format.hasVideo && format.hasAudio,
          quality: height,
        };
      } else if (quality.includes("kbps")) {
        // Bitrate for audio
        const bitrate = parseInt(quality.replace("kbps", ""));
        formatOptions = {
          filter: (format) =>
            format.audioBitrate === bitrate &&
            format.hasAudio &&
            !format.hasVideo,
          quality: bitrate,
        };
      }
    }

    // Download with specified format
    const videoStream = ytdl(url, formatOptions);

    let downloadStarted = false;

    videoStream.on("info", (info, format) => {
      console.log("Stream started, format:", format.qualityLabel);
    });

    videoStream.on("progress", (chunkLength, downloaded, total) => {
      if (!downloadStarted) {
        downloadStarted = true;
        console.log("Download started...");
      }
      const percent = ((downloaded / total) * 100).toFixed(2);
      if (downloaded % 1000000 < chunkLength) {
        // Log every ~1MB
        console.log(`Downloaded: ${percent}%`);
      }
    });

    videoStream.on("error", (err) => {
      console.error("Video stream error:", err.message);
      console.log(
        "⚠️ If you see decipher warnings, try again or use a different video",
      );
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download video stream",
          details: err.message,
          suggestion:
            "YouTube may have updated their player. Try again later or use a different video.",
        });
      }
    });

    videoStream.on("end", () => {
      console.log("Video download completed");
    });

    videoStream.pipe(res);
  } catch (error) {
    console.error("Error downloading video:", error.message);
    console.error("Stack:", error.stack);

    // Check for specific ytdl-core errors
    if (
      error.message &&
      (error.message.includes("decipher") || error.message.includes("cipher"))
    ) {
      if (!res.headersSent) {
        return res.status(500).json({
          error: "YouTube encryption issue detected",
          details: "ytdl-core cannot decrypt this video due to YouTube updates",
          suggestion: "Try a different video or wait for library updates",
          workaround: "Some videos may work, try older videos",
        });
      }
    }

    if (
      error.message &&
      (error.message.includes("Video unavailable") ||
        error.message.includes("private"))
    ) {
      if (!res.headersSent) {
        return res.status(400).json({
          error: "Video not available",
          details: "This video is private, deleted, or region-restricted",
        });
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to download video",
        details: error.message,
      });
    }
  }
};

// Download audio only
const downloadAudio = async (req, res) => {
  try {
    const { url, quality = "auto" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log("Fetching audio info for download:", url, "Quality:", quality);
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

    // Set response headers
    res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);
    res.setHeader("Content-Type", "audio/mpeg");

    console.log("Starting audio download stream...");

    // Determine format based on quality
    let formatOptions = {
      quality: "highestaudio",
      filter: "audioonly",
    };

    // Custom quality handling for audio
    if (quality && quality !== "auto") {
      if (quality.includes("kbps")) {
        // Audio bitrate like 320kbps, 192kbps, etc.
        const bitrate = parseInt(quality.replace("kbps", ""));
        formatOptions = {
          filter: (format) =>
            format.audioBitrate === bitrate &&
            format.hasAudio &&
            !format.hasVideo,
          quality: bitrate,
        };
      }
    }

    // Download audio only
    const audioStream = ytdl(url, formatOptions);

    let downloadStarted = false;

    audioStream.on("info", (info, format) => {
      console.log("Audio stream started, bitrate:", format.audioBitrate);
    });

    audioStream.on("progress", (chunkLength, downloaded, total) => {
      if (!downloadStarted) {
        downloadStarted = true;
        console.log("Audio download started...");
      }
      const percent = ((downloaded / total) * 100).toFixed(2);
      if (downloaded % 500000 < chunkLength) {
        // Log every ~500KB
        console.log(`Downloaded: ${percent}%`);
      }
    });

    audioStream.on("error", (err) => {
      console.error("Audio stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download audio stream",
          details: err.message,
        });
      }
    });

    audioStream.on("end", () => {
      console.log("Audio download completed");
    });

    audioStream.pipe(res);
  } catch (error) {
    console.error("Error downloading audio:", error.message);
    console.error("Stack:", error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to download audio",
        details: error.message,
      });
    }
  }
};

module.exports = {
  getVideoInfo,
  getVideoInfoFallback,
  downloadVideo,
  downloadAudio,
};
