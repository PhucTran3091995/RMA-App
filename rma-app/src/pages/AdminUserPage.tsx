import React, { useEffect, useState } from 'react';
import { Check, X, Trash2, Edit } from 'lucide-react';

const AdminUserPage = () => {
    const [users, setUsers] = useState<any[]>([]);
    
    // Fetch users
    const fetchUsers = async () => {
        const res = await fetch('/api/users'); // API lấy list user
        const data = await res.json();
        setUsers(data);
    };

    useEffect(() => { fetchUsers(); }, []);

    // Xử lý phê duyệt / reject
    const handleApproval = async (id: number, status: 'active' | 'rejected', role: string = 'user') => {
        if (!confirm(`Bạn có chắc muốn ${status === 'active' ? 'phê duyệt' : 'từ chối'}?`)) return;
        
        await fetch(`/api/users/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, role })
        });
        fetchUsers();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xóa vĩnh viễn user này?')) return;
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        fetchUsers();
    };

    const pendingUsers = users.filter(u => u.status === 'pending');
    const activeUsers = users.filter(u => u.status === 'active');

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Quản trị Thành viên</h1>

            {/* DANH SÁCH CHỜ PHÊ DUYỆT */}
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-yellow-800 mb-4">
                    Tài khoản chờ phê duyệt ({pendingUsers.length})
                </h2>
                <div className="overflow-x-auto bg-white rounded shadow">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Mã NV</th>
                                <th className="px-4 py-2 text-left">Tên hiển thị</th>
                                <th className="px-4 py-2 text-left">Bộ phận</th>
                                <th className="px-4 py-2 text-left">Ngày đăng ký</th>
                                <th className="px-4 py-2 text-left">Phân quyền dự kiến</th>
                                <th className="px-4 py-2 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(u => (
                                <tr key={u.id} className="border-t">
                                    <td className="px-4 py-2">{u.employee_no}</td>
                                    <td className="px-4 py-2">{u.display_name}</td>
                                    <td className="px-4 py-2">{u.department}</td>
                                    <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">
                                        {/* Dropdown chọn quyền khi duyệt */}
                                        <select id={`role-${u.id}`} className="border rounded p-1 text-sm">
                                            <option value="user">User (Chỉ xem)</option>
                                            <option value="sub_admin">SubAdmin (Sửa)</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                        <button 
                                            onClick={() => {
                                                const role = (document.getElementById(`role-${u.id}`) as HTMLSelectElement).value;
                                                handleApproval(u.id, 'active', role);
                                            }}
                                            className="text-green-600 hover:bg-green-100 p-1 rounded" title="Phê duyệt"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleApproval(u.id, 'rejected')}
                                            className="text-red-600 hover:bg-red-100 p-1 rounded" title="Từ chối"
                                        >
                                            <X size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pendingUsers.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-4 text-gray-500">Không có yêu cầu nào</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DANH SÁCH THÀNH VIÊN */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Danh sách thành viên</h2>
                <div className="overflow-x-auto bg-white rounded shadow">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Mã NV</th>
                                <th className="px-4 py-2 text-left">Tên hiển thị</th>
                                <th className="px-4 py-2 text-left">Bộ phận</th>
                                <th className="px-4 py-2 text-left">Quyền</th>
                                <th className="px-4 py-2 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map(u => (
                                <tr key={u.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-2">{u.employee_no}</td>
                                    <td className="px-4 py-2">{u.display_name}</td>
                                    <td className="px-4 py-2">{u.department}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                                              u.role === 'sub_admin' ? 'bg-blue-100 text-blue-800' : 
                                              'bg-gray-100 text-gray-800'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button className="text-blue-600 mr-3"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(u.id)} className="text-red-600"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUserPage;