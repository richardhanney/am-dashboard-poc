import { useContext, useMemo, useState } from 'react';
import {
  Button,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { csvRows } from './components';
import { downloadCsv } from './export';
import { ExportContext, withExportScope } from './reporting';

export default function DashboardRecords({
  title,
  rows,
  columns,
  onRow,
  toolbar = true,
  initialPageSize = 10,
}: {
  title: string;
  rows: GridValidRowModel[];
  columns: GridColDef[];
  onRow?: (row: GridValidRowModel) => void;
  toolbar?: boolean;
  initialPageSize?: number;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const scope = useContext(ExportContext);
  const display = (row: GridValidRowModel, column: GridColDef): string => {
    const value = row[column.field];
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return /^\d{4}-\d{2}-\d{2}T/.test(String(value))
      ? String(value).replace('T', ' ').replace(/Z$/, '') + ' UTC'
      : String(value);
  };
  const filtered = useMemo(() => {
    const result = rows.filter((row) =>
      columns.some((c) => display(row, c).toLowerCase().includes(search.toLowerCase())),
    );
    if (sort)
      result.sort((a, b) => {
        const av = a[sort.field],
          bv = b[sort.field];
        return (
          (typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })) *
          (sort.direction === 'asc' ? 1 : -1)
        );
      });
    return result;
  }, [rows, columns, search, sort]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const shown = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const exportPage = () => {
    const data = csvRows(shown, columns);
    const result = scope
      ? withExportScope(data, {
          ...scope,
          definition: `${title}. Displayed page only (${shown.length} rows).`,
        })
      : data;
    downloadCsv(`HULA-${title}-MOCK`, result, [
      ...new Set([
        ...columns.map((c) => c.headerName || c.field),
        ...result.flatMap((row) => Object.keys(row)),
      ]),
    ]);
  };
  return (
    <div className="dashboard-records">
      {toolbar && (
        <div className="record-toolbar">
          <TextField
            size="small"
            placeholder="Search records"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              htmlInput: { 'aria-label': `Search ${title}` },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            onClick={exportPage}
            disabled={!shown.length}
            aria-label={`Export ${title}`}
          >
            Export displayed CSV
          </Button>
        </div>
      )}
      <TableContainer sx={{ maxHeight: 380 }}>
        <Table size="small" stickyHeader aria-label={title} sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.field}
                  sortDirection={sort?.field === c.field ? sort.direction : false}
                >
                  <TableSortLabel
                    active={sort?.field === c.field}
                    direction={sort?.field === c.field ? sort.direction : 'asc'}
                    onClick={() => {
                      setSort({
                        field: c.field,
                        direction:
                          sort?.field === c.field && sort.direction === 'asc' ? 'desc' : 'asc',
                      });
                      setPage(0);
                    }}
                  >
                    {c.headerName || c.field}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((row, i) => (
              <TableRow hover key={String(row.id ?? i)}>
                {columns.map((c, index) => (
                  <TableCell key={c.field}>
                    {index === 0 && onRow ? (
                      <Button variant="text" className="record-link" onClick={() => onRow(row)}>
                        {display(row, c)}
                      </Button>
                    ) : (
                      display(row, c)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No matching records.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filtered.length}
        page={currentPage}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, value) => setPage(value)}
        onRowsPerPageChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(0);
        }}
      />
      {toolbar && (
        <Typography variant="caption" color="text.secondary">
          Fictional records · CSV exports the displayed page only.
        </Typography>
      )}
    </div>
  );
}
