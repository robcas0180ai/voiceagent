'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Save, LogOut } from 'lucide-react';

export default function AgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    agent_name: 'Sofía',
    gender: 'female',
    tone: 'profesional y amable',
    company_name: '',
    industry: '',
    product_description: '',
    objections: '',
    voicemail_enabled: true,
    retry_enabled: true,
    max_retries: 2,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/api/agent');
      if (data.config) setForm(data.config);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.post('/api/agent', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">VoiceAgent</span>
          <div className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => router.push('/campaigns')} className="text-gray-400 hover:text-white transition-colors">Campañas</button>
            <button onClick={() => router.push('/pipeline')} className="text-gray-400 hover:text-white transition-colors">Pipeline</button>
            <button onClick={() => router.push('/agent')} className="text-white font-medium">Agente IA</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Configurar Agente IA</h1>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Save size={16} />
            {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="space-y-6">
            {/* Identidad */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Identidad del agente</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Nombre del agente</label>
                  <input className={inputClass} value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} placeholder="Sofía" />
                </div>
                <div>
                  <label className={labelClass}>Género de la voz</label>
                  <select className={inputClass} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="female">Mujer</option>
                    <option value="male">Hombre</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tono</label>
                  <select className={inputClass} value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}>
                    <option value="profesional y amable">Profesional y amable</option>
                    <option value="directo y confiado">Directo y confiado</option>
                    <option value="cercano y casual">Cercano y casual</option>
                    <option value="formal y serio">Formal y serio</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre de la empresa</label>
                  <input className={inputClass} value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className={labelClass}>Industria</label>
                  <input className={inputClass} value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Seguros, Fintech, Salud..." />
                </div>
              </div>
            </div>

            {/* Producto */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Producto y argumentos</h2>
              <div className="mb-4">
                <label className={labelClass}>Descripción del producto</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-none`}
                  value={form.product_description}
                  onChange={e => setForm({ ...form, product_description: e.target.value })}
                  placeholder="Describe tu producto o servicio, beneficios principales, precio..."
                />
              </div>
              <div>
                <label className={labelClass}>Manejo de objeciones</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-none`}
                  value={form.objections}
                  onChange={e => setForm({ ...form, objections: e.target.value })}
                  placeholder="P: Es muy caro → R: Tenemos planes desde $X. P: Ya tengo uno → R: ¿Cuándo fue la última vez que revisaste tu cobertura?"
                />
              </div>
            </div>

            {/* Comportamiento */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Comportamiento de llamadas</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Dejar mensaje de voz</div>
                    <div className="text-xs text-gray-400">Si no contesta después de 3 timbres</div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, voicemail_enabled: !form.voicemail_enabled })}
                    className={`w-10 h-6 rounded-full transition-colors ${form.voicemail_enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${form.voicemail_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Reintentar automáticamente</div>
                    <div className="text-xs text-gray-400">Si no contesta en el primer intento</div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, retry_enabled: !form.retry_enabled })}
                    className={`w-10 h-6 rounded-full transition-colors ${form.retry_enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${form.retry_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {form.retry_enabled && (
                  <div className="flex items-center gap-4 pl-0">
                    <label className="text-sm text-gray-400">Número de reintentos</label>
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={form.max_retries}
                      onChange={e => setForm({ ...form, max_retries: parseInt(e.target.value) })}
                    >
                      <option value={1}>1 vez</option>
                      <option value={2}>2 veces</option>
                      <option value={3}>3 veces</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
