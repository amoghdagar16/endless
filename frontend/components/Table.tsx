interface TableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export default function Table({ headers, rows, emptyMessage = "No data available", emptyIcon }: TableProps) {
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="table">
        <thead>
          <tr>
            {headers.map((header, idx) => (
              <th key={idx}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  {emptyIcon && <div className="text-gray-300 dark:text-gray-700">{emptyIcon}</div>}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="max-w-xs truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
