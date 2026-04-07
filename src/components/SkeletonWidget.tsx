// ─── SkeletonWidget ───────────────────────────────────────────────────────────
// Animated skeleton placeholder shown while dashboard widgets are loading.

export default function SkeletonWidget() {
  return (
    <div className="
      bg-gray-900/80 border border-gray-800 rounded-2xl
      flex flex-col min-h-[160px] overflow-hidden animate-pulse
    ">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/70">
        <div className="w-3 h-3 rounded bg-gray-700 skeleton-shimmer" />
        <div className="flex-1 h-3 rounded bg-gray-700 skeleton-shimmer" />
        <div className="w-3 h-3 rounded bg-gray-700 skeleton-shimmer" />
      </div>

      {/* Content lines */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="h-3 rounded bg-gray-800 w-3/4 skeleton-shimmer" />
        <div className="h-3 rounded bg-gray-800 w-1/2 skeleton-shimmer" />
        <div className="h-3 rounded bg-gray-800 w-5/6 skeleton-shimmer" />
        <div className="h-3 rounded bg-gray-800 w-2/3 skeleton-shimmer" />
      </div>
    </div>
  )
}
