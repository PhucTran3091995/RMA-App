import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Nhập mã NV, 2: Nhập thông tin bổ sung
    const [empCode, setEmpCode] = useState('');
    const [empInfo, setEmpInfo] = useState<any>(null);
    const [formData, setFormData] = useState({ displayName: '', password: '' });
    const [error, setError] = useState('');

    const handleCheckEmployee = async () => {
        try {
            // Gọi API check-employee đã viết ở trên
            const res = await fetch(`/api/auth/check-employee/${empCode}`);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message);
            
            setEmpInfo(data);
            setFormData({ ...formData, displayName: data.full_name }); // Mặc định tên hiển thị là full name
            setStep(2);
            setError('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_no: empInfo.employee_no,
                    display_name: formData.displayName,
                    password: formData.password,
                    department_id: empInfo.department_id
                })
            });
            
            if (!res.ok) throw new Error('Đăng ký thất bại');
            
            alert('Đăng ký thành công! Vui lòng chờ phê duyệt.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white shadow rounded">
                <h2 className="text-center text-2xl font-bold">Đăng ký tài khoản</h2>
                
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                {step === 1 ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Mã nhân viên</label>
                            <input 
                                type="text" 
                                value={empCode}
                                onChange={(e) => setEmpCode(e.target.value)}
                                className="w-full border p-2 rounded"
                                placeholder="Nhập mã nhân viên..."
                            />
                        </div>
                        <button 
                            onClick={handleCheckEmployee}
                            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                        >
                            Kiểm tra
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="bg-gray-100 p-3 rounded text-sm">
                            <p><strong>Mã NV:</strong> {empInfo.employee_no}</p>
                            <p><strong>Họ tên:</strong> {empInfo.full_name}</p>
                            <p><strong>Bộ phận:</strong> {empInfo.department_name}</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium">Tên hiển thị (Tuỳ biến)</label>
                            <input 
                                type="text" 
                                value={formData.displayName}
                                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium">Mật khẩu</label>
                            <input 
                                type="password" 
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full border p-2 rounded"
                                required
                            />
                        </div>

                        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                            Xác nhận đăng ký
                        </button>
                        <button onClick={() => setStep(1)} type="button" className="w-full text-gray-500 text-sm">
                            Quay lại
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RegisterPage;