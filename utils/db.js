const fs = require('fs-extra');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');
const CALIFICACIONES_FILE = path.join(__dirname, '../calificaciones_detalles.json');
const USERS_FILE = path.join(__dirname, '../users.json');
const SESSIONS_FILE = path.join(__dirname, '../sessions.json');

/**
 * Asegura que el objeto DB tenga la estructura básica requerida.
 */
function normalizarData(db) {
    const defaultData = {
        configuracion: {
            banners: [],
            hero_principal: '',
            link_whatsapp: '',
            footer_texto: '',
            footer_contacto: ''
        },
        paquetes: [],
        talento: [],
        inscripciones: []
    };

    const data = { ...defaultData, ...db };
    
    // Profundizar en configuracion
    data.configuracion = { ...defaultData.configuracion, ...data.configuracion };
    
    // Validar arrays
    if (!Array.isArray(data.configuracion.banners)) data.configuracion.banners = [];
    if (!Array.isArray(data.paquetes)) data.paquetes = [];
    if (!Array.isArray(data.talento)) data.talento = [];
    if (!Array.isArray(data.inscripciones)) data.inscripciones = [];
    
    // Asegurar integridad de talento
    data.talento.forEach(persona => {
        if (!Array.isArray(persona.calificaciones)) persona.calificaciones = [];
        if (typeof persona.promedio !== 'number') persona.promedio = 0;
    });

    return data;
}

async function leerBaseDatos() {
    try {
        if (!(await fs.pathExists(DATA_FILE))) {
            const dataInicial = normalizarData({});
            await fs.writeJson(DATA_FILE, dataInicial, { spaces: 2 });
            return dataInicial;
        }
        const data = await fs.readJson(DATA_FILE);
        return normalizarData(data);
    } catch (error) {
        console.error("❌ Error al leer la base de datos:", error.message);
        return normalizarData({});
    }
}

async function guardarBaseDatos(data) {
    try {
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error al guardar la base de datos:", error.message);
        throw new Error("No se pudo persistir la información.");
    }
}

async function leerCalificacionesDetalles() {
    try {
        if (!(await fs.pathExists(CALIFICACIONES_FILE))) {
            await fs.writeJson(CALIFICACIONES_FILE, [], { spaces: 2 });
            return [];
        }
        return await fs.readJson(CALIFICACIONES_FILE);
    } catch (error) {
        console.error("❌ Error al leer calificaciones detalladas:", error.message);
        return [];
    }
}

async function guardarCalificacionesDetalles(data) {
    try {
        await fs.writeJson(CALIFICACIONES_FILE, data, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error al guardar calificaciones detalladas:", error.message);
        throw new Error("No se pudo persistir las calificaciones detalladas.");
    }
}

async function leerUsuarios() {
    try {
        if (!(await fs.pathExists(USERS_FILE))) {
            await fs.writeJson(USERS_FILE, [], { spaces: 2 });
            return [];
        }
        return await fs.readJson(USERS_FILE);
    } catch (error) {
        console.error("❌ Error al leer usuarios:", error.message);
        return [];
    }
}

async function guardarUsuarios(usuarios) {
    try {
        await fs.writeJson(USERS_FILE, usuarios, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error al guardar usuarios:", error.message);
        throw new Error("No se pudo guardar los usuarios.");
    }
}

async function leerSesiones() {
    try {
        if (!(await fs.pathExists(SESSIONS_FILE))) {
            await fs.writeJson(SESSIONS_FILE, {}, { spaces: 2 });
            return {};
        }
        return await fs.readJson(SESSIONS_FILE);
    } catch (error) {
        console.error("❌ Error al leer sesiones:", error.message);
        return {};
    }
}

async function guardarSesiones(sesiones) {
    try {
        await fs.writeJson(SESSIONS_FILE, sesiones, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error al guardar sesiones:", error.message);
        throw new Error("No se pudo guardar las sesiones.");
    }
}

module.exports = {
    leerBaseDatos,
    guardarBaseDatos,
    leerCalificacionesDetalles,
    guardarCalificacionesDetalles,
    leerUsuarios,
    guardarUsuarios,
    leerSesiones,
    guardarSesiones,
    CALIFICACIONES_FILE
};

