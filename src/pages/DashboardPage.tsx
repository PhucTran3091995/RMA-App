import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    AlertCircle,
    CheckCircle,
    Clock,
    TrendingUp
} from 'lucide-react';
import { getRmaStats, getRmaStatsByDate } from '../api/mockApi';
import type { ChartData, RmaStats } from '../api/mockApi';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<RmaStats | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statsData, chartData] = await Promise.all([
                    getRmaStats(),
                    getRmaStatsByDate(range)
                ]);
                setStats(statsData);
                setChartData(chartData);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [range]);

    const StatCard = ({
        title,
        value,
        icon: Icon,
        color,
        onClick
    }: {
        title: string;
        value: number;
        icon: any;
        color: string;
        onClick?: () => void;
    }) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Time Range:</span>
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as any)}
                        className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total RMAs"
                    value={stats?.total || 0}
                    icon={ClipboardList}
                    color="bg-blue-500"
                    onClick={() => navigate('/rmas')}
                />
                <StatCard
                    title="Open"
                    value={stats?.open || 0}
                    icon={AlertCircle}
                    color="bg-red-500"
                    onClick={() => navigate('/rmas?status=Open')}
                />
                <StatCard
                    title="In Progress"
                    value={stats?.in_progress || 0}
                    icon={Clock}
                    color="bg-yellow-500"
                    onClick={() => navigate('/rmas?status=In Progress')}
                />
                <StatCard
                    title="Closed"
                    value={stats?.closed || 0}
                    icon={CheckCircle}
                    color="bg-green-500"
                    onClick={() => navigate('/rmas?status=Closed')}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">RMA Trends</h3>
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="h-64 flex items-end space-x-2">
                        {chartData.map((item, index) => {
                            const height = Math.max((item.count / 10) * 100, 5); // Normalize height
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center group">
                                    <div
                                        className="w-full bg-blue-100 hover:bg-blue-500 transition-colors rounded-t"
                                        style={{ height: `${height}%` }}
                                    ></div>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -mt-8 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none">
                                        {item.count} RMAs on {item.date}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{chartData[0]?.date}</span>
                        <span>{chartData[chartData.length - 1]?.date}</span>
                    </div>
                </div>

                {/* Distribution Chart (Simulated) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Open', value: stats?.open, color: 'bg-red-500', total: stats?.total },
                            { label: 'In Progress', value: stats?.in_progress, color: 'bg-yellow-500', total: stats?.total },
                            { label: 'Closed', value: stats?.closed, color: 'bg-green-500', total: stats?.total },
                            { label: 'Pending', value: stats?.pending, color: 'bg-gray-500', total: stats?.total },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium text-gray-900">{item.value}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`${item.color} h-2 rounded-full`}
                                        style={{ width: `${((item.value || 0) / (item.total || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
