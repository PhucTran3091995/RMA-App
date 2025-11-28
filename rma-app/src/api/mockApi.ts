// Mock data types
export interface RmaStats {
    total: number;
    open: number;
    in_progress: number;
    closed: number;
    pending: number;
}

export interface ChartData {
    date: string;
    count: number;
}

export interface Rma {
    id: string;
    rmaNo: string;
    customer: string;
    serial: string;
    model: string;
    status: 'Open' | 'In Progress' | 'Closed' | 'Pending';
    createdDate: string;
    technician?: string;
}

// Mock Data Store
let mockRmas: Rma[] = Array.from({ length: 50 }).map((_, i) => ({
    id: `rma-${i + 1}`,
    rmaNo: `RMA-${2024000 + i}`,
    customer: ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp'][i % 5],
    serial: `SN-${10000 + i}`,
    model: ['Model X', 'Model Y', 'Model Z', 'Pro 2000', 'Lite 100'][i % 5],
    status: ['Open', 'In Progress', 'Closed', 'Pending'][i % 4] as any,
    createdDate: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
    technician: i % 3 === 0 ? 'John Doe' : i % 3 === 1 ? 'Jane Smith' : undefined
}));

// Mock API functions
export const getRmaStats = async (): Promise<RmaStats> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
        total: mockRmas.length,
        open: mockRmas.filter(r => r.status === 'Open').length,
        in_progress: mockRmas.filter(r => r.status === 'In Progress').length,
        closed: mockRmas.filter(r => r.status === 'Closed').length,
        pending: mockRmas.filter(r => r.status === 'Pending').length
    };
};

export const getRmaStatsByDate = async (range: '7d' | '30d' | '90d'): Promise<ChartData[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data: ChartData[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 5)
        });
    }
    return data;
};

export const getRmas = async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}): Promise<{ data: Rma[]; total: number }> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    let filtered = [...mockRmas];

    if (params.status && params.status !== 'All') {
        filtered = filtered.filter(r => r.status === params.status);
    }

    if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(r =>
            r.rmaNo.toLowerCase().includes(q) ||
            r.customer.toLowerCase().includes(q) ||
            r.serial.toLowerCase().includes(q) ||
            r.model.toLowerCase().includes(q)
        );
    }

    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;

    return {
        data: filtered.slice(start, end),
        total: filtered.length
    };
};

export const getRmaById = async (id: string): Promise<Rma | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRmas.find(r => r.id === id);
};

export const createRma = async (rma: Omit<Rma, 'id' | 'rmaNo' | 'createdDate'>): Promise<Rma> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newRma: Rma = {
        ...rma,
        id: `rma-${Date.now()}`,
        rmaNo: `RMA-${2024000 + mockRmas.length}`,
        createdDate: new Date().toISOString().split('T')[0]
    };
    mockRmas.unshift(newRma);
    return newRma;
};

export const updateRma = async (id: string, updates: Partial<Rma>): Promise<Rma> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const index = mockRmas.findIndex(r => r.id === id);
    if (index === -1) throw new Error('RMA not found');

    mockRmas[index] = { ...mockRmas[index], ...updates };
    return mockRmas[index];
};
