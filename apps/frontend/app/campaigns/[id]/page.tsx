'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { Phone, Plus, ArrowLeft, LogOut, Upload, X, Trash2 } from 'lucide-react';
import CSVUpload from '@/components/ui/CSVUpload';
import Navbar from '@/components/ui/Navbar';

const normalizePhone = (raw: string): string => {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) digits = digits.slice(2);
  if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('1') && digits.length === 11) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length !== 10) return '';
  return `+52${digits}`;
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [phoneError, setPhoneError] = useState('');
  const [deleteError, setDeleteError] = useState<{id: string, msg: string} | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campRes, contRes] = await Promise.all([
        api.get(`/api/campaigns/${id}`),
        api.get(`/api/campaigns/${id}/contacts`)
      ]);
      setCampaign(campRes.data.campaign);
      setContacts(contRes.data.contacts || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const makeCall = async (contactId: string) => {
    setCalling(contactId);
    try {
      await api.post(`/api/calls/contact/${contactId}`);
      alert('✅ Llamada iniciada');
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.response?.data?.error);
    } finally { setCalling(null); }
  };

  const deleteContact = async (contactId: string, contactName: string) => {
    setDeleteError(null);
    if (!confirm(`¿Eliminar a ${contactName || 'este contacto'}?\n\nNota: solo se puede eliminar si no tiene llamadas registradas.`)) return;
    setDeleting(contactId);
    try {
      await api.delete(`/api/campaigns/${id}/contacts/${contactId}`);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al eliminar';
      setDeleteError({ id: contactId, msg });
    } finally {
      setDeleting(null);
    }
  };

  const addContact = async () => {
    setPhoneError('');
    if (!newContact.phone.trim()) { setPhoneError('El teléfono es requerido'); return; }
    const phone = normalizePhone(newContact.phone);
    if (!phone) { setPhoneError('Número inválido — ingresa 10 dígitos'); return; }
    try {
      await api.post(`/api/campaigns/${id}/contacts`, { ...newContact, phone });
      setNewContact({ name: '', phone: '' });
      setShowForm(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const stageBadge = (stage: string) => {
    const map: any = {
      to_call: 'bg-gray-800 text-gray-400 border-gray-700',
      called: 'bg-blue-950 text-blue-400 border-blue-800',
      interested: 'bg-green-950 text-green-400 border-green-800',
      not_interested: 'bg-red-950 text-red-400 border-red-800',
      callback: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    };
    return map[stage] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const stageLabel: any = {
    to_call: 'Por llamar', called: 'Llamado', interested: 'Interesado',
    not_interested: 'No interesado', callback: 'Rellamar'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="p-6 max-w-7xl mx-auto">
        <button onClick={() => router.push('/campaigns')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> Volver a campañas
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{campaign?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{contacts.length} contactos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCSV(!showCSV); setShowForm(false); }}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Upload size={16} /> Importar CSV
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowCSV(false); setPhoneError(''); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Agregar contacto
            </button>
          </div>
        </div>

        {/* CSV Upload */}
        {showCSV && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">Importar contactos desde CSV</h3>
              <button onClick={() => setShowCSV(false)} className="text-gray-600 hover:text-gray-400"><X size={16} /></button>
            </div>
            <CSVUpload campaignId={id as string} onSuccess={() => { setShowCSV(false); fetchData(); }} />
          </div>
        )}

        {/* Formulario manual */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Nombre (opcional)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <div className="flex">
                  <div className="flex items-center bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg px-3 text-sm text-gray-300 whitespace-nowrap">
                    🇲🇽 +52
                  </div>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={e => { setNewContact({ ...newContact, phone: e.target.value }); setPhoneError(''); }}
                    placeholder="81 1234 5678"
                    className={`flex-1 bg-gray-800 border rounded-r-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 ${phoneError ? 'border-red-500' : 'border-gray-700'}`}
                  />
                </div>
                {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
              </div>
              <button onClick={addContact} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap">Agregar</button>
              <button onClick={() => { setShowForm(false); setPhoneError(''); }} className="text-gray-400 hover:text-white p-2"><X size={16} /></button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Upload size={32} className="mx-auto mb-3 opacity-30" />
            <p className="mb-2">No hay contactos en esta campaña</p>
            <p className="text-sm">Importa un CSV o agrega contactos manualmente</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-800">
                  <th className="px-6 py-3 text-left">Nombre</th>
                  <th className="px-6 py-3 text-left">Teléfono</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{c.name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-300 font-mono">{c.phone}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${stageBadge(c.pipeline_stage)}`}>
                        {stageLabel[c.pipeline_stage] || c.pipeline_stage}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => makeCall(c.id)}
                          disabled={calling === c.id}
                          className="flex items-center gap-1.5 text-xs bg-blue-950 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
                        >
                          <Phone size={12} />
                          {calling === c.id ? 'Llamando...' : 'Llamar'}
                        </button>
                        <button
                          onClick={() => deleteContact(c.id, c.name)}
                          disabled={deleting === c.id}
                          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 disabled:opacity-50 transition-colors p-1.5"
                          title="Eliminar contacto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {deleteError !== null && deleteError.id === c.id && (
                        <p className="text-xs text-red-400 mt-1 max-w-xs">{deleteError.msg}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
