import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';

// Registro de nuevo tenant + usuario admin
export const register = async (req: Request, res: Response) => {
  const { tenantName, email, password } = req.body;

  if (!tenantName || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    // Crear tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: tenantName, email })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Hashear password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenant.id,
        name: tenantName,
        email,
        password_hash: passwordHash,
        role: 'admin'
      })
      .select()
      .single();

    if (userError) throw userError;

    // Generar token
    const token = jwt.sign(
      { id: user.id, tenantId: tenant.id, email, role: 'admin' },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Cuenta creada exitosamente',
      token,
      user: { id: user.id, email, role: 'admin', tenantId: tenant.id }
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Error al registrar' });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, tenants(*)')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenant_id, email, role: user.role },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email, role: user.role, tenantId: user.tenant_id }
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Error al iniciar sesión' });
  }
};

// Obtener perfil
export const getProfile = async (req: any, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, tenant_id, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
