const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { leerUsuarios, guardarUsuarios, leerSesiones, guardarSesiones } = require('./utils/db');
const { hashPassword, verifyPassword, authMiddleware, SESSION_COOKIE_NAME } = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Proteger acceso directo a admin.html
app.get('/admin.html', (req, res) => {
    res.redirect('/admin');
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    index: 'index.html'
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de Autenticación
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const usuarios = await leerUsuarios();
    const usuario = usuarios.find(u => u.username === username);

    if (usuario && verifyPassword(password, usuario.password)) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const sesiones = await leerSesiones();
        
        sesiones[sessionId] = {
            user: { username: usuario.username },
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        };
        
        await guardarSesiones(sesiones);
        
        res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=86400`);
        res.json({ mensaje: 'Login exitoso' });
    } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const header = req.headers.cookie;
    const list = {};
    if (header) {
        header.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    const sessionId = list[SESSION_COOKIE_NAME];
    
    if (sessionId) {
        const sesiones = await leerSesiones();
        delete sesiones[sessionId];
        await guardarSesiones(sesiones);
    }
    
    res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
    res.json({ mensaje: 'Sesión cerrada' });
});

// Ruta para servir admin.html protegida
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Rutas de API
const rutasPublicas = require('./routes/publicas');
const rutasAdmin = require('./routes/admin');

app.use('/api/public', rutasPublicas);
app.use('/api/admin', authMiddleware, rutasAdmin); // Protegemos todas las rutas de admin

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicialización de usuario admin por defecto
async function inicializarAdmin() {
    const usuarios = await leerUsuarios();
    // Forzamos el reset para asegurar que el hash sea válido en este entorno
    const passwordHash = hashPassword('admin123');
    const adminUser = {
        username: 'admin',
        password: passwordHash
    };
    
    const index = usuarios.findIndex(u => u.username === 'admin');
    if (index !== -1) {
        usuarios[index] = adminUser;
    } else {
        usuarios.push(adminUser);
    }
    
    await guardarUsuarios(usuarios);
    console.log('✅ Usuario admin actualizado/creado (admin:admin123)');
}

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', async () => {
    await inicializarAdmin();
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error("❌ ERROR AL INICIAR SERVIDOR:", err);
});