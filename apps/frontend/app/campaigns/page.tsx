'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, Play, Pause, Trash2, Users, PhoneCall } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get('/api/campaigns');
      setCampaigns(data.campaigns || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createCampaign = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/api/campaigns', { name: newName });
      setNewName(''); setShowForm(false); fetchCampaigns();
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/campaigns/${id}`, { status });
      fetchCampaigns();
    } catch (err) { console.error(err); }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      await api.delete(`/api/campaigns/${id}`);
      fetchCampaigns();
    } catch (err) { console.error(err); }
  };

  const startCampaign = async (id: string, name: string, totalContacts: number) => {
    if (!confirm(`¿Iniciar llamadas para "${name}"?\n\nSe llamará a ${totalContacts} contactos pendientes en secuencia.`)) return;
    setStarting(id);
    try {
      const { data } = await api.post(`/api/campaigns/${id}/start`);
      alert(`✅ ${data.message}`);
      fetchCampaigns();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || 'No se pudo iniciar'));
    } finally { setStarting(null); }
  };

  const statusBadge = (status: string) => {
    const map: any = {
      active: 'bg-green-950 text-green-400 border-green-800',
      draft: 'bg-gray-800 text-gray-400 border-gray-700',
      paused: 'bg-yellow-950 text-yellow-400 border-yellow-800',
      completed: 'bg-blue-950 text-blue-400 border-blue-800',
    };
    return map[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const statusLabel: any = { active: 'Activa', draft: 'Borrador', paused: 'Pausada', completed: 'Completada' };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Campañas</h1>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Nueva campaña
          </button>
        </div>
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex gap-3">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la campaña" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500" onKeyDown={e => e.key === 'Enter' && createCampaign()} autoFocus />
            <button onClick={createCampaign} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">Crear</button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
          </div>
        )}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No hay campañas. Crea una para empezar.</div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium mb-1">{c.name}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge(c.status)}`}>{statusLabel[c.status] || c.status}</span>
                      <span className="flex items-center gap-1"><Users size={12} />{c.total_contacts} contactos</span>
                      {c.called > 0 && <span className="text-blue-400">{c.called} llamadas</span>}
                      <span>{new Date(c.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startCampaign(c.id, c.name, c.total_contacts)} disabled={starting === c.id || c.total_contacts === 0} className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors">
                      <PhoneCall size={14} />
                      {starting === c.id ? 'Iniciando...' : 'Iniciar llamadas'}
                    </button>
                    {c.status !== 'active' ? (
                      <button onClick={() => updateStatus(c.id, 'active')} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <Play size={12} /> Activar
                      </button>
                    ) : (
                      <button onClick={() => updateStatus(c.id, 'paused')} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <Pause size={12} /> Pausar
                      </button>
                    )}
                    <button onClick={() => router.push(`/campaigns/${c.id}`)} className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">Ver contactos</button>
                    <button onClick={() => deleteCampaign(c.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
