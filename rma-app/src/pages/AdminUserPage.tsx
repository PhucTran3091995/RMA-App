import React, { useEffect, useState } from 'react';
import { 
  fetchMasterUsers, 
  updateUserStatus, 
  resetUserPassword // 1. Import hàm reset
} from '../api/rmaApi';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  RotateCcw // 2. Import Icon Reset
} from 'lucide-react';
import clsx from 'clsx';

// Interface định nghĩa kiểu dữ liệu User
interface User {
  id: number;
  employee_no: string;
  display_name: string;
  role: string;      // admin, user, sub_admin
  status: string;    // active, pending, locked
  created_at: string;
  department?: string; // Tên bộ phận
}

const AdminUserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load danh sách user khi vào trang
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchMasterUsers();
      // data trả về là mảng User[]
      setUsers(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Xử lý Duyệt (Active)
  const handleApprove = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn DUYỆT tài khoản này?')) return;
    try {
      await updateUserStatus(id, 'active');
      alert('Đã duyệt thành công!');
      loadUsers(); // Reload lại bảng
    } catch (err) {
      alert('Lỗi khi duyệt user');
    }
  };

  // Xử lý Khóa (Lock)
  const handleLock = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn KHÓA tài khoản này?')) return;
    try {
      await updateUserStatus(id, 'locked');
      alert('Đã khóa tài khoản!');
      loadUsers();
    } catch (err) {
      alert('Lỗi khi khóa user');
    }
  };

  // 3. Hàm xử lý Reset Mật khẩu
  const handleResetPassword = async (userId: number, userName: string) => {
      if (!window.confirm(`⚠️ CẢNH BÁO:\nBạn có chắc muốn reset mật khẩu của "${userName}" về mặc định "123456" không?`)) {
          return;
      }

      try {
          await resetUserPassword(userId);
          alert(`✅ Thành công!\nMật khẩu của user ${userName} đã được đưa về: 123456`);
      } catch (err: any) {
          console.error(err);
          alert('❌ Lỗi: Không thể reset mật khẩu. Vui lòng kiểm tra server.');
      }
  };

  // Helper để hiển thị Role đẹp hơn
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
      case 'sub_admin':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Sub Admin</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">User</span>;
    }
  };

  // Helper hiển thị Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center text-green-600 text-sm font-medium">
            <CheckCircle size={16} className="mr-1" /> Active
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center text-yellow-600 text-sm font-medium">
            <ShieldAlert size={16} className="mr-1" /> Chờ duyệt
          </span>
        );
      case 'locked':
        return (
          <span className="flex items-center text-red-600 text-sm font-medium">
            <XCircle size={16} className="mr-1" /> Locked
          </span>
        );
      default:
        return status;
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-blue-600" />
            Quản trị User
          </h1>
          <p className="text-gray-500 mt-1">Quản lý danh sách nhân viên và phân quyền truy cập</p>
        </div>
        <button 
            onClick={loadUsers}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
            Làm mới
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bộ phận</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quyền (Role)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  #{user.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{user.display_name || 'No Name'}</span>
                    <span className="text-xs text-gray-500">{user.employee_no}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                   {/* Hiển thị bộ phận, nếu không có thì hiện gạch ngang */}
                   {user.department || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    
                    {/* Nút Approve (Chỉ hiện khi pending) */}
                    {user.status === 'pending' && (
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="text-green-600 hover:text-green-900 flex items-center"
                        title="Duyệt tài khoản"
                      >
                        <UserCheck size={18} />
                      </button>
                    )}

                    {/* Nút Reset Password (Mới thêm) */}
                    <button 
                        onClick={() => handleResetPassword(user.id, user.display_name)}
                        className="text-orange-500 hover:text-orange-700 flex items-center"
                        title="Reset mật khẩu về 123456"
                    >
                        <RotateCcw size={18} />
                    </button>

                    {/* Nút Khóa (Hiện khi active) */}
                    {user.status === 'active' && user.role !== 'admin' && (
                      <button 
                        onClick={() => handleLock(user.id)}
                        className="text-yellow-600 hover:text-yellow-900 flex items-center"
                        title="Khóa tài khoản"
                      >
                        <UserX size={18} />
                      </button>
                    )}

                    {/* Nút Xóa (Demo) */}
                    <button className="text-gray-400 hover:text-red-600 transition-colors" title="Xóa vĩnh viễn">
                      <Trash2 size={18} />
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserPage;