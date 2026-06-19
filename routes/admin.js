const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { 
    leerBaseDatos, 
    guardarBaseDatos, 
    CALIFICACIONES_FILE,
    leerCalificacionesDetalles 
} = require('../utils/db');

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.ensureDir(UPLOADS_DIR);
            cb(null, UPLOADS_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
        const baseName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .toLowerCase();
        cb(null, `${Date.now()}-${baseName}${extension}`);
    }
});

// Filtro para permitir solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)'), false);
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Utilidad para borrar archivos de forma segura
async function borrarArchivoSeguro(rutaRelativa) {
    if (!rutaRelativa || rutaRelativa.includes('default-profile.jpg')) return;
    
    // La ruta viene como /uploads/nombre.jpg, la convertimos a ruta física
    const nombreArchivo = path.basename(rutaRelativa);
    const rutaAbsoluta = path.join(UPLOADS_DIR, nombreArchivo);
    
    try {
        if (await fs.pathExists(rutaAbsoluta)) {
            await fs.remove(rutaAbsoluta);
        }
    } catch (e) {
        console.warn(`No se pudo borrar el archivo: ${rutaAbsoluta}`, e.message);
    }
}

function crearId(prefijo, nombre) {
    const limpio = (nombre || prefijo)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return `${limpio || prefijo}-${Date.now()}`;
}

// RUTA: Obtener todas las inscripciones
router.get('/inscripciones', async (req, res) => {
    try {
        const db = await leerBaseDatos();
        res.json(db.inscripciones);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las inscripciones." });
    }
});

router.put('/inscripciones/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        nombre_completo, 
        email, 
        telefono, 
        paquete_id, 
        metodo_pago, 
        tarjeta_titular, 
        tarjeta_numero, 
        tarjeta_expiracion, 
        datos_pago_referencia 
    } = req.body;

    try {
        const db = await leerBaseDatos();
        const registro = db.inscripciones.find(ins => ins.id_registro === id);

        if (!registro) return res.status(404).json({ error: 'Registro no encontrado.' });

        if (nombre_completo) registro.nombre_completo = nombre_completo;
        if (email) registro.email = email;
        if (telefono) registro.telefono = telefono;
        
        if (paquete_id) {
            const pkg = db.paquetes.find(p => p.id === paquete_id);
            if (pkg) {
                registro.paquete = { id: pkg.id, nombre: pkg.nombre, precio: pkg.precio };
            }
        }

        if (metodo_pago) registro.pago.metodo = metodo_pago;
        if (tarjeta_titular) registro.pago.titular = tarjeta_titular;
        
        if (tarjeta_numero) {
            const ultimos4 = String(tarjeta_numero).replace(/\D/g, '').slice(-4);
            registro.pago.numero_enmascarado = `**** **** **** ${ultimos4}`;
            registro.pago.ultimos4 = ultimos4;
        }

        if (tarjeta_expiracion) registro.pago.expiracion = tarjeta_expiracion;
        if (datos_pago_referencia) registro.pago.referencia = datos_pago_referencia;

        await guardarBaseDatos(db);
        res.json({ mensaje: 'Inscripción actualizada correctamente.', registro });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la inscripción.' });
    }
});

