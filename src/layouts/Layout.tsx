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
    <div className="min-h-screen lg:flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 min-w-0 flex flex-col">
        <Header 
          onOpenSidebar={() => setSidebarOpen(true)} 
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
