import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    AlertCircle,
    CheckCircle,
    Clock,
    TrendingUp,
    List,
    Users as UsersIcon,
    Calendar,
    BarChart2,
    Layers,
} from 'lucide-react';
import { 
    getRmaStats, 
    getDashboardDistributions,
    getTrendsBreakdown, 
    type ChartData,
    type TrendsBreakdown,
    type DashboardDistributions,
    type BuyerDistribution 
} from "../api/rmaApi";

// --- Types Local ---
type RmaStats = {
    total: number;
    open: number;
    in_progress: number;
    closed: number;
    pending: number;
};

// --- Helper Functions cho đường cong biểu đồ ---
const getControlPoint = (current: any, previous: any, next: any, reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const o = { x: n.x - p.x, y: n.y - p.y };
    const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
    const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;
    return { x: current.x + Math.cos(angle) * length, y: current.y + Math.sin(angle) * length };
};

const getSmoothPath = (points: {x: number, y: number}[]) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const cp1 = getControlPoint(points[i], points[i - 1], points[i + 1]);
        const cp2 = getControlPoint(points[i + 1], points[i], points[i + 2], true);
        d += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${points[i + 1].x},${points[i + 1].y}`;
    }
    return d;
};


// --- Component: MiniTrendChart ---
const MiniTrendChart = ({ title, subTitle, data, colorClass, icon: Icon }: { title: string, subTitle: string, data: ChartData[], colorClass: string, icon: any }) => {
    const maxValue = Math.max(...data.map(d => d.count), 5) * 1.15; 

    const chartCoordinates = data.map((d, i) => ({
        x: ((i + 0.5) / data.length) * 100,
        y: 100 - ((d.count / maxValue) * 100)
    }));

const formatCurrencyCompact = (amount: number | string) => { // Chấp nhận cả string
    const num = Number(amount); // Ép kiểu sang số an toàn
    if (isNaN(num)) return '$0'; // Nếu lỗi thì trả về $0
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(num);
};

    const smoothPathD = getSmoothPath(chartCoordinates);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                            <Icon className="w-4 h-4 text-gray-700" />
                        </div>
                        {title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 ml-9">{subTitle}</p>
                </div>
            </div>

            <div className="relative h-40 w-full mt-2 group/chart flex-grow">
                <svg className="absolute inset-0 h-full w-full pointer-events-none z-30 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <defs>
                        <filter id={`shadow-${title}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)" />
                        </filter>
                    </defs>
                    <path
                        d={smoothPathD}
                        fill="none"
                        stroke="currentColor" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className={`${colorClass} text-opacity-80`} 
                        filter={`url(#shadow-${title})`}
                    />
                </svg>

                <div className="absolute inset-0 flex items-end justify-between z-20">
                    {data.length === 0 ? (
                        <div className="w-full text-center text-gray-400 text-sm self-center">No data</div>
                    ) : (
                        data.map((item, index) => {
                            const heightPercentage = maxValue ? (item.count / maxValue) * 100 : 0;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                    <div className={`mb-1 flex flex-col items-center justify-center transition-transform transform group-hover:-translate-y-1`}>
                                        {/* Số lượng */}
                                        <span className={`text-[11px] font-bold ${colorClass}`}>
                                            {item.count}
                                        </span>
                                        {/* Giá tiền - Sửa dòng dưới đây */}
                                        <span className="text-[9px] text-gray-500 font-medium bg-white/80 px-1 rounded-sm border border-gray-100 shadow-sm whitespace-nowrap">
                                        {formatCurrencyCompact(item.cost)}
                                        </span>
                                    </div>
                                    <div 
                                        className={`w-2/3 max-w-[20px] rounded-t-sm opacity-20 hover:opacity-40 transition-all duration-300 cursor-pointer ${colorClass.replace('text-', 'bg-')}`}
                                        style={{ height: `${heightPercentage}%` }}
                                    ></div>
                                    <div className="mt-2 text-[10px] text-gray-500 font-medium truncate w-full text-center">
                                        {item.date.length > 8 ? item.date.slice(5) : item.date}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Component: BuyerBreakdownCard (Đã cập nhật Dropdown) ---
const BuyerBreakdownCard = ({ data }: { data: BuyerDistribution[] }) => {
    // State lưu buyer đang được chọn
    const [selectedBuyer, setSelectedBuyer] = useState<string>('');

    // Tự động chọn buyer đầu tiên khi có dữ liệu
    useEffect(() => {
        if (data.length > 0 && !selectedBuyer) {
            setSelectedBuyer(data[0].buyer);
        }
    }, [data, selectedBuyer]);

    // Tìm dữ liệu của Buyer đang chọn
    const currentData = data.find(d => d.buyer === selectedBuyer);

    // Tính maxTotal của TOÀN BỘ danh sách để so sánh quy mô Buyer này với Buyer lớn nhất
    const globalMaxTotal = Math.max(...data.map(d => d.total), 1);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-full hover:shadow-md transition-shadow flex flex-col">
            {/* --- THAY ĐỔI: Đưa Dropdown lên header --- */}
            <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                        <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    Buyer
                </h3>

                {/* --- THAY ĐỔI: Combo box nhỏ gọn, nằm góc phải --- */}
                <select 
                    id="buyer-select"
                    value={selectedBuyer}
                    onChange={(e) => setSelectedBuyer(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1.5"
                    style={{ maxWidth: '180px' }} // Giới hạn chiều rộng
                >
                    {data.length === 0 && <option value="">No data</option>}
                    {data.map((item) => (
                        <option key={item.buyer} value={item.buyer}>
                            {item.buyer} {/* --- THAY ĐỔI: Bỏ hiển thị số lượng (EA) --- */}
                        </option>
                    ))}
                </select>
            </div>

            {/* Phần hiển thị nội dung bên dưới giữ nguyên logic cũ */}
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {!currentData ? (
                    <p className="text-gray-400 text-sm text-center italic py-4">No data available</p>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm animate-fade-in">
                        {/* HEADER BUYER INFO */}
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-6 h-6 text-blue-600" />
                                <span className="font-bold text-gray-900 text-xl">{currentData.buyer}</span>
                            </div>
                            <span className="bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
                                Total: {currentData.total} EA
                            </span>
                        </div>
                        
                        {/* Thanh Scale */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-[10px] text-gray-400 w-12 text-right">Scale</span>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-700" 
                                    style={{ width: `${(currentData.total / globalMaxTotal) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* LIST MODELS */}
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">Model Breakdown</h4>
                        <div className="space-y-4">
                            {currentData.models.map((model, mIdx) => (
                                <div key={mIdx} className="flex items-center gap-3 group">
                                    <div className="w-28 min-w-[7rem] text-sm font-medium text-gray-600 truncate text-right group-hover:text-blue-600 transition-colors">
                                        {model.model}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                                            <span></span>
                                            <span className="font-bold text-gray-800">{model.value}</span>
                                        </div>
                                        <div className="w-full bg-white border border-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="bg-indigo-400 h-2.5 rounded-full group-hover:bg-indigo-500 transition-all duration-500"
                                                style={{ width: `${(model.value / currentData.total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Component: DistributionCard (Top Defects) ---
const DistributionCard = ({ title, data, icon: Icon }: { title: string, data: { label: string, value: number }[], icon: any }) => {
    const vividColors = [
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 
        'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 
        'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'
    ];
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-full hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                        <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    {title}
                </h3>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {data.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center italic py-4">No data available</p>
                ) : (
                    data.map((item, idx) => (
                        <div key={idx} className="group">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-gray-700 truncate max-w-[70%] group-hover:text-blue-600 transition-colors">{item.label || 'N/A'}</span>
                                <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{item.value}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`${vividColors[idx % vividColors.length]} h-2.5 rounded-full transition-all duration-700 ease-out group-hover:brightness-90 relative`}
                                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- PAGE: DashboardPage ---
const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<RmaStats | null>(null);
    const [trends, setTrends] = useState<TrendsBreakdown>({ monthly: [], weekly: [], daily: [] });
    
    const [distributions, setDistributions] = useState<DashboardDistributions>({
        buyerBreakdown: [],
        byDefect: [],
        byBuyer: [], 
        byModel: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statsData, trendRes, distRes] = await Promise.all([
                    getRmaStats(),
                    getTrendsBreakdown(), 
                    getDashboardDistributions()
                ]);

                setStats(statsData);
                setDistributions(distRes);
                setTrends(trendRes);
                console.log("Dữ liệu Trend từ Server:", trendRes);

            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);



    const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${color} text-white`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-7 h-7 text-blue-600" />
                Dashboard Overview
            </h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total RMAs" value={stats?.total || 0} icon={ClipboardList} color="bg-gradient-to-br from-blue-400 to-blue-600" onClick={() => navigate('/rmas')} />
                <StatCard title="IN (New)" value={stats?.open || 0} icon={AlertCircle} color="bg-gradient-to-br from-red-400 to-red-600" onClick={() => navigate('/rmas?status=IN')} />
                <StatCard title="Processing" value={stats?.in_progress || 0} icon={Clock} color="bg-gradient-to-br from-amber-400 to-amber-600" onClick={() => navigate('/rmas?status=Processing')} />
                <StatCard title="OUT (Closed)" value={stats?.closed || 0} icon={CheckCircle} color="bg-gradient-to-br from-emerald-400 to-emerald-600" onClick={() => navigate('/rmas?status=OUT')} />
            </div>

            {/* 3 Trends Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MiniTrendChart 
                    title="Monthly Trend" 
                    subTitle="Last 3 Months"
                    data={trends.monthly}
                    colorClass="text-blue-500" 
                    icon={Calendar}
                />
                <MiniTrendChart 
                    title="Weekly Trend" 
                    subTitle="Last 4 Weeks"
                    data={trends.weekly}
                    colorClass="text-purple-500"
                    icon={BarChart2}
                />
                <MiniTrendChart 
                    title="Daily Trend" 
                    subTitle="Last 7 Days"
                    data={trends.daily}
                    colorClass="text-emerald-500"
                    icon={TrendingUp}
                />
            </div>

            {/* Distributions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bảng Buyer gộp Model (Đã thu gọn bằng Dropdown) */}
                <div className="lg:col-span-1">
                    <BuyerBreakdownCard data={distributions.buyerBreakdown || []} />
                </div>

                {/* Bảng Top Defects */}
                <div className="lg:col-span-1">
                    <DistributionCard title="Top 10 Defects" data={distributions.byDefect || []} icon={List} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;