import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  AlertCircle,
  RotateCcw,
  Volume2,
  Headphones,
} from "lucide-react";
import { formatTime } from "@/hooks/useMediaProgress";

interface AudioPlayerProps {
  src: string;
  title: string;
  initialPosition?: number;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  playbackRate: number;
  onPlaybackRateChange: () => void;
  variant?: "default" | "podcast";
}

export function AudioPlayer({
  src,
  title,
  initialPosition = 0,
  onTimeUpdate,
  onEnded,
  playbackRate,
  onPlaybackRateChange,
  variant = "default",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showContinue, setShowContinue] = useState(initialPosition > 10);
  const lastSaveRef = useRef<number>(0);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    const now = Date.now();
    if (now - lastSaveRef.current >= 15000) {
      lastSaveRef.current = now;
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleAudioRef = useCallback((element: HTMLAudioElement | null) => {
    audioRef.current = element;
    if (element) {
      element.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current || duration <= 0) return;
    const time = (value[0] / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const seekToPosition = useCallback((position: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = position;
      setCurrentTime(position);
      setShowContinue(false);
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (mediaError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground text-center">{mediaError}</p>
        <Button onClick={() => window.location.reload()}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const bgClass = variant === "podcast" ? "bg-primary/5" : "bg-amethyst-light/30";

  return (
    <div className={`p-6 ${bgClass}`}>
      <audio
        ref={handleAudioRef}
        src={src}
        className="hidden"
        aria-label={`Áudio: ${title}`}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (audioRef.current) onTimeUpdate?.(audioRef.current.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            if (initialPosition > 0) {
              audioRef.current.currentTime = initialPosition;
              setCurrentTime(initialPosition);
            }
          }
        }}
        onError={() => setMediaError("Não foi possível carregar o áudio. Tente novamente.")}
      />

      <div className="flex flex-col items-center gap-6">
        {variant === "podcast" && (
          <div className="flex items-center gap-3 text-primary">
            <Headphones className="w-6 h-6" />
            <span className="font-medium">Modo Podcast</span>
          </div>
        )}

        {/* Play Button */}
        <Button
          size="lg"
          className="w-20 h-20 rounded-full"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </Button>

        {/* Continue from where you left */}
        {showContinue && !isPlaying && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => seekToPosition(initialPosition)}
          >
            Continuar de {formatTime(initialPosition)}
          </Button>
        )}

        {/* Progress Slider */}
        <div className="w-full max-w-md space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            aria-label="Progresso do áudio"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlaybackRateChange}
            className="text-muted-foreground"
          >
            {playbackRate}x
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm truncate max-w-48">{title}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
