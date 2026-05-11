import jwt from 'jsonwebtoken';

/**
 * Middleware: verifica se o token JWT é válido
 */
export function verifyToken(req, res, next) {
  let token = req.query.token;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const [type, t] = authHeader.split(' ');
    if (type === 'Bearer') token = t;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Token não informado.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não definido');
    }

    const decoded = jwt.verify(token, secret);

    /**
     * decoded contém exatamente o que você colocou no signToken:
     * {
     *   sub,
     *   username,
     *   name,
     *   role,
     *   iat,
     *   exp
     * }
     */
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido ou expirado.',
    });
  }
}

/**
 * Middleware: valida role do usuário
 */
export function checkRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado.',
      });
    }

    next();
  };
}