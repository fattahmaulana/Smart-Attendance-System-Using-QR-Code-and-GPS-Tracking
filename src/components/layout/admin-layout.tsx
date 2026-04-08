import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/students', label: 'Data Siswa', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#09090B] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-[#E4E4E7] flex flex-col">
        <div className="p-8 border-b border-[#E4E4E7]">
          <h1 className="text-2xl font-bold tracking-tight text-[#09090B]">
            QR Presensi
          </h1>
          <p className="text-sm font-medium text-[#71717A] mt-1">SMA Negeri 1 Ambarawa</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200 ${
                  isActive 
                    ? 'bg-[#09090B] text-white font-medium' 
                    : 'text-[#71717A] hover:bg-[#F9FAFB] hover:text-[#09090B] font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[#E4E4E7]">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-[#71717A] hover:text-[#09090B] hover:bg-[#F9FAFB] font-medium rounded-md"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
