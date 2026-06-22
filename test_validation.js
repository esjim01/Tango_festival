const { leerCalificacionesDetalles } = require('./utils/db');

async function testValidation() {
    const telefonoATestear = "3177137379"; // Ya existe en calificaciones_detalles.json
    try {
        const calificacionesDetalles = await leerCalificacionesDetalles();
        const telefonoExiste = calificacionesDetalles.some(c => 
            String(c.usuarioTelefono).trim() === String(telefonoATestear).trim()
        );

        if (telefonoExiste) {
            console.log("VALIDACIÓN EXITOSA: Se detectó que el teléfono ya existe.");
        } else {
            console.log("ERROR: No se detectó el teléfono existente.");
        }
        
        const telefonoNuevo = "9999999999";
        const telefonoNuevoExiste = calificacionesDetalles.some(c => 
            String(c.usuarioTelefono).trim() === String(telefonoNuevo).trim()
        );
        
        if (!telefonoNuevoExiste) {
            console.log("VALIDACIÓN EXITOSA: El teléfono nuevo se permite.");
        } else {
            console.log("ERROR: Se bloqueó un teléfono nuevo.");
        }
    } catch (e) {
        console.error("Error en el test:", e);
    }
}

testValidation();