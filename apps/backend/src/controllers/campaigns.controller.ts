import { Request, Response } from 'express';
import { supabase } from '../config/database';

// Listar campañas del tenant
export const getCampaigns = async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ campaigns: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Crear campaña
export const createCampaign = async (req: any, res: Response) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nombre de campaña requerido' });
  }

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ name, tenant_id: req.user.tenantId, status: 'draft' })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ message: 'Campaña creada', campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Obtener campaña por ID
export const getCampaign = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, contacts(*)')
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Campaña no encontrada' });
    return res.json({ campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Actualizar estado de campaña
export const updateCampaign = async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, status } = req.body;

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ name, status })
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ message: 'Campaña actualizada', campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Eliminar campaña
export const deleteCampaign = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId);

    if (error) throw error;
    return res.json({ message: 'Campaña eliminada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
