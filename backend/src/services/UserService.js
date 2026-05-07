import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/UserRepository.js';

const SALT       = 10;
const VALID_ROLES = ['admin', 'gestor'];

function signToken(user) {
  const secret  = process.env.JWT_SECRET;
  const expires = process.env.JWT_EXPIRES_IN || '8h';

  if (!secret) throw new Error('JWT_SECRET não definido no .env');

  return jwt.sign(
    {
      sub:      user.id,
      username: user.username,
      name:     user.name,
      role:     user.role,
    },
    secret,
    { expiresIn: expires }
  );
}

class UserService {
  // ── Login ──────────────────────────────────────────────
  async login(username, password) {
    const user = await UserRepository.getByUsername(username);

    if (!user) {
      return { error: true, status: 401, message: 'Usuário ou senha incorretos.' };
    }
    if (!user.active) {
      return { error: true, status: 403, message: 'Usuário inativo. Contate o administrador.' };
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return { error: true, status: 401, message: 'Usuário ou senha incorretos.' };
    }

    const token = signToken(user);

    // Nunca retornar o hash
    const { password: _pw, ...safe } = user;

    return {
      data: {
        token,
        user: safe,
      },
    };
  }

  // ── CRUD ───────────────────────────────────────────────
  async listAll() {
    try {
      return { data: await UserRepository.getAll() };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async create({ username, password, name, email, role, active }) {
    if (!username || !password || !name) {
      return { error: true, status: 400, message: 'Username, senha e nome são obrigatórios.' };
    }
    if (!VALID_ROLES.includes(role)) {
      return { error: true, status: 400, message: `Role inválido. Use: ${VALID_ROLES.join(', ')}.` };
    }
    if (password.length < 4) {
      return { error: true, status: 400, message: 'Senha deve ter no mínimo 4 caracteres.' };
    }

    try {
      const password_hash = await bcrypt.hash(password, SALT);
      const row = await UserRepository.create({ username, password_hash, name, email, role, active });
      return { data: row };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async update(id, { username, password, name, email, role, active }) {
    let password_hash;

    if (password) {
      if (password.length < 4) {
        return { error: true, status: 400, message: 'Senha deve ter no mínimo 4 caracteres.' };
      }
      password_hash = await bcrypt.hash(password, SALT);
    }

    try {
      const { row, rowCount } = await UserRepository.update(id, {
        username,
        password_hash,
        name,
        email,
        role,
        active: active !== undefined
          ? (active === true || active === 'true')
          : undefined,
      });

      if (!rowCount) {
        return { error: true, status: 404, message: 'Usuário não encontrado.' };
      }
      return { data: row };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async delete(id, requestingUserId) {
    if (Number(id) === Number(requestingUserId)) {
      return { error: true, status: 400, message: 'Você não pode excluir seu próprio usuário.' };
    }
    try {
      const rowCount = await UserRepository.delete(id);
      if (!rowCount) {
        return { error: true, status: 404, message: 'Usuário não encontrado.' };
      }
      return { data: { deleted: true, id } };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  // ── Privado ────────────────────────────────────────────
  _handleDbError(err) {
    console.error('USER DB ERROR:', err.code, err.message);
    if (err.code === '23505') {
      return { error: true, status: 409, message: 'Username ou e-mail já cadastrado.' };
    }
    return { error: true, status: 500, message: 'Erro interno.' };
  }
}

export default new UserService();
