import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  AlertCircle,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { formatTime } from "@/hooks/useMediaProgress";

interface VideoPlayerProps {
  src: string;
  title: string;
  initialPosition?: number;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  playbackRate: number;
  onPlaybackRateChange: () => void;
}

// Helper to detect and parse external video URLs
function parseVideoUrl(url: string): { type: "youtube" | "vimeo" | "direct"; videoId?: string } {
  if (!url) return { type: "direct" };
  
  // YouTube patterns
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return { type: "youtube", videoId: youtubeMatch[1] };
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return { type: "vimeo", videoId: vimeoMatch[1] };
  }

  return { type: "direct" };
}

export function VideoPlayer({
  src,
  title,
  initialPosition = 0,
  onTimeUpdate,
  onEnded,
  playbackRate,
  onPlaybackRateChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showContinue, setShowContinue] = useState(initialPosition > 10);
  const lastSaveRef = useRef<number>(0);

  const { type: videoType, videoId } = parseVideoUrl(src);

  // Handle time update for direct videos
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    const now = Date.now();
    if (now - lastSaveRef.current >= 15000) {
      lastSaveRef.current = now;
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element) {
      element.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Update playback rate when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current || duration <= 0) return;
    const time = (value[0] / 100) * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const seekToPosition = useCallback((position: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = position;
      setCurrentTime(position);
      setShowContinue(false);
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // YouTube Embed
  if (videoType === "youtube" && videoId) {
    return (
      <div className="relative bg-foreground/5">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Vimeo Embed
  if (videoType === "vimeo" && videoId) {
    return (
      <div className="relative bg-foreground/5">
        <div className="aspect-video">
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`}
            title={title}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Direct Video Player
  return (
    <div className="relative bg-foreground/5 group">
      {mediaError ? (
        <div className="aspect-video flex flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground text-center">{mediaError}</p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <video
            ref={handleVideoRef}
            src={src}
            className="w-full aspect-video"
            playsInline
            aria-label={`Vídeo: ${title}`}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (videoRef.current) onTimeUpdate?.(videoRef.current.currentTime);
            }}
            onEnded={() => {
              setIsPlaying(false);
              onEnded?.();
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                if (initialPosition > 0) {
                  videoRef.current.currentTime = initialPosition;
                  setCurrentTime(initialPosition);
                }
              }
            }}
            onError={() => setMediaError("Não foi possível carregar o vídeo. Tente novamente.")}
          />

          {/* Custom Controls Overlay */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
              isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            )}
            onClick={togglePlay}
          >
            <Button
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>
          </div>

          {/* Bottom Controls Bar */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
              isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            )}
          >
            <div className="mb-3">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                aria-label="Progresso do vídeo"
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </Button>
                <span className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-white hover:bg-white/20 h-8 px-2 text-xs font-medium"
                  onClick={onPlaybackRateChange}
                >
                  {playbackRate}x
                </Button>
                <Volume2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Continue from where you left */}
          {showContinue && !isPlaying && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-16">
              <Button variant="secondary" onClick={() => seekToPosition(initialPosition)}>
                Continuar de {formatTime(initialPosition)}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
