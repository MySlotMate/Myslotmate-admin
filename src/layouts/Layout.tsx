import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  globalSearch: string;
  onSearchChange: (val: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  globalSearch, 
  onSearchChange 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // The whole console uses the website's dark brand. .msm-dark also remaps
    // any older light utility classes inside pages (see index.css).
    <div className="msm-dark relative min-h-screen lg:flex">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-48 left-1/2 h-[520px] w-[620px] -translate-x-1/2 rounded-full bg-[#7B2FFF]/[0.12] blur-[150px]"
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header 
          onOpenSidebar={() => setSidebarOpen((prev) => !prev)} 
          isSidebarOpen={sidebarOpen}
          globalSearch={globalSearch}
          onSearchChange={onSearchChange}
        />
        
        <main className="px-4 py-6 sm:px-6 lg:px-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
