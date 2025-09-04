import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface UserProgressProps {
  level: number;
  exp: number;
  next_level_exp: number;
}

export function UserProgress({ level, exp, next_level_exp }: UserProgressProps) {
  const progress = (exp / next_level_exp) * 100;
  const expToNext = next_level_exp - exp;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="w-16 h-12 flex items-center justify-center cursor-pointer">
          <div className="relative w-12 h-12">
            {/* SVG circular progress */}
            <svg className="w-12 h-12" viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r="20" strokeWidth="4" className="text-border" stroke="currentColor" fill="none" style={{ opacity: 0.16 }} />
              <circle
                cx="24"
                cy="24"
                r="20"
                strokeWidth="4"
                strokeLinecap="round"
                stroke="url(#gradUserProgress)"
                fill="none"
                transform="rotate(-90 24 24)"
                style={{
                  strokeDasharray: `${2 * Math.PI * 20}`,
                  strokeDashoffset: `${2 * Math.PI * 20 * (1 - Math.max(0, Math.min(1, progress / 100)))}`,
                  transition: 'stroke-dashoffset 300ms ease'
                }}
              />
              <defs>
                <linearGradient id="gradUserProgress" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#29b26b" />
                  <stop offset="100%" stopColor="#0f9d58" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-semibold text-foreground">{level}</span>
            </div>
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-[360px]">
        <div className="space-y-4">
          <div className="relative p-4 bg-card rounded-lg border border-border">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="text-lg font-bold text-primary">Ур. {level}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  До следующего уровня: <span className="font-medium text-foreground">{expToNext} EXP</span>
                </div>
              </div>
              <div className="text-sm font-medium">
                <span className="text-primary">{exp}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-foreground">{next_level_exp}</span>
                <span className="text-muted-foreground ml-1">EXP</span>
              </div>
            </div>

            <div className="relative">
              <Progress
                value={progress}
                className="h-3 bg-primary/20"
              />
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                  background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)"
                }}
              />
            </div>

            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-primary rounded text-xs font-medium text-primary-foreground">
              {progress.toFixed(1)}%
            </div>
          </div>

                  {/* Achievements feature removed */}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
