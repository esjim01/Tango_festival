document.addEventListener('DOMContentLoaded', () => {
    cargarDatosPanelMaestro();
    configurarEventosAdmin();
    configurarLogout();
});

let inscripcionesLocales = [];
let paquetesLocales = [];
let elencoLocal = [];
let bannersLocales = [];
const API_ADMIN = '/api/admin';
const API_PUBLIC = '/api/public';

async function fetchAdmin(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        return res;
    } catch (e) {
        console.error('Fetch error:', e);
        throw e;
    }
}

function configurarLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (!confirm('¿Deseas cerrar la sesión?')) return;
            try {
                await fetchAdmin('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login.html';
            } catch (e) {
                console.error('Logout error:', e);
                window.location.href = '/login.html';
            }
        });
    }
}

function csvSeguro(valor) {
    const limpio = String(valor ?? '').replace(/"/g, '""');
    return `"${limpio}"`;
}

function escaparHtml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function syncPaqueteDesdeCard(card) {
    const packageId = card.dataset.packageId;
    const paquete = paquetesLocales.find(p => p.id === packageId);
    if (!paquete) return;

    paquete.nombre = card.querySelector('.pkg-nombre').value.trim();
    paquete.precio = card.querySelector('.pkg-precio').value.trim();
    paquete.precio_pareja = card.querySelector('.pkg-precio-pareja').value.trim();
    paquete.badge = card.querySelector('.pkg-badge').value.trim();

    const featureRows = card.querySelectorAll('[data-feature-row]');
    paquete.caracteristicas = Array.from(featureRows).map(row => ({
        texto: row.querySelector('.pkg-feature-text').value.trim(),
        incluido: row.querySelector('.pkg-feature-incluido').checked
    })).filter(f => f.texto);
}

function renderPaquetesAdmin() {
    const contenedor = document.getElementById('lista-paquetes-admin');
    if (!contenedor) return;

    if (!paquetesLocales.length) {
        contenedor.innerHTML = '<p class="text-xs text-stone-500">No hay paquetes creados.</p>';
        return;
    }

    contenedor.innerHTML = paquetesLocales
        .map((paquete) => {
            const items = (paquete.caracteristicas || [])
                .map(
                    (item, idx) => `
                    <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 md:gap-3 items-start md:items-center" data-feature-row="${idx}">
                        <input
                            type="text"
                            class="pkg-feature-text w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                            value="${escaparHtml(item.texto)}"
                        >
                        <label class="flex items-center gap-1 text-[10px] text-stone-300 uppercase tracking-wider md:justify-self-end">
                            <input type="checkbox" class="pkg-feature-incluido" ${item.incluido ? 'checked' : ''}>
                            Incluye
                        </label>
                        <button type="button" class="btn-eliminar-feature text-red-500 hover:text-red-400 text-xs md:justify-self-end" data-package-id="${paquete.id}" data-feature-index="${idx}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `
                )
                .join('');

            return `
                <div class="package-card border border-stone-800 rounded-xl p-4 bg-stone-950/40" data-package-id="${paquete.id}">
                    <div class="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
                        <div class="md:col-span-3">
                            <label class="block text-[9px] text-stone-500 uppercase font-bold mb-1">Nombre</label>
                            <input type="text" class="pkg-nombre w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs" value="${escaparHtml(paquete.nombre)}" placeholder="Nombre del paquete">
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-[9px] text-stone-500 uppercase font-bold mb-1">Badge (Ej: Más popular)</label>
                            <input type="text" class="pkg-badge w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs" value="${escaparHtml(paquete.badge || '')}" placeholder="Badge (opcional)">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        <div>
                            <label class="block text-[9px] text-stone-500 uppercase font-bold mb-1">Precio Individual (COP)</label>
                            <input type="text" class="pkg-precio w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs" value="${escaparHtml(paquete.precio)}" placeholder="Precio Individual">
                        </div>
                        <div>
                            <label class="block text-[9px] text-stone-500 uppercase font-bold mb-1">Precio Pareja (COP)</label>
                            <input type="text" class="pkg-precio-pareja w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs" value="${escaparHtml(paquete.precio_pareja || '')}" placeholder="Precio Pareja">
                        </div>
                    </div>

                    <div class="space-y-2 pkg-features">${items}</div>

                    <div class="flex flex-wrap justify-end gap-2 mt-4">
                        <button type="button" class="btn-add-feature bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 px-3 py-2 rounded-lg text-xs" data-package-id="${paquete.id}">
                            <i class="fas fa-plus mr-1"></i>Agregar ítem
                        </button>
                        <button type="button" class="btn-guardar-paquete bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-2 rounded-lg text-xs font-bold uppercase" data-package-id="${paquete.id}">
                            Guardar paquete
                        </button>
                        <button type="button" class="btn-eliminar-paquete bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs uppercase" data-package-id="${paquete.id}">
                            Eliminar paquete
                        </button>
                    </div>
                </div>
            `;
        })
        .join('');
}

function renderBannersAdmin() {
    const previewBanners = document.getElementById('preview-banners');
    if (!previewBanners) return;

    previewBanners.innerHTML = bannersLocales.map((url, idx) => `
        <div class="relative shrink-0 group">
            <img src="${url}?t=${Date.now()}" class="w-12 h-12 object-cover rounded border border-stone-800">
            <button onclick="eliminarBanner(${idx})" class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('') || '<p class="text-[9px] text-stone-600">No hay banners.</p>';
}

window.eliminarBanner = async (index) => {
    if (!confirm('¿Deseas eliminar esta imagen del carrusel?')) return;
    
    bannersLocales.splice(index, 1);
    
    try {
        await fetchAdmin(`${API_ADMIN}/configuracion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banners: bannersLocales })
        });
        renderBannersAdmin();
    } catch (e) {
        alert('Error al eliminar banner');
        console.error(e);
    }
};

