import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, User, UserPlus } from 'lucide-react'; // Thêm icon UserPlus

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();

    const [employeeNo, setEmployeeNo] = useState(''); // Sửa từ email thành employeeNo cho đúng logic mới
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_no: employeeNo, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Đăng nhập thất bại');
            }

            // [FIX] Backend không trả về email, nhưng type User yêu cầu email.
            // Ta thêm email rỗng hoặc lấy từ data nếu có để tránh lỗi TS nếu strict mode bật.
            const userWithEmail = {
                ...data.user,
                email: data.user.email || "" // Thêm dòng này để thỏa mãn type User
            };

            // Lưu vào LocalStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(userWithEmail));

            // Cập nhật State
            login(userWithEmail, data.token);
            navigate('/');
            
        } catch (err: any) {
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    RMA SYSTEM
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Đăng nhập website quản lý RMA
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="employeeNo" className="block text-sm font-medium text-gray-700">
                                Mã nhân viên
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="employeeNo"
                                    name="employeeNo"
                                    type="text"
                                    required
                                    value={employeeNo}
                                    onChange={(e) => setEmployeeNo(e.target.value)}
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="Nhập mã nhân viên..."
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Mật khẩu
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                            >
                                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                            </button>
                        </div>
                    </form>

                    {/* Phần thêm nút Đăng ký */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Nhân viên mới?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <UserPlus className="h-4 w-4 mr-2 text-gray-500" />
                                Đăng ký tài khoản mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;