import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // 1. Import trang đăng ký
import DashboardPage from './pages/DashboardPage';
import RmaListPage from './pages/RmaListPage';
import RmaFormPage from './pages/RmaFormPage';
import MasterDataPage from './pages/MasterDataPage';
import AdminUserPage from './pages/AdminUserPage'; // 2. Import trang quản trị user
import Layout from './layouts/Layout';
import { ProtectedRoute, AdminOnlyRoute } from './components/AuthGuard';
import ClearancePage from './pages/ClearancePage';
import LoanPage from './pages/LoanPage'; 

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} /> {/* 3. Thêm Route Đăng ký */}

                {/* Protected Routes (Cần đăng nhập) */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/rmas" element={<RmaListPage />} />
                        <Route path="/rmas/new" element={<RmaFormPage />} />
                        <Route path="/rmas/:id" element={<RmaFormPage />} />
                        
                        <Route path="/loans" element={<LoanPage />} />
                        
                        <Route path="/clearance" element={<ClearancePage />} />
                        
                        {/* Admin Routes (Chỉ Admin mới vào được) */}
                        <Route element={<AdminOnlyRoute />}>
                            <Route path="/master-data" element={<MasterDataPage />} />
                            <Route path="/users" element={<AdminUserPage />} /> {/* 4. Thêm Route User */}
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;