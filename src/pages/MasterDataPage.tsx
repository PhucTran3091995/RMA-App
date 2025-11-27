import React, { useState } from 'react';
import {
    Package,
    Users,
    AlertOctagon,
    Plus,
    Edit2,
    Trash2,
    Search,
    X
} from 'lucide-react';
import { clsx } from 'clsx';

// Mock Data Types
interface Item { id: string; pid: string; name: string; cost: number; active: boolean; }
interface Customer { id: string; code: string; name: string; type: string; active: boolean; }
interface FaultCode { id: string; code: string; description: string; group: string; severity: string; active: boolean; }

// Mock Data
const initialItems: Item[] = [
    { id: '1', pid: 'PID-001', name: 'Mainboard V1', cost: 150, active: true },
    { id: '2', pid: 'PID-002', name: 'Power Supply 500W', cost: 45, active: true },
    { id: '3', pid: 'PID-003', name: 'LCD Panel 24"', cost: 120, active: true },
];

const initialCustomers: Customer[] = [
    { id: '1', code: 'CUST-001', name: 'Acme Corp', type: 'Distributor', active: true },
    { id: '2', code: 'CUST-002', name: 'Globex Inc', type: 'Retailer', active: true },
];

const initialFaultCodes: FaultCode[] = [
    { id: '1', code: 'ERR-001', description: 'No Power', group: 'Electrical', severity: 'High', active: true },
    { id: '2', code: 'ERR-002', description: 'Screen Flicker', group: 'Display', severity: 'Medium', active: true },
];

const MasterDataPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'items' | 'customers' | 'faults'>('items');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Data States
    const [items, setItems] = useState(initialItems);
    const [customers, setCustomers] = useState(initialCustomers);
    const [faultCodes, setFaultCodes] = useState(initialFaultCodes);

    // Form State (Generic)
    const [formData, setFormData] = useState<any>({});

    const handleOpenModal = (item?: any) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({ active: true }); // Default values
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (activeTab === 'items') {
            if (editingId) {
                setItems(items.map(i => i.id === editingId ? { ...formData, id: editingId } : i));
            } else {
                setItems([...items, { ...formData, id: Date.now().toString() }]);
            }
        } else if (activeTab === 'customers') {
            if (editingId) {
                setCustomers(customers.map(c => c.id === editingId ? { ...formData, id: editingId } : c));
            } else {
                setCustomers([...customers, { ...formData, id: Date.now().toString() }]);
            }
        } else {
            if (editingId) {
                setFaultCodes(faultCodes.map(f => f.id === editingId ? { ...formData, id: editingId } : f));
            } else {
                setFaultCodes([...faultCodes, { ...formData, id: Date.now().toString() }]);
            }
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            if (activeTab === 'items') setItems(items.filter(i => i.id !== id));
            else if (activeTab === 'customers') setCustomers(customers.filter(c => c.id !== id));
            else setFaultCodes(faultCodes.filter(f => f.id !== id));
        }
    };

    const Modal = () => (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {editingId ? 'Edit' : 'Add'} {activeTab === 'items' ? 'Item' : activeTab === 'customers' ? 'Customer' : 'Fault Code'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'items' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">PID</label>
                                        <input
                                            type="text"
                                            value={formData.pid || ''}
                                            onChange={e => setFormData({ ...formData, pid: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Standard Cost ($)</label>
                                        <input
                                            type="number"
                                            value={formData.cost || ''}
                                            onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'customers' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Customer Code</label>
                                        <input
                                            type="text"
                                            value={formData.code || ''}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            value={formData.type || 'Distributor'}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="Distributor">Distributor</option>
                                            <option value="Retailer">Retailer</option>
                                            <option value="End-user">End-user</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {activeTab === 'faults' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fault Code</label>
                                        <input
                                            type="text"
                                            value={formData.code || ''}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description || ''}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Group</label>
                                        <select
                                            value={formData.group || 'Electrical'}
                                            onChange={e => setFormData({ ...formData, group: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="Electrical">Electrical</option>
                                            <option value="Mechanical">Mechanical</option>
                                            <option value="Software">Software</option>
                                            <option value="Display">Display</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                                        <select
                                            value={formData.severity || 'Low'}
                                            onChange={e => setFormData({ ...formData, severity: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center">
                                <input
                                    id="active"
                                    type="checkbox"
                                    checked={formData.active || false}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                                    Active
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'items', label: 'Items', icon: Package },
                        { id: 'customers', label: 'Customers', icon: Users },
                        { id: 'faults', label: 'Fault Codes', icon: AlertOctagon },
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

            {/* Content */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {activeTab === 'items' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                    </>
                                )}
                                {activeTab === 'customers' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    </>
                                )}
                                {activeTab === 'faults' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group / Severity</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(activeTab === 'items' ? items : activeTab === 'customers' ? customers : faultCodes).map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    {activeTab === 'items' && (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.pid}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.cost}</td>
                                        </>
                                    )}
                                    {activeTab === 'customers' && (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                                        </>
                                    )}
                                    {activeTab === 'faults' && (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.group} <span className="text-xs text-gray-400">({item.severity})</span>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                            item.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        )}>
                                            {item.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <Modal />}
        </div>
    );
};

export default MasterDataPage;
