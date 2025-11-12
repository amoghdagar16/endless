interface TableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export default function Table({ headers, rows, emptyMessage = "No data available", emptyIcon }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
        <thead className="bg-gray-50 dark:bg-neutral-800">
          <tr>
            {headers.map((header, idx) => (
              <th 
                key={idx}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  {emptyIcon && <div className="text-gray-300 dark:text-gray-700">{emptyIcon}</div>}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr 
                key={rowIdx}
                className={`
                  hover:bg-gray-50 dark:hover:bg-neutral-800/70 transition-colors
                  ${rowIdx % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50/50 dark:bg-neutral-800/30'}
                `}
              >
                {row.map((cell, cellIdx) => (
                  <td 
                    key={cellIdx} 
                    className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
                  >
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
