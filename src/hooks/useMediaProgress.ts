import { useRef, useEffect, useState, useCallback } from "react";

interface UseMediaProgressOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  initialPosition?: number;
  saveInterval?: number;
}

export function useMediaProgress(options: UseMediaProgressOptions = {}) {
  const {
    onTimeUpdate,
    onEnded,
    initialPosition = 0,
    saveInterval = 15000,
  } = options;

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const lastSaveRef = useRef<number>(0);

  const handleTimeUpdate = useCallback(() => {
    if (!mediaRef.current) return;

    const time = mediaRef.current.currentTime;
    setCurrentTime(time);

    // Save progress periodically
    const now = Date.now();
    if (now - lastSaveRef.current >= saveInterval) {
      lastSaveRef.current = now;
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate, saveInterval]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (!hasStarted) {
      setHasStarted(true);
    }
  }, [hasStarted]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (mediaRef.current) {
      onTimeUpdate?.(mediaRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleLoadedMetadata = useCallback(() => {
    if (!mediaRef.current) return;
    setDuration(mediaRef.current.duration);

    // Seek to initial position if provided
    if (initialPosition > 0 && mediaRef.current.currentTime < initialPosition) {
      mediaRef.current.currentTime = initialPosition;
      setCurrentTime(initialPosition);
    }
  }, [initialPosition]);

  const handleError = useCallback(() => {
    setMediaError("Não foi possível carregar o conteúdo. Tente novamente.");
  }, []);

  const play = useCallback(() => {
    mediaRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    mediaRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Cleanup: save position on unmount
  useEffect(() => {
    return () => {
      if (mediaRef.current && mediaRef.current.currentTime > 0) {
        onTimeUpdate?.(mediaRef.current.currentTime);
      }
    };
  }, [onTimeUpdate]);

  const setRef = useCallback(
    (element: HTMLVideoElement | HTMLAudioElement | null) => {
      if (mediaRef.current) {
        mediaRef.current.removeEventListener("timeupdate", handleTimeUpdate);
        mediaRef.current.removeEventListener("play", handlePlay);
        mediaRef.current.removeEventListener("pause", handlePause);
        mediaRef.current.removeEventListener("ended", handleEnded);
        mediaRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata);
        mediaRef.current.removeEventListener("error", handleError);
      }

      mediaRef.current = element;

      if (element) {
        element.addEventListener("timeupdate", handleTimeUpdate);
        element.addEventListener("play", handlePlay);
        element.addEventListener("pause", handlePause);
        element.addEventListener("ended", handleEnded);
        element.addEventListener("loadedmetadata", handleLoadedMetadata);
        element.addEventListener("error", handleError);
      }
    },
    [handleTimeUpdate, handlePlay, handlePause, handleEnded, handleLoadedMetadata, handleError]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    setRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    hasStarted,
    mediaError,
    play,
    pause,
    seek,
    togglePlay,
  };
}

// Format seconds to mm:ss or hh:mm:ss
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
