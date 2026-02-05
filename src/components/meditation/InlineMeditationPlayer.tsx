 import { useState, useRef, useEffect, useCallback } from "react";
 import { Button } from "@/components/ui/button";
 import { Slider } from "@/components/ui/slider";
 import {
   Play,
   Pause,
   Headphones,
   RefreshCw,
   Volume2,
   ChevronDown,
   ChevronUp,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useMeditationTracking } from "@/hooks/useEnhancedAnalytics";
 
 interface InlineMeditationPlayerProps {
   audioUrl: string;
   title?: string;
   durationSeconds?: number | null;
   dailyContentId?: string;
 }
 
 const formatTime = (seconds: number) => {
   const mins = Math.floor(seconds / 60);
   const secs = Math.floor(seconds % 60);
   return `${mins}:${secs.toString().padStart(2, "0")}`;
 };
 
 export function InlineMeditationPlayer({
   audioUrl,
   title = "Meditação do Dia",
   durationSeconds,
   dailyContentId,
 }: InlineMeditationPlayerProps) {
   const audioRef = useRef<HTMLAudioElement>(null);
   const [isExpanded, setIsExpanded] = useState(false);
   const [isPlaying, setIsPlaying] = useState(false);
   const [currentTime, setCurrentTime] = useState(0);
   const [duration, setDuration] = useState(durationSeconds || 0);
   const [audioError, setAudioError] = useState(false);
   const [hasTrackedPlay, setHasTrackedPlay] = useState(false);
   const { trackPlay, trackComplete } = useMeditationTracking();
 
   // Track meditation completion
   const handleEnded = useCallback(() => {
     setIsPlaying(false);
     if (dailyContentId) {
       trackComplete(dailyContentId);
     }
   }, [dailyContentId, trackComplete]);
 
   useEffect(() => {
     const audio = audioRef.current;
     if (!audio) return;
 
     const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
     const handleDurationChange = () => setDuration(audio.duration || durationSeconds || 0);
     const handleError = () => setAudioError(true);
     const handleCanPlay = () => setAudioError(false);
 
     audio.addEventListener("timeupdate", handleTimeUpdate);
     audio.addEventListener("durationchange", handleDurationChange);
     audio.addEventListener("ended", handleEnded);
     audio.addEventListener("error", handleError);
     audio.addEventListener("canplay", handleCanPlay);
 
     return () => {
       audio.removeEventListener("timeupdate", handleTimeUpdate);
       audio.removeEventListener("durationchange", handleDurationChange);
       audio.removeEventListener("ended", handleEnded);
       audio.removeEventListener("error", handleError);
       audio.removeEventListener("canplay", handleCanPlay);
     };
   }, [audioUrl, durationSeconds, handleEnded]);
 
   const togglePlay = () => {
     if (!audioRef.current) return;
 
     if (isPlaying) {
       audioRef.current.pause();
     } else {
       // Expand automatically when playing
       if (!isExpanded) {
         setIsExpanded(true);
       }
       audioRef.current.play().catch(() => setAudioError(true));
       
       // Track play event once per session
       if (!hasTrackedPlay && dailyContentId) {
         trackPlay(dailyContentId);
         setHasTrackedPlay(true);
       }
     }
     setIsPlaying(!isPlaying);
   };
 
   const handleSeek = (value: number[]) => {
     if (!audioRef.current || duration <= 0) return;
     const time = (value[0] / 100) * duration;
     audioRef.current.currentTime = time;
     setCurrentTime(time);
   };
 
   const handleRetryAudio = () => {
     setAudioError(false);
     if (audioRef.current) {
       audioRef.current.load();
     }
   };
 
   const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
   const displayDuration = durationSeconds ? Math.round(durationSeconds / 60) : null;
 
   if (audioError) {
     return (
       <div className="p-4 bg-destructive/5 rounded-lg text-center space-y-3">
         <p className="text-destructive text-sm">Não foi possível carregar o áudio.</p>
         <Button variant="outline" size="sm" onClick={handleRetryAudio}>
           <RefreshCw className="w-4 h-4 mr-2" />
           Tentar novamente
         </Button>
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
 
       {/* Compact View */}
       <div className="flex items-center gap-3">
         <Button
           size="icon"
           className={cn(
             "w-12 h-12 rounded-full shrink-0 transition-all",
             isPlaying && "ring-4 ring-primary/20"
           )}
           onClick={togglePlay}
           aria-label={isPlaying ? "Pausar meditação" : "Reproduzir meditação"}
         >
           {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
         </Button>
 
         <div className="flex-1 min-w-0">
           <p className="font-medium text-foreground truncate">{title}</p>
           <p className="text-sm text-muted-foreground">
             {isPlaying ? formatTime(currentTime) : displayDuration ? `${displayDuration} minutos` : "Pronto para ouvir"}
             {isPlaying && duration > 0 && ` / ${formatTime(duration)}`}
           </p>
         </div>
 
         <Button
           variant="ghost"
           size="icon"
           onClick={() => setIsExpanded(!isExpanded)}
           aria-label={isExpanded ? "Minimizar player" : "Expandir player"}
         >
           {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
         </Button>
       </div>
 
       {/* Expanded Controls */}
       {isExpanded && (
         <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
           {/* Icon */}
           <div className="flex justify-center">
             <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
               <Headphones className="w-10 h-10 text-primary" />
             </div>
           </div>
 
           {/* Progress Slider */}
           <div className="space-y-2">
             <Slider
               value={[progress]}
               max={100}
               step={0.1}
               onValueChange={handleSeek}
               aria-label="Progresso da meditação"
             />
             <div className="flex justify-between text-xs text-muted-foreground">
               <span>{formatTime(currentTime)}</span>
               <span>{formatTime(duration)}</span>
             </div>
           </div>
 
           {/* Info */}
           <div className="flex items-center justify-center gap-2 text-muted-foreground">
             <Volume2 className="w-4 h-4" />
             <span className="text-sm">Encontre um lugar tranquilo</span>
           </div>
         </div>
       )}
 
       {/* Mini progress when collapsed and playing */}
       {!isExpanded && isPlaying && (
         <div className="h-1 bg-secondary rounded-full overflow-hidden">
           <div
             className="h-full bg-primary transition-all duration-300"
             style={{ width: `${progress}%` }}
           />
         </div>
       )}
     </div>
   );
 }