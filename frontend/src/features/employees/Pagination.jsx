import { Button } from '@/components/ui/button'

export function Pagination({ page, perPage, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, totalCount)

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {totalCount === 0 ? 'No employees' : `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