router.delete('/inscripciones/:id', async (req, res) => {
    try {
        const db = await leerBaseDatos();
        const index = db.inscripciones.findIndex(ins => ins.id_registro === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Registro no encontrado.' });

        db.inscripciones.splice(index, 1);
        await guardarBaseDatos(db);
        res.json({ mensaje: 'Inscripción eliminada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la inscripción.' });
    }
});

// RUTA: Descargar calificaciones detalladas (Formato CSV para Excel)
router.get('/descargar/calificaciones', async (req, res) => {
    try {
        const calificaciones = await leerCalificacionesDetalles();
        
        // Encabezados del CSV
        let csv = "\uFEFF"; // BOM para que Excel detecte UTF-8
        csv += "ID Calificación,Fecha,ID Talento,Nombre Talento,Rol Talento,Puntaje,Nombre Usuario,Teléfono Usuario\n";
        
        calificaciones.forEach(c => {
            const fila = [
                c.id,
                c.fecha,
                c.talentoId,
                c.talentoNombre,
                c.talentoRol,
                c.voto,
                c.usuarioNombre,
                c.usuarioTelefono
            ];
            // Escapar comas y comillas para CSV seguro
            const filaSegura = fila.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
            csv += filaSegura + "\n";
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=calificaciones_festival.csv');
        res.status(200).send(csv);
    } catch (error) {
        console.error("Error al exportar calificaciones:", error.message);
        res.status(500).json({ error: "No se pudo generar el archivo de exportación." });
    }
});

// RUTA: Modificar configuración de la página
router.put('/configuracion', async (req, res) => {
    const { 
        link_whatsapp, 
        banners, 
        footer_texto, 
        footer_contacto, 
        hero_principal,
        pago_nequi_habilitado,
        pago_nequi_datos,
        pago_transferencia_habilitado,
        pago_transferencia_datos
    } = req.body;

    try {
        const db = await leerBaseDatos();
        if (link_whatsapp !== undefined) db.configuracion.link_whatsapp = String(link_whatsapp);
        if (Array.isArray(banners)) db.configuracion.banners = banners;
        if (footer_texto !== undefined) db.configuracion.footer_texto = String(footer_texto);
        if (footer_contacto !== undefined) db.configuracion.footer_contacto = String(footer_contacto);
        if (hero_principal !== undefined) db.configuracion.hero_principal = String(hero_principal);

        if (pago_nequi_habilitado !== undefined) db.configuracion.pago_nequi_habilitado = !!pago_nequi_habilitado;
        if (pago_nequi_datos !== undefined) db.configuracion.pago_nequi_datos = String(pago_nequi_datos);
        if (pago_transferencia_habilitado !== undefined) db.configuracion.pago_transferencia_habilitado = !!pago_transferencia_habilitado;
        if (pago_transferencia_datos !== undefined) db.configuracion.pago_transferencia_datos = String(pago_transferencia_datos);

        await guardarBaseDatos(db);
        res.json({ mensaje: "Configuración actualizada con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la configuración." });
    }
});

// PAQUETES
router.post('/paquetes', async (req, res) => {
    const { nombre, precio, precio_pareja, badge, caracteristicas } = req.body;

    if (!nombre || precio === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
    }

    try {
        const db = await leerBaseDatos();
        const nuevoPaquete = {
            id: crearId('paquete', nombre),
            nombre,
            precio: String(precio),
            precio_pareja: precio_pareja ? String(precio_pareja) : '',
            badge: badge || '',
            caracteristicas: Array.isArray(caracteristicas)
                ? caracteristicas
                    .filter(c => c && c.texto)
                    .map(c => ({ texto: c.texto, incluido: !!c.incluido }))
                : []
        };

        db.paquetes.push(nuevoPaquete);
        await guardarBaseDatos(db);
        res.status(201).json({ mensaje: 'Paquete creado.', paquete: nuevoPaquete });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el paquete.' });
    }
});

router.put('/paquetes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, precio_pareja, badge, caracteristicas } = req.body;

    try {
        const db = await leerBaseDatos();
        const paquete = db.paquetes.find(p => p.id === id);

        if (!paquete) return res.status(404).json({ error: 'Paquete no encontrado.' });

        if (nombre) paquete.nombre = nombre;
        if (precio !== undefined) paquete.precio = String(precio);
        if (precio_pareja !== undefined) paquete.precio_pareja = String(precio_pareja);
        if (badge !== undefined) paquete.badge = badge;
        if (Array.isArray(caracteristicas)) {
            paquete.caracteristicas = caracteristicas
                .filter(c => c && c.texto)
                .map(c => ({ texto: c.texto, incluido: !!c.incluido }));
        }

        await guardarBaseDatos(db);
        res.json({ mensaje: 'Paquete actualizado.', paquete });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el paquete.' });
    }
});


router.delete('/paquetes/:id', async (req, res) => {
    try {
        const db = await leerBaseDatos();
        const index = db.paquetes.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Paquete no encontrado.' });

        db.paquetes.splice(index, 1);
        await guardarBaseDatos(db);
        res.json({ mensaje: 'Paquete eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el paquete.' });
    }
});

// CARGA DE IMÁGENES
router.post('/upload/hero', upload.single('heroImage'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    try {
        const db = await leerBaseDatos();
        if (db.configuracion.hero_principal) {
            await borrarArchivoSeguro(db.configuracion.hero_principal);
        }
        db.configuracion.hero_principal = `/uploads/${req.file.filename}`;
        await guardarBaseDatos(db);
        res.status(201).json({ mensaje: 'Hero actualizado.', hero_principal: db.configuracion.hero_principal });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la imagen del hero.' });
    }
});

router.post('/upload/banners', upload.array('bannerImages', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se recibieron imágenes.' });

    try {
        const db = await leerBaseDatos();
        const nuevosBanners = req.files.map(f => `/uploads/${f.filename}`);
        db.configuracion.banners = [...(db.configuracion.banners || []), ...nuevosBanners];
        await guardarBaseDatos(db);
        res.status(201).json({ mensaje: 'Banners añadidos con éxito.', banners: db.configuracion.banners });
    } catch (error) {
        res.status(500).json({ error: 'Error al subir los banners.' });
    }
});

// TALENTO
router.post('/talento', async (req, res) => {
    const { nombre, biografia, rol } = req.body;
    if (!nombre || !biografia || !rol) return res.status(400).json({ error: 'Faltan campos obligatorios.' });

    try {
        const db = await leerBaseDatos();
        const nuevoTalento = {
            id: crearId('talento', nombre),
            nombre, rol, biografia,
            foto: '/uploads/default-profile.jpg',
            calificaciones: [],
            promedio: 0
        };
        db.talento.push(nuevoTalento);
        await guardarBaseDatos(db);
        res.status(201).json({ mensaje: 'Talento agregado.', talento: nuevoTalento });
    } catch (error) {
        res.status(500).json({ error: 'Error al agregar talento.' });
    }
});

router.put('/talento/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, biografia, rol } = req.body;

    try {
        const db = await leerBaseDatos();
        const persona = db.talento.find(t => t.id === id);

        if (!persona) return res.status(404).json({ error: 'Talento no encontrado.' });

        if (nombre) persona.nombre = nombre;
        if (biografia) persona.biografia = biografia;
        if (rol) persona.rol = rol;

        await guardarBaseDatos(db);
        res.json({ mensaje: 'Talento actualizado correctamente.', talento: persona });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar talento.' });
    }
});

router.post('/upload/talento/:id', upload.single('talentoImage'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    try {
        const db = await leerBaseDatos();
        const persona = db.talento.find(t => t.id === req.params.id);
        if (!persona) return res.status(404).json({ error: 'Talento no encontrado.' });

        await borrarArchivoSeguro(persona.foto);
        persona.foto = `/uploads/${req.file.filename}`;
        await guardarBaseDatos(db);
        res.status(201).json({ mensaje: 'Foto de talento actualizada.', foto: persona.foto });
    } catch (error) {
        res.status(500).json({ error: 'Error al subir la foto.' });
    }
});

router.delete('/talento/:id', async (req, res) => {
    try {
        const db = await leerBaseDatos();
        const index = db.talento.findIndex(t => t.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Talento no encontrado.' });

        await borrarArchivoSeguro(db.talento[index].foto);
        db.talento.splice(index, 1);
        await guardarBaseDatos(db);
        res.json({ mensaje: 'Talento eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar talento.' });
    }
});

module.exports = router;