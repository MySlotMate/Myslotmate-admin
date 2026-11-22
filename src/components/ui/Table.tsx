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
      className={`overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121426]/80 backdrop-blur-xl ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-white/40 select-none">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`${
                    dense ? 'px-4 py-2.5' : 'px-6 py-3.5'
                  } whitespace-nowrap font-semibold`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-white/80 font-normal">
            {children}
          </tbody>
        </table>
        {emptyMessage && React.Children.count(children) === 0 && (
          <div className="py-12 text-center text-sm text-white/45">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

