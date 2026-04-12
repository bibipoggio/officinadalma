import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Play,
  CheckCircle,
  ChevronDown,
  Video,
  FileDown,
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { useVideoProgress, type VideoItem } from "@/hooks/useVideoProgress";
import { formatTime } from "@/hooks/useMediaProgress";

// Detect if URL is an embed (YouTube/Vimeo) or direct
function isEmbedUrl(url: string): boolean {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com") ||
    url.includes("bunny.net") ||
    url.includes("iframe.mediadelivery.net")
  );
}

interface MultiVideoPlayerProps {
  lessonId: string;
  videos: VideoItem[];
  playbackRate: number;
  onPlaybackRateChange: () => void;
  onAllCompleted?: () => void;
}

export function MultiVideoPlayer({
  lessonId,
  videos,
  playbackRate,
  onPlaybackRateChange,
  onAllCompleted,
}: MultiVideoPlayerProps) {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const {
    progressMap,
    saveVideoPosition,
    markVideoCompleted,
    forceSaveVideo,
    allCompleted,
    completedCount,
  } = useVideoProgress(lessonId, videos);

  const handleTimeUpdate = useCallback(
    (videoIndex: number) => (time: number) => {
      saveVideoPosition(videoIndex, time);
    },
    [saveVideoPosition]
  );

  const handleVideoEnded = useCallback(
    async (videoIndex: number) => {
      await markVideoCompleted(videoIndex);
      // Auto-expand next video
      if (videoIndex < videos.length - 1) {
        setActiveVideo(videoIndex + 1);
      }
      // Check if all completed
      const willBeAllComplete = videos.every((_, i) =>
        i === videoIndex ? true : progressMap[i]?.is_completed
      );
      if (willBeAllComplete) {
        onAllCompleted?.();
      }
    },
    [markVideoCompleted, videos, progressMap, onAllCompleted]
  );

  const handleMarkWatched = useCallback(
    async (videoIndex: number) => {
      await markVideoCompleted(videoIndex);
      const willBeAllComplete = videos.every((_, i) =>
        i === videoIndex ? true : progressMap[i]?.is_completed
      );
      if (willBeAllComplete) {
        onAllCompleted?.();
      }
    },
    [markVideoCompleted, videos, progressMap, onAllCompleted]
  );

  const overallProgress =
    videos.length > 0
      ? Math.round((completedCount / videos.length) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {/* Overall progress */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Progress value={overallProgress} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedCount}/{videos.length} vídeos
        </span>
        {allCompleted && (
          <Badge variant="outline" className="text-success border-success/30 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completo
          </Badge>
        )}
      </div>

      {/* Video list */}
      <div className="divide-y">
        {videos.map((video, index) => {
          const progress = progressMap[index];
          const isCompleted = progress?.is_completed;
          const isActive = activeVideo === index;
          const isEmbed = isEmbedUrl(video.url);
          const resumePosition = progress?.last_position_seconds || 0;

          return (
            <Collapsible
              key={index}
              open={isActive}
              onOpenChange={(open) => setActiveVideo(open ? index : null)}
            >
              <CollapsibleTrigger className="w-full">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left",
                    isActive && "bg-muted/30"
                  )}
                >
                  {/* Number / status */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isCompleted
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Title and progress */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {video.title || `Vídeo ${index + 1}`}
                    </p>
                    {!isCompleted && resumePosition > 10 && (
                      <p className="text-xs text-muted-foreground">
                        Continuar de {formatTime(resumePosition)}
                      </p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-success">Assistido</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCompleted && !isActive && (
                      <Play className="w-4 h-4 text-muted-foreground" />
                    )}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isActive && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  {isEmbed ? (
                    /* Embed player (YouTube/Vimeo/Bunny) */
                    <div>
                      <div className="aspect-video">
                        <iframe
                          src={video.url}
                          title={video.title || `Vídeo ${index + 1}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {!isCompleted && (
                        <div className="p-3 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkWatched(index);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marcar como assistido
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Direct video player with progress tracking */
                    <VideoPlayer
                      src={video.url}
                      title={video.title || `Vídeo ${index + 1}`}
                      initialPosition={resumePosition}
                      onTimeUpdate={handleTimeUpdate(index)}
                      onEnded={() => handleVideoEnded(index)}
                      playbackRate={playbackRate}
                      onPlaybackRateChange={onPlaybackRateChange}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
