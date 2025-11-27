import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RmaListPage from './pages/RmaListPage';
import RmaFormPage from './pages/RmaFormPage';
import MasterDataPage from './pages/MasterDataPage';
import Layout from './layouts/Layout';
import { ProtectedRoute, AdminOnlyRoute } from './components/AuthGuard';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/rmas" element={<RmaListPage />} />
                        <Route path="/rmas/new" element={<RmaFormPage />} />
                        <Route path="/rmas/:id" element={<RmaFormPage />} />

                        <Route element={<AdminOnlyRoute />}>
                            <Route path="/master-data" element={<MasterDataPage />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;