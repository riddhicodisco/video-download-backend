# Base image
FROM node:18-slim

# Install system dependencies (python3, ffmpeg, curl for downloading yt-dlp)
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
