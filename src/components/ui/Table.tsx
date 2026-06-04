import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '' }) => {
  return (
    <div className={`rounded-3xl border border-brand-100/80 bg-white/90 shadow-soft backdrop-blur-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-extrabold">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="px-6 py-4 font-extrabold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/90">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};
