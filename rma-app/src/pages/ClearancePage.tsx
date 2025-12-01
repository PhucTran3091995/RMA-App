import React, { useState, useRef } from 'react';
import { 
    Search, Trash2, CheckCircle, XCircle, FileSpreadsheet,
    ChevronLeft, ChevronRight, Save, Activity, Layers, ScanLine
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { validateRmaSerials, confirmClearanceApi, type RmaDto } from '../api/rmaApi';
import { useClearanceStore, type ScanResult } from '../store/clearanceStore';

const ClearancePage: React.FC = () => {
    const [inputSerial, setInputSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    
    const { results, addResult, addResults, removeResult, clearAll } = useClearanceStore();
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const evaluateStatus = (match?: RmaDto): { status: 'OK' | 'NG', note: string } => {
        if (!match) return { status: 'NG', note: 'Not Found' };
        if (match.status === 'Processing') return { status: 'OK', note: '' };
        if (match.status === 'OUT') return { status: 'NG', note: 'Already OUT' };
        return { status: 'NG', note: `Status is ${match.status}` };
    };

    const handleScan = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const serialToCHeck = inputSerial.trim();
        if (!serialToCHeck) return;

        setLoading(true);
        try {
            const foundItems = await validateRmaSerials([serialToCHeck]);
            const match = foundItems.find(item => item.serial === serialToCHeck);
            const check = evaluateStatus(match);

            const newResult: ScanResult = {
                id: Date.now().toString(),
                inputSerial: serialToCHeck,
                status: check.status,
                note: check.note,
                data: match
            };
            addResult(newResult);
            setInputSerial('');
            setCurrentPage(1); 
        } catch (error) {
            console.error('Scan error', error);
            alert('Lỗi khi kiểm tra hệ thống');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                const serialsFromExcel: string[] = data.map(row => row[0]?.toString().trim()).filter(item => item);

                if (serialsFromExcel.length === 0) {
                    alert('File Excel không có dữ liệu (Cần cột A là Serial)');
                    return;
                }

                setLoading(true);
                const foundItems = await validateRmaSerials(serialsFromExcel);
                const newResults: ScanResult[] = serialsFromExcel.map((serial, index) => {
                    const match = foundItems.find(item => item.serial === serial);
                    const check = evaluateStatus(match);
                    return {
                        id: `excel-${Date.now()}-${index}`,
                        inputSerial: serial,
                        status: check.status,
                        note: check.note,
                        data: match
                    };
                });
                addResults(newResults);
                setCurrentPage(1);
            } catch (error) {
                console.error('Excel error', error);
                alert('Lỗi khi đọc file Excel');
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleClearAllList = () => {
        if (window.confirm('Bạn có chắc muốn xóa toàn bộ danh sách kết quả?')) {
            clearAll();
            setCurrentPage(1);
        }
    };

    const handleConfirmClearance = async () => {
        const okItems = results.filter(r => r.status === 'OK' && r.data?.id);
        if (okItems.length === 0) {
            alert('Không có PID nào hợp lệ (OK) để confirm.');
            return;
        }
        if (!window.confirm(`Bạn có chắc muốn Confirm Clear ${okItems.length} PID này sang trạng thái OUT?`)) return;

        setConfirming(true);
        try {
            const idsToUpdate = okItems.map(item => item.data!.id);
            await confirmClearanceApi(idsToUpdate);
            alert('Đã cập nhật thành công!');
            clearAll(); 
            setCurrentPage(1);
        } catch (error) {
            console.error('Confirm error', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái.');
        } finally {
            setConfirming(false);
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = results.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(results.length / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const countOK = results.filter(r => r.status === 'OK').length;
    const countNG = results.filter(r => r.status === 'NG').length;

    // --- Components con để tái sử dụng giao diện ---
    const StatCard = ({ title, count, color, icon: Icon }: any) => (
        <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow`}>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{count}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Clearance Check</h1>
                    <p className="text-slate-500 mt-1">Scan hàng để trả WH.</p>
                </div>
            </div>

            {/* Stats Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Scanned" count={results.length} color="bg-blue-500" icon={Layers} />
                <StatCard title="Valid (OK)" count={countOK} color="bg-green-500" icon={CheckCircle} />
                <StatCard title="Invalid (NG)" count={countNG} color="bg-red-500" icon={XCircle} />
            </div>

            {/* Input & Action Area */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <form onSubmit={handleScan} className="flex-1 w-full">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Scan PID / Serial Input</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <ScanLine className="h-6 w-6 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={inputSerial}
                                onChange={(e) => setInputSerial(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-lg shadow-inner"
                                placeholder="Đặt con trỏ vào đây và quét mã..."
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading || !inputSerial}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all font-medium shadow-md hover:shadow-lg"
                            >
                                {loading ? 'Checking...' : 'Check'}
                            </button>
                        </div>
                    </form>

                    <div className="flex gap-3 w-full lg:w-auto">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="flex-1 lg:flex-none flex items-center justify-center px-5 py-4 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all font-medium shadow-sm hover:shadow"
                        >
                            <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                            Import Excel
                        </button>
                        
                        {results.length > 0 && (
                            <button
                                onClick={handleClearAllList}
                                className="flex-1 lg:flex-none flex items-center justify-center px-5 py-4 border border-red-100 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all font-medium"
                            >
                                <Trash2 className="w-5 h-5 mr-2" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                        Scan Results
                    </h3>
                    <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Showing {currentItems.length} of {results.length} items
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No.</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Input PID</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Result</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Note</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Model</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">System Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <Search className="w-12 h-12 mb-3 text-slate-300" />
                                            <p className="text-lg font-medium">No data scanned yet</p>
                                            <p className="text-sm">Please scan a PID or upload an Excel file to begin.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item, index) => {
                                    const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                                {realIndex}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                                {item.inputSerial}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {item.status === 'OK' ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> OK
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> NG
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 italic font-medium">
                                                {item.note}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {item.data?.model || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.data?.status === 'Processing' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {item.data?.status || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => removeResult(item.id)}
                                                    className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove this item"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination & Actions Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Pagination */}
                    {results.length > 0 ? (
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm font-medium text-slate-700 px-2">
                                Page {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    ) : <div />}

                    {/* Confirm Button */}
                    <div className="w-full sm:w-auto">
                        <button
                            onClick={handleConfirmClearance}
                            disabled={confirming || results.filter(r => r.status === 'OK').length === 0}
                            className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform transition-all active:scale-95"
                        >
                            {confirming ? (
                                <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </span>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    Confirm Clear ({results.filter(r => r.status === 'OK').length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClearancePage;