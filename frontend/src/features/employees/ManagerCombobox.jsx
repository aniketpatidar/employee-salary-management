import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { humanizeEnumValue } from '@/lib/format'
import { fetchManagerOptions } from './api'

export function ManagerCombobox({ value, label, excludeId, onSelect, onClear }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    fetchManagerOptions({ q: query, excludeId })
      .then((results) => {
        if (isMounted) setOptions(results)
      })
      .catch(() => {
        if (isMounted) setOptions([])
      })

    return () => {
      isMounted = false
    }
  }, [query, excludeId, isOpen])

  function handleSelect(option) {
    onSelect(option)
    setQuery('')
    setIsOpen(false)
  }

  if (value && label) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        placeholder="Search employees by name"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected="false">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                {option.full_name} — {humanizeEnumValue(option.department)}, {humanizeEnumValue(option.role)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
