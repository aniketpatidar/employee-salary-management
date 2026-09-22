import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BREAKDOWN_OPTIONS = [
  { value: 'department', label: 'Department' },
  { value: 'country', label: 'Country' },
  { value: 'role', label: 'Role' },
]

export function BreakdownSelect({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">Breakdown</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48" aria-label="Breakdown">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BREAKDOWN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
