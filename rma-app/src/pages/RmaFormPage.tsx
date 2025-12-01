import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, FileText, Wrench, History, Plus, User, Box, Activity } from 'lucide-react';
import { fetchRmaById, createRma, updateRmaApi, type RmaDto } from '../api/rmaApi';
import { clsx } from 'clsx';

const RmaFormPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [activeTab, setActiveTab] = useState<'header' | 'diagnosis' | 'log'>('header');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<Partial<RmaDto>>({
        status: 'IN', customer: '', serial: '', model: '',
    });

    const [diagnosis, setDiagnosis] = useState({
        symptom: '', rootCause: '', actionTaken: '', warrantyDecision: 'Repair', laborCost: 0, partsCost: 0
    });

    useEffect(() => {
        if (isEditMode && id) {
            const fetchRma = async () => {
                setLoading(true);
                try {
                    const data = await fetchRmaById(id);
                    if (data) {
                        setFormData(data);
                        setDiagnosis({
                            symptom: 'Device not powering on', rootCause: '', actionTaken: '', 
                            warrantyDecision: 'Repair', laborCost: 0, partsCost: 0
                        });
                    } else setError('RMA not found');
                } catch (err) { setError('Failed to load RMA details'); } 
                finally { setLoading(false); }
            };
            fetchRma();
        }
    }, [isEditMode, id]);

    const handleSave = async () => {
        if (!formData.customer || !formData.serial || !formData.model) {
            setError('Please fill in all required fields (Customer, Serial, Model)');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (isEditMode && id) await updateRmaApi(id, formData as any);
            else await createRma(formData as any);
            navigate('/rmas');
        } catch (err) { setError('Failed to save RMA'); } 
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Action Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 py-4 border-b border-slate-200/50">
                <div className="flex items-center">
                    <button onClick={() => navigate('/rmas')} className="mr-4 p-2 rounded-full bg-white hover:bg-slate-100 text-slate-500 shadow-sm border border-slate-200 transition-all">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800">
                            {isEditMode ? `Edit RMA #${formData.rmaNo}` : 'Create New RMA'}
                        </h1>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => navigate('/rmas')} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                        {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center animate-shake">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}

            {/* Custom Tabs */}
            <div className="bg-slate-200/50 p-1.5 rounded-xl inline-flex space-x-1">
                {[
                    { id: 'header', label: 'General Info', icon: FileText },
                    { id: 'diagnosis', label: 'Diagnosis & Repair', icon: Wrench },
                    { id: 'log', label: 'Activity Log', icon: History },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === tab.id
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        <tab.icon className={clsx("mr-2 h-4 w-4", activeTab === tab.id ? "text-indigo-500" : "text-slate-400")} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-100 p-8 min-h-[500px]">
                {activeTab === 'header' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-indigo-500" /> Customer Details
                            </h3>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Buyer Name</label>
                                <input type="text" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Enter customer name" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Main PID / Serial</label>
                                <input type="text" value={formData.serial} onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Model</label>
                                <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center">
                                <Box className="w-5 h-5 mr-2 text-indigo-500" /> Status & Assignment
                            </h3>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Status</label>
                                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                    <option value="IN">IN - Received</option>
                                    <option value="Processing">Processing</option>
                                    <option value="OUT">OUT - Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Technician</label>
                                <select value={formData.technician || ''} onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                    <option value="">-- Unassigned --</option>
                                    <option value="John Doe">John Doe</option>
                                    <option value="Jane Smith">Jane Smith</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Symptom</label>
                                <textarea rows={4} value={diagnosis.symptom} onChange={(e) => setDiagnosis({ ...diagnosis, symptom: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" placeholder="Describe the reported issue..." />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'diagnosis' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Root Cause Analysis</label>
                                <textarea rows={5} value={diagnosis.rootCause} onChange={(e) => setDiagnosis({ ...diagnosis, rootCause: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Technical analysis..." />
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Action Taken</label>
                                <textarea rows={5} value={diagnosis.actionTaken} onChange={(e) => setDiagnosis({ ...diagnosis, actionTaken: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Repairs performed..." />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-500"/> Cost & Warranty</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Labor Cost ($)</label>
                                    <input type="number" value={diagnosis.laborCost} onChange={(e) => setDiagnosis({ ...diagnosis, laborCost: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-blue-800 font-bold focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Parts Cost ($)</label>
                                    <input type="number" value={diagnosis.partsCost} onChange={(e) => setDiagnosis({ ...diagnosis, partsCost: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-blue-800 font-bold focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">Total Cost</label>
                                    <div className="text-2xl font-extrabold text-indigo-700">${(diagnosis.laborCost + diagnosis.partsCost).toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <label className="block text-sm font-bold text-slate-700 mb-3">Warranty Decision</label>
                                <div className="flex gap-4">
                                    {['Repair', 'Replace', 'Reject'].map((option) => (
                                        <label key={option} className={clsx(
                                            "flex-1 relative flex items-center justify-center px-4 py-3 rounded-xl border-2 cursor-pointer transition-all",
                                            diagnosis.warrantyDecision === option 
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                                            : "border-slate-200 bg-white hover:border-indigo-200"
                                        )}>
                                            <input type="radio" className="sr-only" name="warranty" value={option} checked={diagnosis.warrantyDecision === option} onChange={(e) => setDiagnosis({ ...diagnosis, warrantyDecision: e.target.value })} />
                                            <span className="font-bold">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'log' && (
                    <div className="flow-root py-4">
                        <ul className="-mb-8">
                            {[{ action: 'Created RMA', user: 'System', date: formData.createdDate, icon: Plus, bg: 'bg-emerald-500' },
                              { action: 'Status changed to In Progress', user: 'John Doe', date: '2024-03-15', icon: Wrench, bg: 'bg-blue-500' }
                            ].map((event, eventIdx) => (
                                <li key={eventIdx}>
                                    <div className="relative pb-8">
                                        {eventIdx !== 1 ? <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" /> : null}
                                        <div className="relative flex space-x-3">
                                            <div><span className={clsx("h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm", event.bg)}><event.icon className="h-4 w-4 text-white" /></span></div>
                                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                <div><p className="text-sm text-slate-600">{event.action} by <span className="font-bold text-slate-900">{event.user}</span></p></div>
                                                <div className="text-right text-sm whitespace-nowrap text-slate-400"><time dateTime={event.date}>{event.date}</time></div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RmaFormPage;