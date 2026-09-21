import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { humanizeEnumValue } from '@/lib/format'

const COLUMNS = ['Name', 'ID', 'Department', 'Role', 'Country', 'Employment Type', 'Status']

export function EmployeeTable({ employees, isLoading }) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading employees…</p>
  }

  if (employees.length === 0) {
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
        {employees.map((employee) => (
          <EmployeeRow key={employee.id} employee={employee} />
        ))}
      </TableBody>
    </Table>
  )
}

function EmployeeRow({ employee }) {
  return (
    <TableRow>
      <TableCell>{employee.full_name}</TableCell>
      <TableCell>{employee.id}</TableCell>
      <TableCell>{humanizeEnumValue(employee.department)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.role)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.country)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.employment_type)}</TableCell>
      <TableCell>
        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
          {humanizeEnumValue(employee.status)}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
