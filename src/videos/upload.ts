import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '../../../lib/prisma'; // Ensure the Prisma client is set up correctly

// Config to disable Next.js's built-in body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the upload directory
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error parsing form', error: err.message });
    }

    try {
      // Extract fields and ensure they are strings
      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
      const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
      const channelName = Array.isArray(fields.channelName) ? fields.channelName[0] : fields.channelName;

      // Validate required fields
      if (!title || !userId || !channelName) {
        return res
          .status(400)
          .json({ message: 'Missing required fields: title, userId, or channelName' });
      }

      // Handle video file
      const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
      if (!videoFile) {
        return res.status(400).json({ message: 'Video file is required' });
      }

      // Handle thumbnail file (optional)
      const thumbnailFile = Array.isArray(files.thumbnail) ? files.thumbnail[0] : files.thumbnail;

      // Resolve file paths
      const videoPath = path.relative(process.cwd(), videoFile.filepath).replace(/\\/g, '/');
      const thumbnailPath = thumbnailFile
        ? path.relative(process.cwd(), thumbnailFile.filepath).replace(/\\/g, '/')
        : null;

      // Get file metadata
      const videoMimeType = videoFile.mimetype || 'application/octet-stream';
      const videoSize = videoFile.size || 0;

      // Save video data to the database
      const video = await prisma.video.create({
        data: {
          title,
          description,
          userId,
          channelName,
          videoUrl: videoPath,
          thumbnail: thumbnailPath,
          mimeType: videoMimeType,
          size: videoSize,
        },
      });

      return res.status(201).json({ id: video.id, message: 'Video uploaded successfully' });
    } catch (error) {
      console.error('Error saving video:', error);
      return res.status(500).json({ message: 'Error saving video data', error: (error as Error).message });
    }
  });
}
