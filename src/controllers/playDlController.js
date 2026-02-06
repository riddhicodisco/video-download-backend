const ytdl = require('play-dl');

// Get video information using play-dl
const getVideoInfoPlayDl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Fetching video info with play-dl:', url);

    const info = await ytdl.video_info(url);

    res.json({
      title: info.video_details.title,
      thumbnail: info.video_details.thumbnails[0].url,
      duration: Math.floor(info.video_details.durationInSec),
      author: info.video_details.channel.name
    });

  } catch (error) {
    console.error('Error fetching video info with play-dl:', error.message);
    res.status(500).json({
      error: 'Failed to fetch video information',
      details: error.message
    });
  }
};

// Download video using play-dl
const downloadVideoPlayDl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Downloading video with play-dl:', url);

    const info = await ytdl.video_info(url);
    const title = info.video_details.title.replace(/[^\w\s]/gi, '');

    // Set headers for video download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    const stream = await ytdl.stream(url, {
      quality: 'highest',
      format: 'mp4'
    });

    stream.on('error', (err) => {
      console.error('play-dl stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed (play-dl stream error)', details: err.message });
      }
    });

    stream.on('finish', () => {
      console.log('play-dl video download completed');
    });

    stream.pipe(res);

  } catch (error) {
    console.error('Error downloading video:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download video',
        details: error.message
      });
    }
  }
};

// Download audio only using play-dl
const downloadAudioPlayDl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Downloading audio with play-dl:', url);

    const info = await ytdl.video_info(url);
    const title = info.video_details.title.replace(/[^\w\s]/gi, '');

    // Set headers for audio download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const stream = await ytdl.stream(url, {
      quality: 2,
      format: 'mp3'
    });

    stream.on('error', (err) => {
      console.error('play-dl audio stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed (play-dl audio stream error)', details: err.message });
      }
    });

    stream.on('finish', () => {
      console.log('play-dl audio download completed');
    });

    stream.pipe(res);

  } catch (error) {
    console.error('Error downloading audio:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download audio',
        details: error.message
      });
    }
  }
};

module.exports = {
  getVideoInfoPlayDl,
  downloadVideoPlayDl,
  downloadAudioPlayDl
};
