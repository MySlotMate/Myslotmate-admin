import React from 'react';

export interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  dense?: boolean;
}

export const Table: React.FC<TableProps> = ({
  headers,
  children,
  className = '',
  emptyMessage,
  dense = false,
}) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`${
                    dense ? 'px-4 py-2.5' : 'px-6 py-3.5'
                  } whitespace-nowrap font-bold text-slate-500`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
            {children}
          </tbody>
        </table>
        {emptyMessage && React.Children.count(children) === 0 && (
          <div className="py-12 text-center text-sm font-medium text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

