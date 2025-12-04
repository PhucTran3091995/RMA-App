import React, { useEffect, useState } from 'react';
import { 
  fetchMasterUsers, 
  updateUserStatus, 
  resetUserPassword,
  deleteUser,      // [Mới] Import hàm xóa
  updateUserRole   // [Mới] Import hàm update role
} from '../api/rmaApi';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  RotateCcw 
} from 'lucide-react';

interface User {
  id: number;
  employee_no: string;
  display_name: string;
  role: string;      
  status: string;    
  created_at: string;
  department?: string; 
}

const AdminUserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchMasterUsers();
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

  const handleApprove = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn DUYỆT tài khoản này?')) return;
    try {
      await updateUserStatus(id, 'active');
      alert('Đã duyệt thành công!');
      loadUsers();
    } catch (err) {
      alert('Lỗi khi duyệt user');
    }
  };

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

  const handleResetPassword = async (userId: number, userName: string) => {
      if (!window.confirm(`⚠️ CẢNH BÁO:\nBạn có chắc muốn reset mật khẩu của "${userName}" về mặc định "123456" không?`)) return;
      try {
          await resetUserPassword(userId);
          alert(`✅ Thành công!\nMật khẩu của user ${userName} đã được đưa về: 123456`);
      } catch (err: any) {
          console.error(err);
          alert('❌ Lỗi: Không thể reset mật khẩu.');
      }
  };

  // --- [LOGIC MỚI] Xử lý Xóa User ---
  const handleDelete = async (userId: number, userName: string) => {
    const confirmMsg = `⛔️ CẢNH BÁO NGUY HIỂM:\n\nBạn đang chuẩn bị XÓA VĨNH VIỄN tài khoản "${userName}".\nHành động này không thể hoàn tác.\n\nBạn có chắc chắn muốn tiếp tục?`;
    if (!window.confirm(confirmMsg)) return;

    try {
        await deleteUser(userId);
        alert(`✅ Đã xóa user "${userName}" thành công.`);
        // Cập nhật lại state trực tiếp để đỡ phải load lại API
        setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
        console.error(err);
        alert('❌ Lỗi: Không thể xóa user (Có thể user đang liên kết với dữ liệu RMA).');
    }
  };

  // --- [LOGIC MỚI] Xử lý Thay đổi Role ---
  const handleRoleChange = async (userId: number, newRole: string) => {
      // Cập nhật Optimistic UI (cập nhật giao diện ngay lập tức)
      const oldUsers = [...users];
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

      try {
          await updateUserRole(userId, newRole);
          // Không cần alert làm phiền nếu thành công, chỉ log
          console.log(`Updated user ${userId} to role ${newRole}`);
      } catch (err) {
          alert('Lỗi khi cập nhật quyền. Đang hoàn tác...');
          setUsers(oldUsers); // Revert lại nếu lỗi
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="flex items-center text-green-600 text-sm font-medium"><CheckCircle size={16} className="mr-1" /> Active</span>;
      case 'pending':
        return <span className="flex items-center text-yellow-600 text-sm font-medium"><ShieldAlert size={16} className="mr-1" /> Chờ duyệt</span>;
      case 'locked':
        return <span className="flex items-center text-red-600 text-sm font-medium"><XCircle size={16} className="mr-1" /> Locked</span>;
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
            Confirm Users Admin Panel
          </h1>
          <p className="text-gray-500 mt-1">Quản lý nhân viên, phân quyền và trạng thái hoạt động</p>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{user.display_name || 'No Name'}</span>
                    <span className="text-xs text-gray-500">{user.employee_no}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                   {user.department || '-'}
                </td>
                
                {/* --- [THAY ĐỔI] Cột Role chuyển thành Dropdown --- */}
                <td className="px-6 py-4 whitespace-nowrap">
                    <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium
                            ${user.role === 'admin' ? 'text-purple-700 bg-purple-50' : 
                              user.role === 'sub_admin' ? 'text-blue-700 bg-blue-50' : 'text-gray-700'}
                        `}
                    >
                        <option value="user">User</option>
                        <option value="sub_admin">Sub Admin</option>
                        <option value="admin">Admin</option>
                    </select>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    
                    {user.status === 'pending' && (
                      <button onClick={() => handleApprove(user.id)} className="text-green-600 hover:text-green-900" title="Duyệt">
                        <UserCheck size={18} />
                      </button>
                    )}

                    <button onClick={() => handleResetPassword(user.id, user.display_name)} className="text-orange-500 hover:text-orange-700" title="Reset Pass">
                        <RotateCcw size={18} />
                    </button>

                    {user.status === 'active' && user.role !== 'admin' && (
                      <button onClick={() => handleLock(user.id)} className="text-yellow-600 hover:text-yellow-900" title="Khóa">
                        <UserX size={18} />
                      </button>
                    )}

                    {/* --- [THAY ĐỔI] Nút Xóa đã có logic --- */}
                    <button 
                        onClick={() => handleDelete(user.id, user.display_name)}
                        className="text-gray-400 hover:text-red-600 transition-colors" 
                        title="Xóa vĩnh viễn"
                    >
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