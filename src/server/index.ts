import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import NodeMediaServer from 'node-media-server';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
const prisma = new PrismaClient();

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, videosDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === 'video' ? videosDir : thumbnailsDir;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Socket.IO for live chat
io.on('connection', (socket) => {
  socket.on('join-video', (videoId) => {
    socket.join(`video-${videoId}`);
  });

  socket.on('chat-message', async (data) => {
    const { videoId, userId, message } = data;
    await prisma.comment.create({
      data: {
        content: message,
        userId,
        videoId
      }
    });
    io.to(`video-${videoId}`).emit('new-message', data);
  });
});

// Video Routes
app.post('/api/videos/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const videoFile = req.files['video'][0];
    const thumbnailFile = req.files['thumbnail']?.[0];
    const { title, description, userId, channelName } = req.body;

    const video = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl: `/uploads/videos/${videoFile.filename}`,
        thumbnail: thumbnailFile ? `/uploads/thumbnails/${thumbnailFile.filename}` : null,
        userId,
        channelName,
        mimeType: videoFile.mimetype,
        size: videoFile.size,
      }
    });

    res.json({ id: video.id });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

app.get('/api/videos/:id/stream', async (req, res) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoPath = path.join(process.cwd(), video.videoUrl);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Start servers
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});