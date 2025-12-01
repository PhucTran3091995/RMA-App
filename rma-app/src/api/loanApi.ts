// src/api/loanApi.ts
import axios from "axios";
const api = axios.create({ baseURL: "http://localhost:3000/api" });

export interface EmployeeDto {
    id: number;
    code: string;
    name: string;
    department_name: string;
}

export interface LoanItemDto {
    id: number; // loan id
    pid: string;
    borrow_date: string;
    status: string;
    rma_status: string;
}

export async function getEmployeeByCode(code: string) {
    const res = await api.get(`/employees/${code}`);
    return res.data as EmployeeDto;
}

export async function createLoan(payload: { employeeId: number; pids: string[]; reason: string }) {
    const res = await api.post("/loans/borrow", payload);
    return res.data;
}

export async function getActiveLoans(employeeCode: string) {
    const res = await api.get(`/loans/active/${employeeCode}`);
    return res.data as LoanItemDto[];
}

export async function returnLoans(loanIds: number[]) {
    const res = await api.post("/loans/return", { loanIds });
    return res.data;
}