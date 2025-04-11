import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

function MoveHistoryTable({ moves }) {
  const tableRef = useRef(null);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [moves]);

  const moveRows = moves.reduce((rows, move, index) => {
    if (index % 2 === 0) {
      rows.push([move]);
    } else {
      rows[rows.length - 1].push(move);
    }
    return rows;
  }, []);

  return (
    <div 
      ref={tableRef}
      className="max-h-60 overflow-y-auto border rounded shadow-inner bg-white"
    >
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-4 py-2 text-left text-gray-600 font-semibold">#</th>
            <th className="px-4 py-2 text-left text-gray-600 font-semibold">White</th>
            <th className="px-4 py-2 text-left text-gray-600 font-semibold">Black</th>
          </tr>
        </thead>
        <tbody>
          {moveRows.map((row, i) => (
            <tr 
              key={i} 
              className={`border-t hover:bg-gray-50 transition-colors ${
                i === Math.floor((moves.length - 1) / 2) ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-4 py-2 text-gray-500">{i + 1}</td>
              <td className="px-4 py-2 font-mono">
                {row[0]?.san && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block w-full"
                  >
                    {row[0].san}
                  </motion.span>
                )}
              </td>
              <td className="px-4 py-2 font-mono">
                {row[1]?.san && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block w-full"
                  >
                    {row[1].san}
                  </motion.span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MoveHistoryTable;