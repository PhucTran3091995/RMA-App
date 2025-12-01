import axios from "axios";

// Backend URL
const api = axios.create({
    baseURL: "http://localhost:3000/api",
});

// ======================================
// Types (giống schema backend trả về)
// ======================================

export type RmaStatus = "IN" | "OUT" | "Processing" | string;

export interface ChartData {
    date: string;
    count: number;
}

export interface DistributionData {
    label: string;
    value: number;
}

export interface DashboardDistributions {
    byBuyer: DistributionData[];
    byModel: DistributionData[];
    byDefect: DistributionData[];
}
// rmaApi.ts

export interface RmaDto {
    id: number;
    rmaNo: string;
    customer: string;
    serial: string;
    model: string;
    status: RmaStatus;
    createdDate: string;
    technician: string | null;
    board?: string | null;
    face?: string | null;
    defectSymptom?: string | null;
}

export interface RmaDetailDto extends RmaDto {
    board?: string;
    qty?: number;
    defectSymptomRaw?: string;
    defectSymptomFin?: string;
    clearType?: string;
    paymentStatus?: string;
    invoiceNo?: string;
    clearDate?: string | null;
}

// ======================================
// API functions
// ======================================

export async function fetchRmas(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}) {
    const res = await api.get("/rmas", { params });
    return res.data as {
        data: RmaDto[];
        total: number;
        page: number;
        limit: number;
    };
}

export interface TrendsBreakdown {
    monthly: ChartData[];
    weekly: ChartData[];
    daily: ChartData[];
}

export interface ModelBreakdown {
    model: string;
    value: number;
}

// Interface cho cấu trúc Buyer cha
export interface BuyerDistribution {
    buyer: string;
    total: number;
    models: ModelBreakdown[];
}

export interface DashboardDistributions {
    buyerBreakdown: BuyerDistribution[]; // Dữ liệu gộp mới
    byDefect: { label: string; value: number }[];
}

export async function fetchRmaById(id: string): Promise<RmaDetailDto> {
    const res = await api.get(`/rmas/${id}`);
    return res.data as RmaDetailDto;
}

export async function getDashboardDistributions() {
    const res = await api.get("/dashboard/distributions");
    return res.data as DashboardDistributions;
}

export async function createRma(payload: {
    customer: string;
    serial: string;
    model: string;
    status?: RmaStatus;
}) {
    const res = await api.post("/rmas", payload);
    return res.data;
}

export async function updateRmaApi(
    id: string,
    payload: Partial<{
        customer: string;
        serial: string;
        model: string;
        status: RmaStatus;
        clearDate: string;
        clearType: string;
        paymentStatus: string;
        invoiceNo: string;
    }>
) {
    const res = await api.put(`/rmas/${id}`, payload);
    return res.data;
}

// Dashboard

export async function getRmaStats() {
    const res = await api.get("/dashboard/summary");
    return res.data;
}

export async function getProcessingTrend() {
    const res = await api.get("/dashboard/trend-processing");
    return res.data as ChartData[];
}

export async function getRmaStatsByDate(range: "7d" | "30d" | "90d") {
    const res = await api.get("/dashboard/trend", { params: { range } });
    return res.data as { date: string; count: number }[];
}

// Master data
export async function fetchMasterItems() {
    const res = await api.get("/masters/items");
    return res.data;
}

export async function fetchMasterCustomers() {
    const res = await api.get("/masters/customers");
    return res.data;
}

export async function fetchMasterFaultCodes() {
    const res = await api.get("/masters/fault-codes");
    return res.data;
}

export async function validateRmaSerials(serials: string[]) {
    const res = await api.post("/rmas/validate", { serials });
    return res.data as RmaDto[];
}

export async function confirmClearanceApi(ids: number[]) {
    const res = await api.post("/rmas/confirm-clear", { ids });
    return res.data;
}

export async function getTrendsBreakdown() {
    const res = await api.get("/dashboard/trends-breakdown");
    return res.data as TrendsBreakdown;
}