import { Request, Response } from 'express';
import { supabase } from '../config/database';

export const getAgentConfig = async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return res.json({ config: data || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const saveAgentConfig = async (req: any, res: Response) => {
  const {
    agent_name, gender, tone, company_name,
    industry, product_description, objections,
    voicemail_enabled, retry_enabled, max_retries
  } = req.body;

  try {
    const { data: existing } = await supabase
      .from('agent_configs')
      .select('id')
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('agent_configs')
        .update({
          agent_name, gender, tone, company_name,
          industry, product_description, objections,
          voicemail_enabled, retry_enabled, max_retries,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', req.user.tenantId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ message: 'Configuración actualizada', config: data });
    } else {
      const { data, error } = await supabase
        .from('agent_configs')
        .insert({
          tenant_id: req.user.tenantId,
          agent_name, gender, tone, company_name,
          industry, product_description, objections,
          voicemail_enabled, retry_enabled, max_retries
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ message: 'Configuración creada', config: data });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
