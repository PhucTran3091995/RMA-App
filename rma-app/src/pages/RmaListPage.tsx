import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, Search, Filter, ChevronLeft, ChevronRight, Eye, Download, Calendar
} from 'lucide-react';
import { fetchRmas, type RmaDto } from '../api/rmaApi';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

const RmaListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [rmas, setRmas] = useState<RmaDto[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filter states
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || 'All');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const limit = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            const params: Record<string, string> = {
                search,
                status: status === 'All' ? '' : status,
                page: page.toString(),
            };
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            setSearchParams(params);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, status, page, startDate, endDate, setSearchParams]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, total } = await fetchRmas({
                    page, limit, search, status, startDate, endDate
                });
                setRmas(data);
                setTotal(total);
            } catch (error) {
                console.error('Failed to fetch RMAs', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [page, search, status, startDate, endDate]);

    const totalPages = Math.ceil(total / limit);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IN': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Processing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'OUT': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const handleDownloadExcel = async () => {
        try {
            setExporting(true);
            if (total === 0) {
                alert('Không có dữ liệu để xuất Excel');
                return;
            }
            const { data } = await fetchRmas({
                page: 1, limit: total, search, status, startDate, endDate
            });
            const rows = data.map((rma, index) => ({
                'No.': index + 1,
                'W/O Name': rma.rmaNo,
                'Buyer': rma.customer,
                'Model': rma.model,
                'Main PID': rma.serial,
                'Status (Actual)': rma.status,
                'RMA Date': rma.createdDate,
                'Board': rma.board ?? '',
                'Face': rma.face ?? '',
                'Defect Symptom': rma.defectSymptom ?? '',
            }));
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'RMA List');
            const fileName = `RMA_List_${startDate || 'ALL'}_to_${endDate || 'ALL'}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error('Export Excel error', error);
            alert('Có lỗi khi xuất Excel.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">RMA Management</h1>
                    <p className="text-slate-500 mt-1">Quản lý danh sách và trạng thái.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadExcel}
                        disabled={loading || exporting || total === 0}
                        className="inline-flex items-center px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                    >
                        {exporting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        Export Excel
                    </button>
                    <button
                        onClick={() => navigate('/rmas/new')}
                        className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New
                    </button>
                </div>
            </div>

            {/* Filters Area */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Search */}
                <div className="md:col-span-5 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm transition-all"
                        placeholder="Search everything..."
                    />
                </div>

                {/* Status */}
                <div className="md:col-span-3 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm appearance-none cursor-pointer transition-all"
                    >
                        <option value="All">All Status</option>
                        <option value="IN">IN</option>
                        <option value="Processing">Processing</option>
                        <option value="OUT">OUT</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="md:col-span-4 flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="block w-full pl-9 px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                    </div>
                    <div className="relative flex-1">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="block w-full pl-9 px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">W/O Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Buyer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Model / PID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">RMA Input Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 relative">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : rmas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No RMAs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                rmas.map((rma) => (
                                    <tr
                                        key={rma.id}
                                        onClick={() => navigate(`/rmas/${rma.id}`)}
                                        className="hover:bg-indigo-50/40 cursor-pointer transition-all duration-200 group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">{rma.rmaNo}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{rma.customer}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{rma.model}</div>
                                            <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{rma.serial}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border",
                                                getStatusColor(rma.status)
                                            )}>
                                                {rma.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {rma.createdDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs">Board: {rma.board || '-'}</span>
                                                <span className="text-xs">Symp: {rma.defectSymptom || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-slate-400 group-hover:text-indigo-600 p-2 rounded-full hover:bg-white hover:shadow-sm transition-all">
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Showing <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> to <span className="font-bold text-slate-700">{Math.min(page * limit, total)}</span> of <span className="font-bold text-slate-700">{total}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RmaListPage;