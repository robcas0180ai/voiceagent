import { Request, Response } from 'express';
import { supabase } from '../config/database';

// Listar contactos de una campaña
export const getContacts = async (req: any, res: Response) => {
  const { campaignId } = req.params;

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ contacts: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Agregar contacto
export const createContact = async (req: any, res: Response) => {
  const { campaignId } = req.params;
  const { name, phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Teléfono requerido' });
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        phone,
        campaign_id: campaignId,
        tenant_id: req.user.tenantId,
        status: 'pending',
        pipeline_stage: 'to_call'
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ message: 'Contacto agregado', contact: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Carga masiva de contactos (array)
export const bulkCreateContacts = async (req: any, res: Response) => {
  const { campaignId } = req.params;
  const { contacts } = req.body;

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Lista de contactos requerida' });
  }

  try {
    const contactsToInsert = contacts.map((c: any) => ({
      name: c.name || null,
      phone: c.phone,
      campaign_id: campaignId,
      tenant_id: req.user.tenantId,
      status: 'pending',
      pipeline_stage: 'to_call'
    }));

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select();

    if (error) throw error;

    // Actualizar contador
    await supabase
      .from('campaigns')
      .update({ total_contacts: data.length })
      .eq('id', campaignId);

    return res.status(201).json({
      message: `${data.length} contactos agregados`,
      contacts: data
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Actualizar stage del pipeline
export const updateContactStage = async (req: any, res: Response) => {
  const { id } = req.params;
  const { pipeline_stage, notes } = req.body;

  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({ pipeline_stage, notes })
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ message: 'Contacto actualizado', contact: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Eliminar contacto (solo si no tiene llamadas)
export const deleteContact = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    // Verificar si tiene llamadas
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id')
      .eq('contact_id', id)
      .limit(1);

    if (callsError) throw callsError;

    if (calls && calls.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar este contacto porque ya tiene llamadas registradas. El consumo de minutos y llamadas se mantiene en tu plan.'
      });
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId);

    if (error) throw error;
    return res.json({ message: 'Contacto eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
