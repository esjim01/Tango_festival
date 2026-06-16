const crypto = require('crypto');
const { leerUsuarios, leerSesiones, guardarSesiones } = require('./db');

const SESSION_COOKIE_NAME = 'festival_session';

/**
 * Genera un hash seguro para la contraseña.
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verifica si la contraseña coincide con el hash.
 */
function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === verifyHash;
}

/**
 * Middleware para proteger rutas de administración.
 */
async function authMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE_NAME];

    const isApiRequest = req.path.startsWith('/api/');

    if (!sessionId) {
        if (isApiRequest) {
            return res.status(401).json({ error: 'No autorizado. Inicie sesión.' });
        } else {
            return res.redirect('/login.html');
        }
    }

    const sesiones = await leerSesiones();
    const sesion = sesiones[sessionId];

    if (!sesion || sesion.expires < Date.now()) {
        if (sesion) {
            delete sesiones[sessionId];
            await guardarSesiones(sesiones);
        }
        if (isApiRequest) {
            return res.status(401).json({ error: 'Sesión expirada o inválida.' });
        } else {
            return res.redirect('/login.html');
        }
    }

    req.user = sesion.user;
    next();
}

/**
 * Utilidad para parsear cookies manualmente.
 */
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        list[name] = decodeURIComponent(value);
    });

    return list;
}

module.exports = {
    hashPassword,
    verifyPassword,
    authMiddleware,
    SESSION_COOKIE_NAME
};
