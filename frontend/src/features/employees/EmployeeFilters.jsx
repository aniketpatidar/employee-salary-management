import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { humanizeEnumValue } from '@/lib/format'

const ALL_VALUE = '__all__'

const DROPDOWN_FILTERS = [
  { key: 'department', label: 'Department', allLabel: 'All departments' },
  { key: 'country', label: 'Country', allLabel: 'All countries' },
  { key: 'role', label: 'Role', allLabel: 'All roles' },
  { key: 'employment_type', label: 'Employment Type', allLabel: 'All employment types' },
]

export function EmployeeFilters({ filters, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-4">
      {DROPDOWN_FILTERS.map(({ key, label, allLabel }) => (
        <FilterSelect
          key={key}
          label={label}
          allLabel={allLabel}
          value={filters[key] ?? ''}
          values={options?.[key] ?? []}
          onChange={(value) => onChange(key, value)}
        />
      ))}
      <FilterSelect
        label="Status"
        allLabel={null}
        value={filters.status || 'active'}
        values={options?.status ?? []}
        onChange={(value) => onChange('status', value)}
      />
    </div>
  )
}

function FilterSelect({ label, allLabel, value, values, onChange }) {
  const selectValue = value || ALL_VALUE

  function handleValueChange(nextValue) {
    onChange(nextValue === ALL_VALUE ? '' : nextValue)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-48" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel && <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>}
          {values.map((optionValue) => (
            <SelectItem key={optionValue} value={optionValue}>
              {humanizeEnumValue(optionValue)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
