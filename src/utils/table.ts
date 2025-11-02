import type { DataTableColumn } from 'mantine-datatable';

/**
 * Configuration for column visibility based on screen width
 */
export type ColumnVisibilityConfig = {
  minWidth: number;
  priority: number;
};

/**
 * Compare two records for sorting purposes
 * Handles null/undefined values and both string and number comparisons
 */
export function compareRecords<T, K extends keyof T>(a: T, b: T, key: K): number {
  const valueA = a[key];
  const valueB = b[key];

  if (valueA === valueB) {
    return 0;
  }

  if (valueA === null || valueA === undefined) {
    return 1;
  }

  if (valueB === null || valueB === undefined) {
    return -1;
  }

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  return String(valueA).localeCompare(String(valueB));
}

/**
 * Create responsive columns based on container width
 * Columns with priority 0 are always shown, others are shown based on available space
 */
export function createResponsiveColumns<T>(
  columns: DataTableColumn<T>[],
  containerWidth: number,
  columnVisibilityConfig: Record<string, ColumnVisibilityConfig>
): DataTableColumn<T>[] {
  const measuredWidth = containerWidth ? Math.max(containerWidth - 48, 0) : Number.POSITIVE_INFINITY;

  const columnEntries = columns.map((column, index) => {
    const accessorKey = String(column.accessor);
    const config = columnVisibilityConfig[accessorKey] ?? { minWidth: 160, priority: 3 };
    return {
      column,
      index,
      accessorKey,
      ...config,
    };
  });

  const sortedByPriority = columnEntries
    .slice()
    .sort((a, b) => (a.priority === b.priority ? a.index - b.index : a.priority - b.priority));

  const visibleColumnIndices = new Set<number>();
  let usedWidth = 0;

  // First pass: add all priority 0 columns
  sortedByPriority.forEach((entry) => {
    if (entry.priority === 0) {
      visibleColumnIndices.add(entry.index);
      usedWidth += entry.minWidth;
    }
  });

  // Second pass: add remaining columns that fit
  sortedByPriority.forEach((entry) => {
    if (visibleColumnIndices.has(entry.index)) {
      return;
    }
    if (usedWidth + entry.minWidth <= measuredWidth) {
      visibleColumnIndices.add(entry.index);
      usedWidth += entry.minWidth;
    }
  });

  return columnEntries.map(({ column, index }) => ({
    ...column,
    hidden: !visibleColumnIndices.has(index),
  }));
}
