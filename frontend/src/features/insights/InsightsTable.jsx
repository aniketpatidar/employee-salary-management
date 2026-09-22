import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney, humanizeEnumValue } from '@/lib/format'

const COLUMNS = ['Group', 'Currency', 'Employees', 'Average annual salary', 'Median annual salary']

export function InsightsTable({ groups }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees match the current filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((row) => (
          <InsightRow key={`${row.group}-${row.currency}`} row={row} />
        ))}
      </TableBody>
    </Table>
  )
}

function InsightRow({ row }) {
  return (
    <TableRow>
      <TableCell>{humanizeEnumValue(row.group)}</TableCell>
      <TableCell>{row.currency.toUpperCase()}</TableCell>
      <TableCell>{row.count}</TableCell>
      <TableCell>{formatMoney(row.average, row.currency)}</TableCell>
      <TableCell>{formatMoney(row.median, row.currency)}</TableCell>
    </TableRow>
  )
}
