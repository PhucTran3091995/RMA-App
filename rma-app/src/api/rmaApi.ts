import axios from "axios";

// Backend URL
const api = axios.create({
    baseURL: "http://localhost:3000/api",
});

// ======================================
// Types (giống schema backend trả về)
// ======================================

export type RmaStatus = "IN" | "OUT" | "Processing" | string;

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
}) {
    const res = await api.get("/rmas", { params });
    return res.data as {
        data: RmaDto[];
        total: number;
        page: number;
        limit: number;
    };
}

export async function fetchRmaById(id: string): Promise<RmaDetailDto> {
    const res = await api.get(`/rmas/${id}`);
    return res.data as RmaDetailDto;
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
    return res.data as {
        total: number;
        open: number;
        in_progress: number;
        closed: number;
        pending: number;
    };
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
