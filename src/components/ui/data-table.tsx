
 'use client';

 import * as React from 'react';
 import {
   ColumnDef,
   flexRender,
   getCoreRowModel,
   getFilteredRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   useReactTable,
   SortingState,
   ColumnFiltersState,
 } from '@tanstack/react-table';

 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components

 interface DataTableProps<TData, TValue> {
   columns: ColumnDef<TData, TValue>[];
   data: TData[];
   filterColumn?: keyof TData;
   filterPlaceholder?: string;
   noPagination?: boolean; // Option to disable pagination controls
 }

 export function DataTable<TData, TValue>({
   columns,
   data,
   filterColumn,
   filterPlaceholder = 'Filtrar...',
   noPagination = false, // Default to showing pagination
 }: DataTableProps<TData, TValue>) {
   const [sorting, setSorting] = React.useState<SortingState>([]);
   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
   const [pagination, setPagination] = React.useState({
     pageIndex: 0,
     pageSize: noPagination ? data.length : 10, // If no pagination, show all rows
   });

   const table = useReactTable({
     data,
     columns,
     getCoreRowModel: getCoreRowModel(),
     getPaginationRowModel: noPagination ? undefined : getPaginationRowModel(), // Conditionally get model
     getSortedRowModel: getSortedRowModel(),
     getFilteredRowModel: getFilteredRowModel(),
     onSortingChange: setSorting,
     onColumnFiltersChange: setColumnFilters,
     onPaginationChange: setPagination,
     state: {
       sorting,
       columnFilters,
       pagination,
     },
   });

   const filterAccessor = filterColumn ? String(filterColumn) : '';

   return (
     <div className="space-y-2"> {/* Reduced spacing */}
        {filterColumn && (
          <div className="flex items-center py-2"> {/* Reduced padding */}
             <Input
             placeholder={filterPlaceholder}
             value={(table.getColumn(filterAccessor)?.getFilterValue() as string) ?? ''}
             onChange={(event) =>
                 table.getColumn(filterAccessor)?.setFilterValue(event.target.value)
             }
             className="max-w-full sm:max-w-sm h-9 text-sm" // Full width on mobile, height adjusted
             />
          </div>
         )}
       {/* Removed ScrollArea for mobile-first layout, rely on page scroll */}
       {/* <ScrollArea className="rounded-md border whitespace-nowrap"> */}
         <div className="rounded-md border">
            <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                    return (
                        <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }} className="p-2 text-xs h-10"> {/* Reduced padding/height */}
                        {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                            )}
                        </TableHead>
                    );
                    })}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="p-2 text-xs"> {/* Reduced padding/text size */}
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    ))}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-sm">
                    Nenhum resultado.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
         </div>
         {/* <ScrollBar orientation="horizontal" /> */}
       {/* </ScrollArea> */}

        {!noPagination && ( // Conditionally render pagination
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 py-2"> {/* Adjust spacing and layout for mobile */}
            <div className="text-xs text-muted-foreground">
                {table.getFilteredRowModel().rows.length} linha(s).
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-xs hidden sm:inline">Linhas por página:</span>
                <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                        table.setPageSize(Number(value));
                    }}
                    >
                    <SelectTrigger className="h-7 w-[60px] text-xs"> {/* Smaller select */}
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                            {pageSize}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <span className="text-xs text-muted-foreground hidden sm:inline">
                    Pág {table.getState().pagination.pageIndex + 1} de{' '}
                    {table.getPageCount()}
                </span>
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 px-2 text-xs" // Smaller button
                >
                Ant
                </Button>
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 px-2 text-xs" // Smaller button
                >
                Próx
                </Button>
            </div>
          </div>
        )}
     </div>
   );
 }
   