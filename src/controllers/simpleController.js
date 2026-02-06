const axios = require('axios');

// Simple video info using noembed (alternative method)
const getVideoInfoSimple = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Fetching video info with noembed:', url);

    // Extract video ID
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoId || !videoId[1]) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Use noembed for basic info
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId[1]}`;
    const response = await axios.get(noembedUrl);
    
    const data = response.data;
    
    res.json({
      title: data.title || 'Unknown Title',
      thumbnail: data.thumbnail_url || '',
      duration: 0, // noembed doesn't provide duration
      author: data.author_name || 'Unknown Channel'
    });

  } catch (error) {
    console.error('Error fetching video info:', error.message);
    res.status(500).json({
      error: 'Failed to fetch video information',
      details: error.message
    });
  }
};

// Simple download using yewtu.be (alternative)
const downloadVideoSimple = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    console.log('Attempting simple download for:', url);

    // Extract video ID
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoId || !videoId[1]) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Redirect to yewtu.be for download
    const downloadUrl = `https://www.yewtu.be/watch?v=${videoId[1]}`;
    
    res.json({
      message: 'Direct download link generated',
      downloadUrl: downloadUrl,
      note: 'Open this link in browser to download video'
    });

  } catch (error) {
    console.error('Error with simple download:', error.message);
    res.status(500).json({
      error: 'Failed to generate download link',
      details: error.message
    });
  }
};

// Simple audio download
const downloadAudioSimple = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Extract video ID
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoId || !videoId[1]) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Redirect to yewtu.be for audio
    const downloadUrl = `https://www.yewtu.be/watch?v=${videoId[1]}&format=mp3`;
    
    res.json({
      message: 'Direct audio download link generated',
      downloadUrl: downloadUrl,
      note: 'Open this link in browser to download audio'
    });

  } catch (error) {
    console.error('Error with simple audio download:', error.message);
    res.status(500).json({
      error: 'Failed to generate audio download link',
      details: error.message
    });
  }
};

module.exports = {
  getVideoInfoSimple,
  downloadVideoSimple,
  downloadAudioSimple
};
