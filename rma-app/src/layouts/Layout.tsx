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
      label: 'Danh sách hàng RMA', 
      icon: ClipboardList, 
      roles: ['admin', 'sub_admin', 'user'] 
    },
    // 3. Loans: Ai cũng xem được (nhưng quyền sửa xóa sẽ chặn bên trong trang)
    { 
      path: '/loans', 
      label: 'Loans - Mượn/ Trả hàng', 
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
      label: 'Upload - Cost', 
      icon: Database, 
      roles: ['admin', 'sub_admin'] 
    },
    // 6. Quản trị User: CHỈ ADMIN
    { 
      path: '/users', 
      label: 'Admin Panel', 
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
    <div className="flex h-screen bg-gray-50"> {/* Đổi nền tổng thể sang xám nhạt */}
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <span className="font-bold text-xl text-blue-700">RMA System</span> {/* Chữ xanh */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={clsx(
          // Đổi bg-blue-900 -> bg-white, thêm border phải
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 text-gray-600 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          {/* Đổi bg-blue-950 -> bg-white */}
          <div className="flex items-center justify-center h-16 border-b border-gray-100 bg-white">
            <h1 className="text-xl font-bold tracking-wider text-blue-800">RMA APP</h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems
              // LỌC MENU DỰA TRÊN ROLE (Giữ nguyên logic)
              .filter(item => user?.role && item.roles.includes(user.role))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={({ isActive }) =>
                    clsx(
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold' // Active: Nền xanh nhạt, chữ xanh đậm
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900', // Inactive: Chữ xám, hover xám nhạt
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors'
                    )
                  }
                >
                  <item.icon className={clsx("mr-3 h-5 w-5 flex-shrink-0 transition-colors")} aria-hidden="true" />
                  {item.label}
                </NavLink>
            ))}
          </nav>

          {/* User Profile Section */}
          {/* Đổi bg-blue-950 -> bg-gray-50/50 */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center mb-4">
              {/* Avatar: Xanh nhạt */}
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                  {user?.name || 'User'}
                </p>
                <span className={clsx(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
                  getRoleBadgeColor(user?.role) // Giữ nguyên hàm này
                )}>
                  {user?.role?.toUpperCase() || 'GUEST'}
                </span>
              </div>
            </div>
            
            {/* Nút Logout: Đổi sang nền đỏ nhạt */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
      <main className="flex-1 overflow-auto md:pt-0 pt-16 bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;