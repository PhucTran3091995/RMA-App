// src/store/clearanceStore.ts
import { create } from 'zustand';
import type { RmaDto } from '../api/rmaApi';

export interface ScanResult {
    id: string;
    inputSerial: string;
    status: 'OK' | 'NG';
    note?: string;
    data?: RmaDto;
}

interface ClearanceState {
    results: ScanResult[];
    addResult: (result: ScanResult) => void;
    addResults: (results: ScanResult[]) => void;
    removeResult: (id: string) => void;
    clearAll: () => void;
}

export const useClearanceStore = create<ClearanceState>((set) => ({
    results: [],
    addResult: (result) => set((state) => ({ results: [result, ...state.results] })),
    addResults: (newResults) => set((state) => ({ results: [...newResults, ...state.results] })),
    removeResult: (id) => set((state) => ({ results: state.results.filter((r) => r.id !== id) })),
    clearAll: () => set({ results: [] }),
}));