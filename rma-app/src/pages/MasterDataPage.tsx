import React, { useState, useRef } from 'react';
import {
    Package,
    Users,
    AlertOctagon,
    Plus,
    Edit2,
    Trash2,
    X,
    UploadCloud, // Icon cho nút Import
    FileText,    // Icon cho Log
    CheckCircle, // Icon thành công
    AlertCircle  // Icon lỗi
} from 'lucide-react';
import { clsx } from 'clsx';
import { importItemCosts } from "../api/rmaApi"; // Import hàm API vừa tạo

// ... (Giữ nguyên các Interface và Mock Data cũ) ...

const MasterDataPage = () => {
    // ... (Giữ nguyên các state cũ: activeTab, isModalOpen...) ...
    const [activeTab, setActiveTab] = useState('items'); // Giả sử mặc định là items
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- STATE MỚI CHO TÍNH NĂNG IMPORT ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importLogs, setImportLogs] = useState<string[]>([]);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Hàm kích hoạt click vào input file ẩn
    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    // Hàm xử lý khi chọn file
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportLogs(['Starting upload process...', `Reading file: ${file.name}`]);
        setImportStatus('idle');

        try {
            // Gọi API upload
            const result = await importItemCosts(file);
            
            if (result.success) {
                setImportStatus('success');
                // Kết hợp log cũ và log từ server trả về
                setImportLogs(prev => [
                    ...prev, 
                    'Upload to server successful.', 
                    'Processing database updates...', 
                    ...result.logs, 
                    '✅ DONE: Prices updated in Items and RMA Boards.'
                ]);
            } else {
                setImportStatus('error');
                setImportLogs(prev => [...prev, `❌ Server Error: ${result.message}`]);
            }
        } catch (error: any) {
            setImportStatus('error');
            setImportLogs(prev => [...prev, `❌ Network/Client Error: ${error.message || 'Unknown error'}`]);
        } finally {
            setIsImporting(false);
            // Reset input để có thể chọn lại cùng 1 file nếu muốn
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ... (Các hàm renderTable cũ giữ nguyên) ...

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header và Tabs - Giữ nguyên logic cũ */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Master Data Management</h1>
                
                {/* Tab Buttons */}
                <div className="flex space-x-4 border-b border-gray-200">
                     {/* ... Code nút tab Item, Customer, FaultCodes cũ ... */}
                    <button
                        className={clsx(
                            "px-4 py-2 font-medium text-sm focus:outline-none",
                            activeTab === 'items' ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('items')}
                    >
                        Items & Costs
                    </button>
                    {/* ... các tab khác ... */}
                </div>
            </div>

            {/* Actions Bar (Nút Thêm và Nút Import) */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative">
                    {/* Search box code cũ */}
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex space-x-3">
                    {/* --- NÚT IMPORT ITEM COST (MỚI) --- */}
                    {activeTab === 'items' && (
                        <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            />
                            <button
                                onClick={triggerFileUpload}
                                disabled={isImporting}
                                className={`flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                                    isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                <UploadCloud className="h-4 w-4 mr-2" />
                                {isImporting ? 'Importing...' : 'Import Cost (Excel)'}
                            </button>
                        </>
                    )}

                    {/* Nút Add Item cũ */}
                    <button
                        onClick={() => {/* logic mở modal cũ */}}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                    </button>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                 {/* Logic render bảng dữ liệu cũ */}
                 {/* {activeTab === 'items' && renderItemsTable()} */}
                 {/* {activeTab === 'customers' && renderCustomersTable()} */}
                 <div className="p-4 text-center text-gray-500">
                    (Table content goes here based on Active Tab)
                 </div>
            </div>

            {/* --- KHUNG LOG FILE REPORT (MỚI) --- */}
            {/* Chỉ hiện khi có log */}
            {importLogs.length > 0 && (
                <div className="mt-6 bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <div className="flex items-center text-gray-300">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="font-mono text-sm font-bold">Import Process Log</span>
                        </div>
                        <div className="flex items-center">
                            {importStatus === 'success' && <span className="flex items-center text-green-400 text-xs font-bold mr-2"><CheckCircle className="h-3 w-3 mr-1"/> SUCCESS</span>}
                            {importStatus === 'error' && <span className="flex items-center text-red-400 text-xs font-bold mr-2"><AlertCircle className="h-3 w-3 mr-1"/> FAILED</span>}
                            <button onClick={() => setImportLogs([])} className="text-gray-400 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto bg-black font-mono text-xs text-green-400 space-y-1">
                        {importLogs.map((log, index) => (
                            <div key={index} className={clsx(
                                "border-l-2 pl-2",
                                log.includes('❌') ? "border-red-500 text-red-400" : 
                                log.includes('✅') ? "border-green-500 text-green-300" : "border-gray-700"
                            )}>
                                <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isModalOpen && <div>{/* Modal Component */}</div>}
        </div>
    );
};

export default MasterDataPage;