import { useRef, useCallback } from "react";

interface ScreenCaptureOptions {
  excludeOwnWindow?: boolean;
  quality?: number;
}

export const useScreenCapture = (options: ScreenCaptureOptions = {}) => {
  const { excludeOwnWindow = true, quality = 0.8 } = options;
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const requestScreenAccess = useCallback(async (): Promise<boolean> => {
    try {
      // Request only browser tabs and windows, exclude entire screen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "window", // Prefer windows/tabs over monitor
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
        preferCurrentTab: false, // Allow any tab/window selection
      } as any); // Type assertion needed for newer displaySurface constraints

      // Check what type of surface was shared
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        const settings = videoTrack.getSettings();
        
        // Warn if entire screen was selected and potentially reject it
        if (settings.displaySurface === 'monitor') {
          console.warn('⚠️ Entire screen selected. For privacy and security, please share a specific browser tab or window instead.');
          
          // Stop the stream to prevent screen capture
          stream.getTracks().forEach(track => track.stop());
          
          // Show user-friendly error
          alert('For your privacy and security, please share a specific browser tab or window instead of your entire screen. Please try again and select a browser tab or window.');
          
          return false;
        }
        
        // Log what was actually shared for debugging
        console.log('Screen sharing started:', {
          displaySurface: settings.displaySurface,
          width: settings.width,
          height: settings.height
        });
      }

      streamRef.current = stream;

      // Create video element for capturing frames
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      videoRef.current = video;

      // Wait for video to be ready
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(true);
        };
        video.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error("Failed to get screen access:", error);
      return false;
    }
  }, []);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !streamRef.current) {
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Draw current frame
      ctx.drawImage(video, 0, 0);

      // Basic window self-exclusion: detect if our app window is visible
      // This is a simple approach - in a real implementation you'd use more sophisticated detection
      if (excludeOwnWindow) {
        // Check if the current tab/window contains our app
        const appElement = document.querySelector(".app");
        if (appElement && document.hasFocus()) {
          // If our app is focused, we should minimize the chance of capturing ourselves
          // For now, we'll just add a small indicator in the console
          console.log(
            "Own window detected as focused - capturing anyway for demo"
          );
        }
      }

      return canvas.toDataURL("image/png", quality);
    } catch (error) {
      console.error("Failed to capture frame:", error);
      return null;
    }
  }, [quality, excludeOwnWindow]);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.remove();
      videoRef.current = null;
    }
  }, []);

  const silentCapture = useCallback(async (): Promise<string | null> => {
    // If we don't have an active stream, try to get one
    if (!streamRef.current) {
      const success = await requestScreenAccess();
      if (!success) return null;
    }

    return await captureFrame();
  }, [requestScreenAccess, captureFrame]);

  return {
    requestScreenAccess,
    captureFrame,
    silentCapture,
    stopCapture,
    hasAccess: () => !!streamRef.current,
    getStream: () => streamRef.current,
  };
};
