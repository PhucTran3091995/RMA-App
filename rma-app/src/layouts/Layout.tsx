import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Database, 
  LogOut, 
  Menu,
  X,
  CheckSquare,
  ArrowRightLeft,
  Users // Icon mới cho trang Quản trị User
} from 'lucide-react';
import clsx from 'clsx';

const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Định nghĩa menu với quyền truy cập (roles)
  const navItems = [
    // 1. Dashboard: Ai cũng xem được
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['admin', 'sub_admin', 'user'] 
    },
    // 2. RMA List: Ai cũng xem được
    { 
      path: '/rmas', 
      label: 'RMA list', 
      icon: ClipboardList, 
      roles: ['admin', 'sub_admin', 'user'] 
    },
    // 3. Loans: Ai cũng xem được (nhưng quyền sửa xóa sẽ chặn bên trong trang)
    { 
      path: '/loans', 
      label: 'Loans', 
      icon: ArrowRightLeft, 
      roles: ['admin', 'sub_admin', 'user'] 
    },
    // 4. Clear Hàng: Chỉ Admin và SubAdmin
    { 
      path: '/clearance', 
      label: 'Clear Hàng', 
      icon: CheckSquare, 
      roles: ['admin', 'sub_admin'] 
    },
    // 5. Master Data: Chỉ Admin và SubAdmin
    { 
      path: '/master-data', 
      label: 'Master Data', 
      icon: Database, 
      roles: ['admin', 'sub_admin'] 
    },
    // 6. Quản trị User: CHỈ ADMIN
    { 
      path: '/users', 
      label: 'Quản trị User', 
      icon: Users, 
      roles: ['admin'] 
    },
  ];

  // Helper để lấy màu badge cho Role
  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'sub_admin': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800'; // user
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-2 flex items-center justify-between">
        <span className="font-bold text-xl text-blue-900">RMA System</span>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="flex items-center justify-center h-16 border-b border-blue-800 bg-blue-950">
            <h1 className="text-xl font-bold tracking-wider">RMA APP</h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems
              // LỌC MENU DỰA TRÊN ROLE
              .filter(item => user?.role && item.roles.includes(user.role))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)} // Đóng menu mobile khi click
                  className={({ isActive }) =>
                    clsx(
                      isActive
                        ? 'bg-blue-800 text-white'
                        : 'text-blue-100 hover:bg-blue-800 hover:text-white',
                      'group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors'
                    )
                  }
                >
                  <item.icon className="mr-4 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-blue-800 p-4 bg-blue-950">
            <div className="flex items-center mb-4">
              <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white truncate max-w-[140px]">
                  {user?.name || 'User'}
                </p>
                <span className={clsx(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
                  getRoleBadgeColor(user?.role)
                )}>
                  {user?.role?.toUpperCase() || 'GUEST'}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;