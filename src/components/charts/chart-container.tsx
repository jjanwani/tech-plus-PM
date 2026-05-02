interface ChartContainerProps {
  title: string
  children: React.ReactNode
  loading?: boolean
}

export function ChartContainer({ title, children, loading = false }: ChartContainerProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      ) : (
        children
      )}
    </div>
  )
}
