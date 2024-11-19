import { useState } from 'react';
import { useAuthStore } from '../store/auth';

export function useUploadVideo() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuthStore();

  const uploadVideo = async (
    videoFile: File,
    thumbnailFile: File | null,
    videoData: { title: string; description?: string }
  ) => {
    if (!user) throw new Error('Must be logged in to upload videos');

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('title', videoData.title);
      if (videoData.description) {
        formData.append('description', videoData.description);
      }
      formData.append('userId', user.uid);
      formData.append('channelName', user.displayName || 'Anonymous');

      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      };

      // Create a promise to handle the upload
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.id);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Upload failed'));
        };

        // Configure and send the request
        xhr.open('POST', '/videos/upload');
        xhr.send(formData);
      });

      const videoId = await uploadPromise;
      return videoId;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadVideo, progress, uploading };
}