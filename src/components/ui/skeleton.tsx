import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("loading-shimmer rounded-lg bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
