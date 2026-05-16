'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { Phone, Plus, ArrowLeft, LogOut } from 'lucide-react';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
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
    } finally {
      setCalling(null);
    }
  };

  const addContact = async () => {
    if (!newContact.phone.trim()) return;
    try {
      await api.post(`/api/campaigns/${id}/contacts`, newContact);
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
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">VoiceAgent</span>
          <div className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => router.push('/campaigns')} className="text-white font-medium">Campañas</button>
            <button onClick={() => router.push('/pipeline')} className="text-gray-400 hover:text-white transition-colors">Pipeline</button>
            <button onClick={() => router.push('/agent')} className="text-gray-400 hover:text-white transition-colors">Agente IA</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        <button onClick={() => router.push('/campaigns')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> Volver a campañas
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{campaign?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{contacts.length} contactos</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Agregar contacto
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex gap-3">
            <input
              type="text"
              value={newContact.name}
              onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              placeholder="Nombre"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newContact.phone}
              onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
              placeholder="+52 81 1234 5678"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button onClick={addContact} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">Agregar</button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
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
                    <td className="px-6 py-3 text-sm text-gray-300">{c.phone}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${stageBadge(c.pipeline_stage)}`}>
                        {stageLabel[c.pipeline_stage] || c.pipeline_stage}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => makeCall(c.id)}
                        disabled={calling === c.id}
                        className="flex items-center gap-1.5 text-xs bg-blue-950 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
                      >
                        <Phone size={12} />
                        {calling === c.id ? 'Llamando...' : 'Llamar'}
                      </button>
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
