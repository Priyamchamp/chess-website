import React from 'react';

function MoveHistory({ moves }) {
  const moveRows = moves.reduce((rows, move, index) => {
    if (index % 2 === 0) {
      rows.push([move]);
    } else {
      rows[rows.length - 1].push(move);
    }
    return rows;
  }, []);

  return (
    <div className="max-h-60 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">White</th>
            <th className="px-4 py-2 text-left">Black</th>
          </tr>
        </thead>
        <tbody>
          {moveRows.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{i + 1}</td>
              <td className="px-4 py-2 font-mono">{row[0]?.san}</td>
              <td className="px-4 py-2 font-mono">{row[1]?.san}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MoveHistory;