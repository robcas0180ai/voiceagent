import { Request, Response } from 'express';
import { supabase } from '../config/database';

export const getMetrics = async (req: any, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Llamadas del mes
    const { data: calls, error } = await supabase
      .from('calls')
      .select('duration_seconds, status, result, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth);

    if (error) throw error;

    const totalCalls = calls?.length || 0;
    const completedCalls = calls?.filter(c => c.status === 'completed').length || 0;
    const totalMinutes = Math.round((calls?.reduce((a, c) => a + (c.duration_seconds || 0), 0) || 0) / 60);
    const interestedCalls = calls?.filter(c => c.result === 'interesado').length || 0;
    const notInterestedCalls = calls?.filter(c => c.result === 'no_interesado').length || 0;
    const callbackCalls = calls?.filter(c => c.result === 'callback').length || 0;
    const contactRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    const conversionRate = completedCalls > 0 ? Math.round((interestedCalls / completedCalls) * 100) : 0;

    // Llamadas por día este mes
    const callsByDay: { [key: string]: number } = {};
    calls?.forEach(c => {
      const day = new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
      callsByDay[day] = (callsByDay[day] || 0) + 1;
    });

    // Campañas activas
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, status, total_contacts, called')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    return res.json({
      period: `${now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}`,
      totalCalls,
      completedCalls,
      totalMinutes,
      interestedCalls,
      notInterestedCalls,
      callbackCalls,
      contactRate,
      conversionRate,
      callsByDay,
      activeCampaigns: campaigns?.length || 0,
      campaigns: campaigns || []
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
