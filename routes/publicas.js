const express = require('express');
const router = express.Router();
const { 
    leerBaseDatos, 
    guardarBaseDatos, 
    leerCalificacionesDetalles, 
    guardarCalificacionesDetalles 
} = require('../utils/db');

/**
 * Obtiene los últimos 4 dígitos de un número (útil para tarjetas).
 */
function obtenerUltimos4(valor) {
    const soloDigitos = String(valor || '').replace(/\D/g, '');
    return soloDigitos.slice(-4);
}

// RUTA: Obtener info para la Landing Page
router.get('/info', async (req, res) => {
    try {
        const db = await leerBaseDatos();
        res.json({
            configuracion: db.configuracion,
            paquetes: db.paquetes,
            talento: db.talento.map(({ id, nombre, rol, biografia, foto, promedio, calificaciones }) => ({
                id, nombre, rol, biografia, foto, promedio,
                votos: calificaciones ? calificaciones.length : 0
            }))
        });
    } catch (error) {
        console.error("Error en /info:", error.message);
        res.status(500).json({ error: "Error al obtener la información pública." });
    }
});

/**
 * Obtiene la fecha y hora actual en el formato de Colombia.
 */
function obtenerFechaColombia() {
    return new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }).replace(' ', 'T');
}

// RUTA: Registrar nueva inscripción
router.post('/inscripciones', async (req, res) => {
    const { 
        nombre_completo, 
        email, 
        telefono, 
        paquete_id, 
        metodo_pago, 
        tarjeta_titular, 
        tarjeta_numero, 
        tarjeta_expiracion, 
        tarjeta_cvv, 
        datos_pago_referencia 
    } = req.body;

    try {
        const db = await leerBaseDatos();
        const paqueteSeleccionado = db.paquetes.find(pkg => pkg.id === paquete_id);

        if (!paqueteSeleccionado) {
            return res.status(404).json({ error: 'El paquete seleccionado no existe.' });
        }

        const ultimos4 = tarjeta_numero ? obtenerUltimos4(tarjeta_numero) : '';
        const fechaCol = obtenerFechaColombia();

        const nuevaInscripcion = {
            id_registro: `reg-${Date.now()}`,
            fecha: fechaCol,
            nombre_completo,
            email,
            telefono,
            paquete: {
                id: paqueteSeleccionado.id,
                nombre: paqueteSeleccionado.nombre,
                precio: paqueteSeleccionado.precio
            },
            pago: {
                metodo: metodo_pago,
                titular: tarjeta_titular || 'N/A',
                numero_enmascarado: tarjeta_numero ? `**** **** **** ${ultimos4}` : 'N/A',
                expiracion: tarjeta_expiracion || 'N/A',
                ultimos4: ultimos4,
                referencia: datos_pago_referencia || `Registro automático - ${fechaCol}`
            }
        };

        db.inscripciones.push(nuevaInscripcion);
        await guardarBaseDatos(db);

        res.status(201).json({ 
            mensaje: "¡Inscripción registrada con éxito!", 
            id_registro: nuevaInscripcion.id_registro 
        });
    } catch (error) {
        console.error("Error en /inscripciones:", error.message);
        res.status(500).json({ error: "Error al procesar la inscripción." });
    }
});

function obtenerCategoriaRol(rol) {
    const normal = String(rol || '')
        .toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

    if (['profesor', 'instructor', 'maestro', 'profesores', 'instructores', 'maestros'].includes(normal)) {
        return 'instructor';
    }
    if (['taxi dancer', 'taxidancer', 'taxi dancers', 'taxidancers'].includes(normal)) {
        return 'taxi dancer';
    }
    if (['dj', 'djs'].includes(normal)) {
        return 'dj';
    }
    return normal;
}

// RUTA: Calificar talento
router.post('/calificaciones', async (req, res) => {
    const { talentoId, estrellas, nombre, telefono, ciudad } = req.body;
    const numEstrellas = Number(estrellas);

    if (!talentoId || isNaN(numEstrellas) || numEstrellas < 1 || numEstrellas > 5) {
        return res.status(400).json({ error: "Calificación inválida. Debe ser entre 1 y 5." });
    }

    if (!nombre || !telefono || !ciudad) {
        return res.status(400).json({ error: "Nombre, WhatsApp y Ciudad son obligatorios para calificar." });
    }

    try {
        const db = await leerBaseDatos();
        const persona = db.talento.find(t => t.id === talentoId);

        if (!persona) return res.status(404).json({ error: "El miembro del talento no existe." });

        const calificacionesDetalles = await leerCalificacionesDetalles();
        const categoriaNuevoVoto = obtenerCategoriaRol(persona.rol);

        // Validar si el teléfono ya votó por un talento de la misma categoría de rol
        const yaVotoPorCategoria = calificacionesDetalles.some(c => {
            if (String(c.usuarioTelefono).trim() !== String(telefono).trim()) return false;
            
            // Determinar la categoría del voto histórico
            const categoriaHistorica = obtenerCategoriaRol(c.talentoRol);
            return categoriaHistorica === categoriaNuevoVoto;
        });

        if (yaVotoPorCategoria) {
            return res.status(400).json({ error: `Este número ya registró un voto en la categoría: ${categoriaNuevoVoto.toUpperCase()}.` });
        }

        persona.calificaciones.push(numEstrellas);
        const suma = persona.calificaciones.reduce((acc, curr) => acc + curr, 0);
        persona.promedio = Number((suma / persona.calificaciones.length).toFixed(2));

        await guardarBaseDatos(db);

        // Guardar detalle en el archivo separado
        calificacionesDetalles.push({
            id: `calif-${Date.now()}`,
            fecha: obtenerFechaColombia(),
            talentoId,
            talentoNombre: persona.nombre,
            talentoRol: persona.rol,
            voto: numEstrellas,
            usuarioNombre: nombre,
            usuarioTelefono: telefono,
            usuarioCiudad: ciudad
        });
        await guardarCalificacionesDetalles(calificacionesDetalles);

        res.json({ mensaje: "¡Gracias por tu calificación!", nuevoPromedio: persona.promedio });
    } catch (error) {
        console.error("Error en /calificaciones:", error.message);
        res.status(500).json({ error: "Error al procesar la calificación." });
    }
});

module.exports = router;