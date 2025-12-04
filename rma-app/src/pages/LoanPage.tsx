import React, { useState, useRef, useEffect } from 'react';
import { 
    User, Briefcase, CheckCircle, Trash2, 
    FileSpreadsheet, ArrowRightLeft, ChevronLeft, ChevronRight,
    Scan, PackageOpen, ClipboardList, IdCard
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { validateRmaSerials } from '../api/rmaApi';
import { getEmployeeByCode, createLoan, getActiveLoans, returnLoans, type EmployeeDto, type LoanItemDto } from '../api/loanApi';
import { clsx } from 'clsx';

interface BorrowItem {
    id: string; pid: string; status: 'OK' | 'NG'; systemStatus: string; note: string;
}

const LoanPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
    const itemsPerPage = 10;

    // Borrow State
    const [empCode, setEmpCode] = useState('');
    const [employee, setEmployee] = useState<EmployeeDto | null>(null);
    const [reason, setReason] = useState('');
    const [borrowInputPid, setBorrowInputPid] = useState('');
    const [borrowList, setBorrowList] = useState<BorrowItem[]>([]);
    const [borrowPage, setBorrowPage] = useState(1);
    const borrowFileRef = useRef<HTMLInputElement>(null);

    // Return State
    const [returnEmpCode, setReturnEmpCode] = useState('');
    const [activeLoans, setActiveLoans] = useState<LoanItemDto[]>([]);
    const [returnInputPid, setReturnInputPid] = useState('');
    const [scannedReturnPids, setScannedReturnPids] = useState<string[]>([]);
    const [returnPage, setReturnPage] = useState(1);

    // --- Logic tự động lấy user đang đăng nhập (ĐÃ SỬA LỖI) ---
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const parsedData = JSON.parse(userStr);
                
                // Hỗ trợ cả 2 trường hợp: User nằm ở root hoặc nằm trong property .user
                const currentUser = parsedData.user || parsedData;

                if (currentUser && currentUser.employee_no) {
                    const myId = currentUser.employee_no;
                    setEmpCode(myId);

                    // 1. Hiển thị ngay thông tin từ LocalStorage (để UI không bị trống)
                    setEmployee({
                        id: currentUser.id,
                        code: currentUser.employee_no,
                        name: currentUser.name || currentUser.display_name || "Unknown",
                        // Nếu chưa có tên phòng ban thì hiển thị ID hoặc placeholder
                        department_name: currentUser.department_id ? `Dept ID: ${currentUser.department_id}` : "Loading..." 
                    });

                    // 2. Gọi API để lấy thông tin chi tiết nhất (tên phòng ban chính xác)
                    getEmployeeByCode(String(myId))
                        .then(data => {
                            if (data) {
                                setEmployee(prev => ({
                                    ...prev!,
                                    ...data // Cập nhật thông tin mới nhất từ database
                                }));
                            }
                        })
                        .catch(err => {
                            // Chỉ log lỗi nếu thực sự cần thiết
                            console.error("Failed to fetch fresh employee info:", err);
                        });
                }
            } catch (e) {
                console.error("Error parsing user info:", e);
            }
        }
    }, []);

    const checkBorrowPidLogic = (pid: string, rmaData: any) => {
        if (!rmaData) return { status: 'NG', note: 'PID Not Found' };
        if (rmaData.status === 'Processing') return { status: 'OK', note: '' };
        return { status: 'NG', note: `Status is ${rmaData.status} (Must be Processing)` };
    };

    const handleScanBorrow = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const pid = borrowInputPid.trim();
        if (!pid) return;
        if (borrowList.some(i => i.pid === pid)) { alert('PID already in list'); setBorrowInputPid(''); return; }

        try {
            const [rmaData] = await validateRmaSerials([pid]);
            const match = rmaData?.serial === pid ? rmaData : null;
            const check = checkBorrowPidLogic(pid, match);
            
            setBorrowList(prev => [{ id: Date.now().toString(), pid: pid, status: check.status as any, systemStatus: match?.status || 'N/A', note: check.note }, ...prev]);
            setBorrowInputPid(''); setBorrowPage(1);
        } catch (err) { console.error(err); }
    };

    const handleImportExcelBorrow = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            const pids = data.map(row => row[0]?.toString().trim()).filter(Boolean);
            if (pids.length === 0) return;
            const rmaList = await validateRmaSerials(pids);
            const newItems = pids.map((pid, idx) => {
                const match = rmaList.find(r => r.serial === pid);
                const check = checkBorrowPidLogic(pid, match);
                return { id: `xls-${idx}-${Date.now()}`, pid, status: check.status as any, systemStatus: match?.status || 'N/A', note: check.note };
            });
            setBorrowList(prev => [...newItems, ...prev]); setBorrowPage(1);
            if (borrowFileRef.current) borrowFileRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleSubmitBorrow = async () => {
        if (!employee) return alert('Employee info is missing. Please re-login.');
        if (!reason) return alert('Please enter a reason');
        const validItems = borrowList.filter(i => i.status === 'OK');
        if (validItems.length === 0) return alert('No valid (OK) items to borrow');
        if (!confirm(`Confirm borrow request for ${validItems.length} items?`)) return;

        try {
            await createLoan({ employeeId: employee.id, pids: validItems.map(i => i.pid), reason });
            alert('Borrow request submitted successfully');
            setBorrowList([]); setReason(''); setBorrowPage(1);
        } catch { alert('Failed to submit borrow request'); }
    };

    // Return Logic
    const handleCheckReturnEmployee = async () => {
        if (!returnEmpCode) return;
        try { const loans = await getActiveLoans(returnEmpCode); setActiveLoans(loans); setScannedReturnPids([]); setReturnPage(1); } 
        catch { alert('Error fetching loans'); }
    };

    const handleScanReturn = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const pid = returnInputPid.trim();
        if (!pid) return;
        const exists = activeLoans.find(l => l.pid === pid);
        if (!exists) alert(`PID ${pid} does not belong to this employee's active loans.`);
        else if (!scannedReturnPids.includes(pid)) setScannedReturnPids(prev => [...prev, pid]);
        setReturnInputPid('');
    };

    const handleConfirmReturn = async () => {
        if (scannedReturnPids.length === 0) return;
        if (!confirm(`Confirm return for ${scannedReturnPids.length} items?`)) return;
        const loanIdsToReturn = activeLoans.filter(l => scannedReturnPids.includes(l.pid)).map(l => l.id);
        try { await returnLoans(loanIdsToReturn); alert('Returned successfully'); handleCheckReturnEmployee(); } 
        catch { alert('Error processing return'); }
    };

    const getPaginatedData = <T,>(data: T[], page: number) => {
        const start = (page - 1) * itemsPerPage;
        return { currentItems: data.slice(start, start + itemsPerPage), totalPages: Math.ceil(data.length / itemsPerPage) };
    };

    const borrowCountOK = borrowList.filter(i => i.status === 'OK').length;
    const borrowCountNG = borrowList.filter(i => i.status === 'NG').length;
    const borrowPagination = getPaginatedData(borrowList, borrowPage);
    const returnPagination = getPaginatedData(activeLoans, returnPage);

    const PaginationControls = ({ page, totalPages, setPage }: { page: number, totalPages: number, setPage: (p: number) => void }) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronLeft className="w-5 h-5"/></button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronRight className="w-5 h-5"/></button>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Navigation / Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Loan Center</h1>
                    <p className="text-slate-500">Quản lý mượn trả vỉ lỗi (Borrow / Return PCBs)</p>
                </div>
                
                <div className="bg-slate-100 p-1.5 rounded-xl inline-flex shadow-inner">
                    <button onClick={() => setActiveTab('borrow')}
                        className={clsx("px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all", activeTab === 'borrow' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <PackageOpen className="mr-2 h-4 w-4" /> Borrow (Mượn)
                    </button>
                    <button onClick={() => setActiveTab('return')}
                        className={clsx("px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all", activeTab === 'return' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Return (Trả)
                    </button>
                </div>
            </div>

            {/* TAB: BORROW */}
            {activeTab === 'borrow' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* CARD THÔNG TIN NGƯỜI MƯỢN */}
                        <div className="bg-white p-5 rounded-2xl shadow-lg shadow-indigo-100/50 border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-indigo-500"/> Borrower Info</h3>
                            <div className="space-y-4">
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Employee ID</span>
                                        <div className="flex items-center font-mono font-bold text-indigo-700">
                                            <IdCard className="w-4 h-4 mr-1.5" />
                                            {empCode || "Loading..."}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Full Name</span>
                                        <p className="font-bold text-slate-700 text-lg">
                                            {employee ? employee.name : "..."}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Department</span>
                                        <p className="text-sm font-medium text-slate-600 flex items-center">
                                            <Briefcase className="w-3.5 h-3.5 mr-1.5" /> 
                                            {employee ? employee.department_name : "..."}
                                        </p>
                                    </div>
                                </div>

                                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none" placeholder="Lý do mượn hàng (Reason for borrowing)..." />
                            </div>
                        </div>

                        {/* Scan Card */}
                        <div className="bg-white p-5 rounded-2xl shadow-lg shadow-indigo-100/50 border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Scan className="w-5 h-5 mr-2 text-indigo-500"/> Scan Items</h3>
                            <form onSubmit={handleScanBorrow} className="relative mb-4">
                                <input type="text" value={borrowInputPid} onChange={(e) => setBorrowInputPid(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Scan PID here..." />
                                <Scan className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                            </form>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="file" hidden ref={borrowFileRef} onChange={handleImportExcelBorrow} />
                                <button onClick={() => borrowFileRef.current?.click()} className="flex items-center justify-center px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-all">
                                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel
                                </button>
                                <button onClick={() => { setBorrowList([]); setBorrowPage(1); }} className="flex items-center justify-center px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-all">
                                    <Trash2 className="w-4 h-4 mr-2" /> Clear
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                             <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                <span className="block text-2xl font-bold text-green-600">{borrowCountOK}</span>
                                <span className="text-xs font-bold text-green-800 uppercase">Valid</span>
                             </div>
                             <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                                <span className="block text-2xl font-bold text-red-600">{borrowCountNG}</span>
                                <span className="text-xs font-bold text-red-800 uppercase">Invalid</span>
                             </div>
                        </div>
                        
                        <button onClick={handleSubmitBorrow} disabled={borrowList.filter(i => i.status === 'OK').length === 0}
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none">
                            Submit Request
                        </button>
                    </div>

                    {/* Right Column: List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Scan List</h3>
                            <span className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">Total: {borrowList.length}</span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">PID</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">System</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {borrowPagination.currentItems.length > 0 ? (
                                        borrowPagination.currentItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3.5 text-sm font-medium text-slate-900">{item.pid}</td>
                                                <td className="px-6 py-3.5 text-center">
                                                    {item.status === 'OK' ? 
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">OK</span> : 
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">NG</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-3.5 text-sm">
                                                    <div className="text-slate-600">{item.systemStatus}</div>
                                                    {item.note && <div className="text-xs text-red-500 mt-0.5">{item.note}</div>}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <button onClick={() => setBorrowList(prev => prev.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400">List is empty. Scan items to add.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls page={borrowPage} totalPages={borrowPagination.totalPages} setPage={setBorrowPage} />
                    </div>
                </div>
            )}

            {/* TAB: RETURN */}
            {activeTab === 'return' && (
                <div className="space-y-6">
                    {/* Header Action Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg shadow-emerald-100/50 border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">1. Find Borrower</label>
                                <div className="flex gap-2">
                                    <input type="text" value={returnEmpCode} onChange={(e) => setReturnEmpCode(e.target.value)}
                                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="Enter Borrower ID" />
                                    <button onClick={handleCheckReturnEmployee} className="px-6 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold shadow-md transition-all">
                                        Get Loans
                                    </button>
                                </div>
                            </div>
                            <div className={clsx("transition-opacity duration-300", activeLoans.length === 0 ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                <label className="block text-sm font-bold text-slate-700 mb-2">2. Scan to Return</label>
                                <form onSubmit={handleScanReturn} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input type="text" value={returnInputPid} onChange={(e) => setReturnInputPid(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="Scan item..." autoFocus />
                                        <Scan className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                    </div>
                                    <button type="submit" className="px-6 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200 transition-all">
                                        Check
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Return List Table */}
                    <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 flex items-center"><ClipboardList className="w-5 h-5 mr-2 text-emerald-600"/> Active Loans</h3>
                            <div className="flex space-x-2">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">Scanned: {scannedReturnPids.length}</span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Total: {activeLoans.length}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">PID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Borrow Date</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {returnPagination.currentItems.length > 0 ? (
                                        returnPagination.currentItems.map((loan) => {
                                            const isScanned = scannedReturnPids.includes(loan.pid);
                                            return (
                                                <tr key={loan.id} className={clsx("transition-colors", isScanned ? "bg-emerald-50/50" : "hover:bg-slate-50")}>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{loan.pid}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(loan.borrow_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isScanned ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ready to Return
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                                Waiting Scan
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">No active loans found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls page={returnPage} totalPages={returnPagination.totalPages} setPage={setReturnPage} />
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button onClick={handleConfirmReturn} disabled={scannedReturnPids.length === 0}
                                className="inline-flex items-center px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Confirm Return ({scannedReturnPids.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanPage;