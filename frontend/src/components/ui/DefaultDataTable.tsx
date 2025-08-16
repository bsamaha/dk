import { DataTable, type DataTableColumn, type DataTableProps } from 'mantine-datatable';

type DefaultDataTableProps<T> = {
  records: T[];
  columns: DataTableColumn<T>[];
  page?: number;
  totalRecords?: number;
  recordsPerPage?: number;
  onPageChange?: (page: number) => void;
  emptyState?: string;
};

export default function DefaultDataTable<T>({
  records,
  columns,
  page = 1,
  totalRecords,
  recordsPerPage = 20,
  onPageChange,
  emptyState = 'No data to display',
}: DefaultDataTableProps<T>) {
  // If no handler passed, provide a no-op to satisfy type
  const handlePageChange: NonNullable<DataTableProps<T>['onPageChange']> =
    onPageChange ?? (() => {});
  return (
    <DataTable
      withTableBorder
      withColumnBorders={false}
      highlightOnHover
      striped
      minHeight={200}
      pinLastColumn
      records={records}
      columns={columns}
      page={page}
      totalRecords={totalRecords}
      recordsPerPage={recordsPerPage}
      onPageChange={handlePageChange}
      noRecordsText={emptyState}
    />
  );
}
