import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    AlertTriangle,
    FileText,
    Wrench,
    History,
    Plus
} from 'lucide-react';
import {
    fetchRmaById,
    createRma,
    updateRmaApi,
    type RmaDto
} from '../api/rmaApi';
import { clsx } from 'clsx';

const RmaFormPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [activeTab, setActiveTab] = useState<'header' | 'diagnosis' | 'log'>('header');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form State (use RmaDto type)
    const [formData, setFormData] = useState<Partial<RmaDto>>({
        status: 'IN',
        customer: '',
        serial: '',
        model: '',
    });

    // Additional fields for demo
    const [diagnosis, setDiagnosis] = useState({
        symptom: '',
        rootCause: '',
        actionTaken: '',
        warrantyDecision: 'Repair',
        laborCost: 0,
        partsCost: 0
    });

    useEffect(() => {
        if (isEditMode && id) {
            const fetchRma = async () => {
                setLoading(true);
                try {
                    const data = await fetchRmaById(id);
                    if (data) {
                        setFormData(data);
                        // Simulate fetching diagnosis data
                        setDiagnosis({
                            symptom: 'Device not powering on',
                            rootCause: '',
                            actionTaken: '',
                            warrantyDecision: 'Repair',
                            laborCost: 0,
                            partsCost: 0
                        });
                    } else {
                        setError('RMA not found');
                    }
                } catch (err) {
                    setError('Failed to load RMA details');
                } finally {
                    setLoading(false);
                }
            };
            fetchRma();
        }
    }, [isEditMode, id]);

    const handleSave = async () => {
        // Basic validation
        if (!formData.customer || !formData.serial || !formData.model) {
            setError('Please fill in all required fields (Customer, Serial, Model)');
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (isEditMode && id) {
                await updateRmaApi(id, formData as any);
            } else {
                await createRma(formData as any);
            }
            navigate('/rmas');
        } catch (err) {
            setError('Failed to save RMA');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/rmas')}
                        className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditMode ? `Edit RMA ${formData.rmaNo}` : 'New RMA'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isEditMode ? `Created on ${formData.createdDate}` : 'Create a new return merchandise authorization'}
                        </p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => navigate('/rmas')}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save RMA
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'header', label: 'General Info', icon: FileText },
                        { id: 'diagnosis', label: 'Diagnosis & Repair', icon: Wrench },
                        { id: 'log', label: 'Activity Log', icon: History },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                                activeTab === tab.id
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <tab.icon className={clsx(
                                "mr-2 h-5 w-5",
                                activeTab === tab.id ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                            )} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white shadow rounded-lg p-6">
                {activeTab === 'header' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Buyer</label>
                                <input
                                    type="text"
                                    value={formData.customer}
                                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Search customer..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Main PID</label>
                                <input
                                    type="text"
                                    value={formData.serial}
                                    onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Model </label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="All">All Status</option>
                                    <option value="IN">IN</option>
                                    <option value="Processing">Processing</option>
                                    <option value="OUT">OUT</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Technician</label>
                                <select
                                    value={formData.technician || ''}
                                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="">Unassigned</option>
                                    <option value="John Doe">John Doe</option>
                                    <option value="Jane Smith">Jane Smith</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Symptom Description</label>
                                <textarea
                                    rows={4}
                                    value={diagnosis.symptom}
                                    onChange={(e) => setDiagnosis({ ...diagnosis, symptom: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Describe the issue..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'diagnosis' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Root Cause</label>
                                <textarea
                                    rows={3}
                                    value={diagnosis.rootCause}
                                    onChange={(e) => setDiagnosis({ ...diagnosis, rootCause: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Action Taken</label>
                                <textarea
                                    rows={3}
                                    value={diagnosis.actionTaken}
                                    onChange={(e) => setDiagnosis({ ...diagnosis, actionTaken: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost & Warranty</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Labor Cost ($)</label>
                                    <input
                                        type="number"
                                        value={diagnosis.laborCost}
                                        onChange={(e) => setDiagnosis({ ...diagnosis, laborCost: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Parts Cost ($)</label>
                                    <input
                                        type="number"
                                        value={diagnosis.partsCost}
                                        onChange={(e) => setDiagnosis({ ...diagnosis, partsCost: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Cost</label>
                                    <div className="mt-1 block w-full py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-gray-700 font-medium">
                                        ${(diagnosis.laborCost + diagnosis.partsCost).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Warranty Decision</label>
                                <div className="mt-2 flex space-x-4">
                                    {['Repair', 'Replace', 'Reject'].map((option) => (
                                        <label key={option} className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-600"
                                                name="warranty"
                                                value={option}
                                                checked={diagnosis.warrantyDecision === option}
                                                onChange={(e) => setDiagnosis({ ...diagnosis, warrantyDecision: e.target.value })}
                                            />
                                            <span className="ml-2">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'log' && (
                    <div className="flow-root">
                        <ul className="-mb-8">
                            {[
                                { action: 'Created RMA', user: 'System', date: formData.createdDate, icon: Plus, bg: 'bg-green-500' },
                                { action: 'Status changed to In Progress', user: 'John Doe', date: '2024-03-15', icon: Wrench, bg: 'bg-blue-500' },
                            ].map((event, eventIdx) => (
                                <li key={eventIdx}>
                                    <div className="relative pb-8">
                                        {eventIdx !== 1 ? (
                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex space-x-3">
                                            <div>
                                                <span className={clsx("h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white", event.bg)}>
                                                    <event.icon className="h-5 w-5 text-white" aria-hidden="true" />
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        {event.action} by <span className="font-medium text-gray-900">{event.user}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                    <time dateTime={event.date}>{event.date}</time>
                                                </div>
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