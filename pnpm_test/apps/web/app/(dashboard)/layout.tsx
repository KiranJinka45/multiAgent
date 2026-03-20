import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/10 dark:bg-black/20">
          {children}
        </main>

        {/* Global Footer / Status Overlay if needed */}
      </div>
    </div>
  );
}
