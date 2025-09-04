import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VideoPlayer } from "./VideoPlayer"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  animeId: string
  title: string
  totalEpisodes: number
  imageUrl?: string
}

export function VideoModal({
  isOpen,
  onClose,
  animeId,
  title,
  totalEpisodes,
  imageUrl
}: VideoModalProps) {
  const isMobile = useIsMobile()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-6xl",
        isMobile && "h-[100dvh] p-0 max-h-none"
      )}>
        <DialogTitle className="sr-only">
          {`Смотреть ${title}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {`Просмотр аниме ${title}, всего серий: ${totalEpisodes}`}
        </DialogDescription>
  <VideoPlayer
          animeId={animeId}
          title={title}
          totalEpisodes={totalEpisodes}
          imageUrl={imageUrl}
        />
      </DialogContent>
    </Dialog>
  )
}