async function cargarDatosPanelMaestro() {
    try {
        // 1. Cargar la Tabla de Inscritos
        const resInscritos = await fetchAdmin(`${API_ADMIN}/inscripciones`);
        if (!resInscritos.ok) throw new Error('Error al cargar inscripciones');
        
        inscripcionesLocales = await resInscritos.json();
        const tabla = document.getElementById('tabla-inscritos');
        if (tabla) {
            tabla.innerHTML = inscripcionesLocales.map(ins => `
                <tr class="hover:bg-stone-950/40 border-b border-stone-900/50">
                    <td class="p-3 font-semibold text-stone-200">
                        ${escaparHtml(ins.nombre_completo)}
                        <br><span class="text-[10px] text-stone-500">${escaparHtml(ins.email)} | ${escaparHtml(ins.telefono)}</span>
                    </td>
                    <td class="p-3 text-stone-400">
                        ${escaparHtml(ins.paquete?.nombre || '-')}
                        <br><span class="text-amber-500 font-bold">USD ${ins.paquete?.precio || '-'}</span>
                    </td>
                    <td class="p-3 text-stone-400 max-w-xs">
                        <span class="text-stone-300 font-medium">${escaparHtml(ins.pago?.metodo || '-')}</span>
                        <br><span class="text-stone-500 text-[10px]">Titular: ${escaparHtml(ins.pago?.titular || '-')} / ${escaparHtml(ins.pago?.numero_enmascarado || '-')}</span>
                    </td>
                    <td class="p-3 text-stone-400">
                        <div class="flex space-x-1">
                            <button onclick="prepararEdicionRegistro('${ins.id_registro}')" class="text-stone-500 hover:text-amber-500 p-2 text-xs transition-colors">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarRegistro('${ins.id_registro}')" class="text-stone-500 hover:text-red-500 p-2 text-xs transition-colors">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" class="p-4 text-center text-stone-600">No hay inscritos aún.</td></tr>';
        }

        // 2. Cargar Configuraciones Actuales
        const resPublico = await fetchAdmin(`${API_PUBLIC}/info`);
        if (!resPublico.ok) throw new Error('Error al cargar información pública');
        
        const datos = await resPublico.json();
        bannersLocales = datos.configuracion.banners || [];

        renderBannersAdmin();

        const previewHero = document.getElementById('preview-hero');
        if (previewHero && datos.configuracion.hero_principal) {
            previewHero.innerHTML = `<img src="${datos.configuracion.hero_principal}?t=${Date.now()}" class="w-full h-auto object-contain">`;
        } else if (previewHero) {
            previewHero.innerHTML = '<p class="text-[9px] text-stone-600 p-4">No hay hero configurado.</p>';
        }

        document.getElementById('admin-whatsapp').value = datos.configuracion.link_whatsapp || '';
        document.getElementById('admin-footer-texto').value = datos.configuracion.footer_texto || '';
        document.getElementById('admin-footer-contacto').value = datos.configuracion.footer_contacto || '';
        
        document.getElementById('admin-pago-nequi-habilitado').checked = !!datos.configuracion.pago_nequi_habilitado;
        document.getElementById('admin-pago-nequi-datos').value = datos.configuracion.pago_nequi_datos || '';
        document.getElementById('admin-pago-transferencia-habilitado').checked = !!datos.configuracion.pago_transferencia_habilitado;
        document.getElementById('admin-pago-transferencia-datos').value = datos.configuracion.pago_transferencia_datos || '';

        // Organizador
        document.getElementById('admin-organizador-nombre').value = datos.configuracion.organizador_nombre || '';
        document.getElementById('admin-organizador-rol').value = datos.configuracion.organizador_rol || '';
        document.getElementById('admin-organizador-descripcion').value = datos.configuracion.organizador_descripcion || '';
        document.getElementById('admin-organizador-imagen').value = datos.configuracion.organizador_imagen || '';

        // Hotel
        document.getElementById('admin-hotel-nombre').value = datos.configuracion.hotel_nombre || '';
        document.getElementById('admin-hotel-descripcion').value = datos.configuracion.hotel_descripcion || '';
        document.getElementById('admin-hotel-enlace').value = datos.configuracion.hotel_enlace || '';

        // Política de Cancelación
        document.getElementById('admin-politica-intro').value = datos.configuracion.politica_intro || '';
        document.getElementById('admin-politica-explicacion').value = datos.configuracion.politica_explicacion || '';
        document.getElementById('admin-politica-advertencia').value = datos.configuracion.politica_advertencia || '';
        
        window.politicaReglasActuales = Array.isArray(datos.configuracion.politica_reglas) ? datos.configuracion.politica_reglas : [];
        renderPoliticaReglas();

        // Calendario de Actividades
        if (datos.configuracion.calendario_tabs) {
            renderCalendarioAdmin(datos.configuracion.calendario_tabs);
        }

        paquetesLocales = Array.isArray(datos.paquetes) ? datos.paquetes : [];
        renderPaquetesAdmin();

        // Llenar selector de paquetes para registro manual
        const regPaqueteSelect = document.getElementById('reg-paquete');
        if (regPaqueteSelect) {
            regPaqueteSelect.innerHTML = paquetesLocales.map(p => `
                <option value="${p.id}">${escaparHtml(p.nombre)} - $${p.precio} COP</option>
            `).join('');
        }

        elencoLocal = datos.talento || [];
        const contenedorElenco = document.getElementById('lista-elenco-eliminar');
        if (contenedorElenco) {
            contenedorElenco.innerHTML = elencoLocal.map(art => `
                <div class="bg-stone-900/50 p-3 rounded-lg border border-stone-800 flex items-center justify-between group">
                    <div class="flex items-center space-x-3">
                        <img src="${art.foto}" class="w-10 h-10 object-cover rounded-full border border-amber-500/30">
                        <div>
                            <h4 class="text-xs font-bold text-stone-200">${escaparHtml(art.nombre)}</h4>
                            <span class="text-[9px] text-amber-500 uppercase font-semibold">${['profesor', 'instructor', 'maestro'].includes(String(art.rol).toLowerCase()) ? 'Maestro' : escaparHtml(art.rol)}</span>
                        </div>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="prepararEdicionTalento('${art.id}')" class="text-stone-500 hover:text-amber-500 p-2 text-xs transition-colors">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="eliminarArtista('${art.id}')" class="text-stone-500 hover:text-red-500 p-2 text-xs transition-colors">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `).join('') || '<p class="text-xs text-stone-600 col-span-full py-4 text-center">No hay artistas en el elenco.</p>';
        }

    } catch (e) { 
        console.error("Error al cargar panel:", e);
        alert("Error al cargar datos del panel: " + e.message);
    }
}

window.prepararEdicionTalento = (id) => {
    const art = elencoLocal.find(a => a.id === id);
    if (!art) return;

    document.getElementById('edit-talento-id').value = art.id;
    document.getElementById('nuevo-nombre').value = art.nombre;
    document.getElementById('nuevo-rol').value = art.rol;
    document.getElementById('nuevo-bio').value = art.biografia;

    document.getElementById('titulo-form-talento').innerHTML = `<i class="fas fa-edit mr-2"></i>Editar Artista`;
    document.getElementById('btn-submit-talento').innerText = 'Guardar Cambios';
    document.getElementById('btn-cancelar-talento').classList.remove('hidden');
    document.getElementById('label-foto-talento').classList.remove('hidden');

    document.getElementById('titulo-form-talento').scrollIntoView({ behavior: 'smooth' });
};

function limpiarFormTalento() {
    document.getElementById('form-agregar-talento').reset();
    document.getElementById('edit-talento-id').value = '';
    document.getElementById('titulo-form-talento').innerHTML = `<i class="fas fa-plus mr-2"></i>Agregar al Elenco`;
    document.getElementById('btn-submit-talento').innerText = 'Añadir al Elenco';
    document.getElementById('btn-cancelar-talento').classList.add('hidden');
    document.getElementById('label-foto-talento').classList.add('hidden');
}

window.prepararEdicionRegistro = (id) => {
    const ins = inscripcionesLocales.find(i => i.id_registro === id);
    if (!ins) return;

    document.getElementById('edit-registro-id').value = ins.id_registro;
    document.getElementById('reg-nombre').value = ins.nombre_completo;
    document.getElementById('reg-email').value = ins.email;
    document.getElementById('reg-telefono').value = ins.telefono;
    document.getElementById('reg-paquete').value = ins.paquete?.id || '';
    document.getElementById('reg-metodo').value = ins.pago?.metodo || 'efectivo';
    document.getElementById('reg-referencia').value = ins.pago?.referencia || '';

    const camposTarjeta = document.getElementById('campos-tarjeta-manual');
    if (['credito', 'debito'].includes(ins.pago?.metodo)) {
        camposTarjeta.classList.remove('hidden');
        document.getElementById('reg-titular').value = ins.pago?.titular || '';
        document.getElementById('reg-numero').value = ''; 
        document.getElementById('reg-exp').value = ins.pago?.expiracion || '';
    } else {
        camposTarjeta.classList.add('hidden');
    }

    document.getElementById('titulo-form-registro').innerHTML = `<i class="fas fa-edit mr-2"></i>Editar Registro`;
    document.getElementById('btn-submit-registro').innerText = 'Guardar Cambios';
    document.getElementById('btn-cancelar-registro').classList.remove('hidden');

    document.getElementById('titulo-form-registro').scrollIntoView({ behavior: 'smooth' });
};

async function eliminarRegistro(id) {
    if (!confirm('¿Seguro que deseas eliminar este registro permanentemente?')) return;
    try {
        const res = await fetchAdmin(`${API_ADMIN}/inscripciones/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Registro eliminado.');
            await cargarDatosPanelMaestro();
        }
    } catch (e) {
        console.error(e);
        alert('Error al eliminar registro.');
    }
}

function limpiarFormRegistro() {
    document.getElementById('form-registro-manual').reset();
    document.getElementById('edit-registro-id').value = '';
    document.getElementById('campos-tarjeta-manual').classList.add('hidden');
    document.getElementById('titulo-form-registro').innerHTML = `<i class="fas fa-user-plus mr-2"></i>Registro Manual`;
    document.getElementById('btn-submit-registro').innerText = 'Registrar Comprador';
    document.getElementById('btn-cancelar-registro').classList.add('hidden');
}

// Lógica para Reglas Dinámicas de Política de Cancelación
window.renderPoliticaReglas = function() {
    const container = document.getElementById('admin-politica-reglas-container');
    if (!container) return;

    container.innerHTML = window.politicaReglasActuales.map((regla, idx) => `
        <div class="regla-row flex gap-2 items-start bg-stone-900 border border-stone-800 p-2 rounded">
            <div class="flex-1 space-y-2">
                <input type="text" class="regla-condicion w-full bg-stone-950 border border-stone-700 rounded p-1 text-[10px] text-stone-300 focus:outline-none focus:border-amber-500" value="${escaparHtml(regla.condicion)}" placeholder="Condición (ej: Cancelas dentro de 1 mes)">
                <input type="text" class="regla-reembolso w-full bg-stone-950 border border-stone-700 rounded p-1 text-[10px] text-stone-300 focus:outline-none focus:border-amber-500" value="${escaparHtml(regla.reembolso)}" placeholder="Reembolso (ej: reembolso del 50%)">
            </div>
            <button type="button" onclick="eliminarReglaPolitica(${idx})" class="text-red-500 hover:text-red-400 p-2 text-xs" title="Eliminar regla"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
};

window.agregarReglaPolitica = function() {
    if (!window.politicaReglasActuales) window.politicaReglasActuales = [];
    
    // Antes de añadir, guardamos el estado actual de los inputs para no perder lo que han escrito
    const container = document.getElementById('admin-politica-reglas-container');
    if (container) {
        const rows = container.querySelectorAll('.regla-row');
        window.politicaReglasActuales = Array.from(rows).map(row => ({
            condicion: row.querySelector('.regla-condicion').value,
            reembolso: row.querySelector('.regla-reembolso').value
        }));
    }

    window.politicaReglasActuales.push({ condicion: '', reembolso: '' });
    renderPoliticaReglas();
};

window.eliminarReglaPolitica = function(idx) {
    const container = document.getElementById('admin-politica-reglas-container');
    if (container) {
        const rows = container.querySelectorAll('.regla-row');
        window.politicaReglasActuales = Array.from(rows).map(row => ({
            condicion: row.querySelector('.regla-condicion').value,
            reembolso: row.querySelector('.regla-reembolso').value
        }));
    }

    window.politicaReglasActuales.splice(idx, 1);
    renderPoliticaReglas();
};

function configurarEventosAdmin() {
    const formConfig = document.getElementById('form-config-avanzada');
    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const estado = document.getElementById('estado-config');
            
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Guardando...';
            estado.textContent = 'Procesando cambios y subiendo imágenes...';

            try {
                const datos = {
                    link_whatsapp: document.getElementById('admin-whatsapp').value,
                    footer_texto: document.getElementById('admin-footer-texto').value,
                    footer_contacto: document.getElementById('admin-footer-contacto').value,
                    pago_nequi_habilitado: document.getElementById('admin-pago-nequi-habilitado').checked,
                    pago_nequi_datos: document.getElementById('admin-pago-nequi-datos').value,
                    pago_transferencia_habilitado: document.getElementById('admin-pago-transferencia-habilitado').checked,
                    pago_transferencia_datos: document.getElementById('admin-pago-transferencia-datos').value,
                    
                    organizador_nombre: document.getElementById('admin-organizador-nombre').value,
                    organizador_rol: document.getElementById('admin-organizador-rol').value,
                    organizador_descripcion: document.getElementById('admin-organizador-descripcion').value,
                    organizador_imagen: document.getElementById('admin-organizador-imagen').value,
                    
                    hotel_nombre: document.getElementById('admin-hotel-nombre').value,
                    hotel_descripcion: document.getElementById('admin-hotel-descripcion').value,
                    hotel_enlace: document.getElementById('admin-hotel-enlace').value,
                    
                    politica_intro: document.getElementById('admin-politica-intro').value,
                    politica_explicacion: document.getElementById('admin-politica-explicacion').value,
                    politica_advertencia: document.getElementById('admin-politica-advertencia').value,
                    politica_reglas: window.politicaReglasActuales || []
                };

                // Actualizar las reglas desde los inputs actuales antes de enviar
                const reglasContainer = document.getElementById('admin-politica-reglas-container');
                if (reglasContainer) {
                    const rows = reglasContainer.querySelectorAll('.regla-row');
                    datos.politica_reglas = Array.from(rows).map(row => ({
                        condicion: row.querySelector('.regla-condicion').value,
                        reembolso: row.querySelector('.regla-reembolso').value
                    }));
                }

                await fetchAdmin(`${API_ADMIN}/configuracion`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });

                const heroFile = document.getElementById('admin-hero-file').files[0];
                if (heroFile) {
                    const heroForm = new FormData();
                    heroForm.append('heroImage', heroFile);
                    await fetchAdmin(`${API_ADMIN}/upload/hero`, { method: 'POST', body: heroForm });
                }

                const bannerFiles = document.getElementById('admin-banners-files').files;
                if (bannerFiles.length > 0) {
                    const bannersForm = new FormData();
                    Array.from(bannerFiles).forEach((file) => bannersForm.append('bannerImages', file));
                    await fetchAdmin(`${API_ADMIN}/upload/banners`, { method: 'POST', body: bannersForm });
                }

                estado.textContent = '¡Cambios guardados con éxito!';
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error(error);
                estado.textContent = 'Error al guardar los cambios.';
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }

    const btnCancelarTalento = document.getElementById('btn-cancelar-talento');
    if (btnCancelarTalento) {
        btnCancelarTalento.addEventListener('click', limpiarFormTalento);
    }

    const formTalento = document.getElementById('form-agregar-talento');
    if (formTalento) {
        formTalento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-talento-id').value;
            const btn = document.getElementById('btn-submit-talento');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            try {
                const datos = {
                    nombre: document.getElementById('nuevo-nombre').value,
                    rol: document.getElementById('nuevo-rol').value,
                    biografia: document.getElementById('nuevo-bio').value
                };

                let res;
                if (editId) {
                    res = await fetchAdmin(`${API_ADMIN}/talento/${editId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(datos)
                    });
                } else {
                    res = await fetchAdmin(`${API_ADMIN}/talento`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(datos)
                    });
                }

                if (!res.ok) {
                    alert('No se pudo guardar el talento.');
                    btn.disabled = false;
                    btn.innerText = originalText;
                    return;
                }

                const jsonRes = await res.json();
                const talentoId = editId || jsonRes.talento?.id;
                
                const fotoFile = document.getElementById('nuevo-foto-file').files[0];
                if (fotoFile && talentoId) {
                    const fotoForm = new FormData();
                    fotoForm.append('talentoImage', fotoFile);
                    await fetchAdmin(`${API_ADMIN}/upload/talento/${talentoId}`, { method: 'POST', body: fotoForm });
                }

                alert(editId ? '¡Artista actualizado!' : '¡Artista añadido al elenco!');
                limpiarFormTalento();
                cargarDatosPanelMaestro();
            } catch (error) {
                console.error(error);
                alert('Error al intentar guardar el artista.');
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }

    const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');
    if (btnCancelarRegistro) {
        btnCancelarRegistro.addEventListener('click', limpiarFormRegistro);
    }

    const regMetodo = document.getElementById('reg-metodo');
    const camposTarjeta = document.getElementById('campos-tarjeta-manual');
    if (regMetodo && camposTarjeta) {
        regMetodo.addEventListener('change', (e) => {
            if (['credito', 'debito'].includes(e.target.value)) {
                camposTarjeta.classList.remove('hidden');
            } else {
                camposTarjeta.classList.add('hidden');
            }
        });
    }

    const formRegistro = document.getElementById('form-registro-manual');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-registro-id').value;
            const btn = document.getElementById('btn-submit-registro');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            const selector = document.getElementById('reg-paquete');
            const paqueteId = selector.value;
            const paqueteNombre = selector.options[selector.selectedIndex].text.split('-')[0].trim();

            const datosEnvio = {
                nombre_completo: document.getElementById('reg-nombre').value,
                email: document.getElementById('reg-email').value,
                telefono: document.getElementById('reg-telefono').value,
                paquete_id: paqueteId,
                paquete_nombre: paqueteNombre,
                metodo_pago: document.getElementById('reg-metodo').value,
                tarjeta_titular: document.getElementById('reg-titular').value || 'N/A',
                tarjeta_numero: document.getElementById('reg-numero').value || '',
                tarjeta_expiracion: document.getElementById('reg-exp').value || 'N/A',
                tarjeta_cvv: document.getElementById('reg-cvv').value || '',
                datos_pago_referencia: document.getElementById('reg-referencia').value || 'Registro Manual'
            };

            try {
                let res;
                if (editId) {
                    res = await fetchAdmin(`${API_ADMIN}/inscripciones/${editId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(datosEnvio)
                    });
                } else {
                    res = await fetch(`${API_PUBLIC}/inscripciones`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(datosEnvio)
                    });
                }

                if (res.ok) {
                    alert(editId ? '¡Registro actualizado!' : '¡Comprador registrado con éxito!');
                    limpiarFormRegistro();
                    await cargarDatosPanelMaestro();
                } else {
                    const error = await res.json();
                    alert('Error: ' + (error.error || 'No se pudo procesar la solicitud.'));
                }
            } catch (error) {
                console.error(error);
                alert('Error de conexión.');
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }

    const btnExportarCalificaciones = document.getElementById('btn-exportar-calificaciones');
    if (btnExportarCalificaciones) {
        btnExportarCalificaciones.addEventListener('click', () => {
            window.location.href = `${API_ADMIN}/descargar/calificaciones`;
        });
    }

    const btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            if(inscripcionesLocales.length === 0) return alert("No hay datos.");
            let csv = "data:text/csv;charset=utf-8,ID_Registro,Fecha,Nombre_Completo,Email,Telefono,Paquete_ID,Paquete_Nombre,Paquete_Precio,Metodo_Pago,Titular_Tarjeta,Numero_Tarjeta,Expiracion_Tarjeta,Ultimos4,Referencia_Pago\n";
            inscripcionesLocales.forEach((i) => {
                const fila = [
                    i.id_registro, i.fecha, i.nombre_completo, i.email, i.telefono,
                    i.paquete?.id || '', i.paquete?.nombre || '', i.paquete?.precio || '',
                    i.pago?.metodo || '', i.pago?.titular || '', i.pago?.numero_enmascarado || '',
                    i.pago?.expiracion || '', i.pago?.ultimos4 || '', i.pago?.referencia || ''
                ];
                csv += `${fila.map(csvSeguro).join(',')}\n`;
            });
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csv));
            link.setAttribute("download", "Inscritos_Festival.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const btnCrearPaquete = document.getElementById('btn-crear-paquete');
    if (btnCrearPaquete) {
        btnCrearPaquete.addEventListener('click', async () => {
            const payload = {
                nombre: `PACKAGE #${paquetesLocales.length + 1}`,
                precio: '0',
                badge: '',
                caracteristicas: [{ texto: 'Nuevo beneficio', incluido: true }]
            };
            const res = await fetchAdmin(`${API_ADMIN}/paquetes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) await cargarDatosPanelMaestro();
        });
    }

    const listaPaquetes = document.getElementById('lista-paquetes-admin');
    if (listaPaquetes) {
        listaPaquetes.addEventListener('click', async (event) => {
            const boton = event.target.closest('button');
            if (!boton) return;

            const packageId = boton.dataset.packageId;
            if (!packageId) return;

            const card = boton.closest('.package-card');

            if (boton.classList.contains('btn-add-feature')) {
                if (card) syncPaqueteDesdeCard(card);
                const paquete = paquetesLocales.find((item) => item.id === packageId);
                if (!paquete) return;
                paquete.caracteristicas = paquete.caracteristicas || [];
                paquete.caracteristicas.push({ texto: '', incluido: true });
                renderPaquetesAdmin();
            } else if (boton.classList.contains('btn-eliminar-feature')) {
                if (card) syncPaqueteDesdeCard(card);
                const featureIndex = Number(boton.dataset.featureIndex);
                const paquete = paquetesLocales.find((item) => item.id === packageId);
                if (!paquete || Number.isNaN(featureIndex)) return;
                paquete.caracteristicas = (paquete.caracteristicas || []).filter((_, idx) => idx !== featureIndex);
                renderPaquetesAdmin();
            } else if (boton.classList.contains('btn-guardar-paquete')) {
                if (!card) return;
                syncPaqueteDesdeCard(card);
                const paquete = paquetesLocales.find(p => p.id === packageId);
                const res = await fetchAdmin(`${API_ADMIN}/paquetes/${packageId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paquete)
                });
                if (res.ok) { alert('Paquete actualizado.'); await cargarDatosPanelMaestro(); }
            } else if (boton.classList.contains('btn-eliminar-paquete')) {
                if (!confirm('¿Seguro que deseas eliminar este paquete?')) return;
                const res = await fetchAdmin(`${API_ADMIN}/paquetes/${packageId}`, { method: 'DELETE' });
                if (res.ok) await cargarDatosPanelMaestro();
            }
        });
    }
}

async function eliminarArtista(id) {
    if(confirm("¿Seguro que deseas eliminar este artista del festival?")) {
        const res = await fetchAdmin(`${API_ADMIN}/talento/${id}`, { method: 'DELETE' });
        if(res.ok) { alert("Artista eliminado."); cargarDatosPanelMaestro(); }
    }
}
