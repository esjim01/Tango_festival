const API_URL = '/api/public';

document.addEventListener('DOMContentLoaded', () => {
    cargarContenidoCompleto();
    configurarModalInscripcion();
    iniciarCuentaRegresiva();
});

// ... rest of code ...

function iniciarCuentaRegresiva() {
    const meta = new Date(2026, 9, 26, 0, 0, 0); // 26 de Octubre de 2026

    const actualizar = () => {
        const ahora = new Date();
        
        if (ahora >= meta) {
            document.getElementById('meses').innerText = "00";
            document.getElementById('dias').innerText = "00";
            document.getElementById('horas').innerText = "00";
            return;
        }

        let meses = (meta.getFullYear() - ahora.getFullYear()) * 12 + (meta.getMonth() - ahora.getMonth());
        let dias = meta.getDate() - ahora.getDate();
        let horas = 0 - ahora.getHours();

        if (horas < 0) {
            horas += 24;
            dias--;
        }
        if (dias < 0) {
            const fechaAux = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
            dias += fechaAux.getDate();
            meses--;
        }

        document.getElementById('meses').innerText = String(Math.max(0, meses)).padStart(2, '0');
        document.getElementById('dias').innerText = String(Math.max(0, dias)).padStart(2, '0');
        document.getElementById('horas').innerText = String(Math.max(0, horas)).padStart(2, '0');
    };

    actualizar();
    setInterval(actualizar, 3600000); // Cada hora
}

function normalizarRol(rol) {
    return String(rol || '')
        .toLowerCase()
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');
}

function tarjetaTalentoHtml(persona) {
    const rolMostrado = normalizarRol(persona.rol) === 'profesor' ? 'Instructor' : persona.rol;
    return `
        <div class="bg-black/40 border border-gold/20 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-gold/50 transition-all duration-500 backdrop-blur-sm">
            <div class="h-56 w-full overflow-hidden bg-stone-950 relative">
                <img src="${persona.foto}" alt="${persona.nombre}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <span class="text-[9px] font-bold text-black uppercase tracking-[0.2em] bg-gold-gradient px-3 py-1 rounded-full">${rolMostrado}</span>
                    <h3 class="text-xl font-serif font-bold text-white mt-4 uppercase tracking-wider">${persona.nombre}</h3>
                    <div class="text-stone-400 text-[11px] mt-3 font-light leading-relaxed max-h-32 overflow-y-auto custom-scrollbar pr-2">
                        ${persona.biografia}
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-gold/10 flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[9px] uppercase tracking-tighter text-stone-500 mb-1">Puntaje</span>
                        <strong class="text-gold text-sm">${persona.promedio || '0'} <i class="fas fa-star text-[10px]"></i></strong>
                    </div>
                    <div class="flex space-x-1.5 XML-estrellas" data-id="${persona.id}">
                        ${[1,2,3,4,5].map(n => `<i class="far fa-star text-stone-700 hover:text-gold cursor-pointer transition-colors text-sm" data-voto="${n}"></i>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarGrupoTalento(contenedor, personas) {
    if (!contenedor) return;
    if (!personas.length) {
        contenedor.innerHTML = '<p class="text-center text-stone-600 col-span-full py-6">Sin registros en esta sección.</p>';
        return;
    }
    contenedor.innerHTML = personas.map((persona) => tarjetaTalentoHtml(persona)).join('');
}

function obtenerIcono(texto) {
    const t = texto.toLowerCase();
    if (t.includes('hotel') || t.includes('noches')) return 'fa-hotel';
    if (t.includes('milonga')) return 'fa-shoe-prints';
    if (t.includes('cena')) return 'fa-utensils';
    if (t.includes('clase') || t.includes('taller')) return 'fa-graduation-cap';
    if (t.includes('zapatos')) return 'fa-shoe-prints';
    if (t.includes('atracciones') || t.includes('turismo')) return 'fa-camera';
    if (t.includes('taxi')) return 'fa-car';
    return 'fa-check';
}

function formatearPrecio(valor) {
    return new Intl.NumberFormat('de-DE').format(valor);
}

async function cargarContenidoCompleto() {
    try {
        const respuesta = await fetch(`${API_URL}/info`);
        const datos = await respuesta.json();
        window.paquetesDisponibles = datos.paquetes || [];

        const contenedorPaquetes = document.getElementById('contenedor-paquetes');
        if (contenedorPaquetes && datos.paquetes) {
            contenedorPaquetes.innerHTML = '';
            datos.paquetes.forEach(pkg => {
                const tarjeta = document.createElement('div');
                tarjeta.className = "relative border-2 border-gold/40 rounded-[2rem] p-8 flex flex-col items-center bg-black/40 backdrop-blur-md shadow-2xl hover:border-gold transition-all duration-500";
                const badgeHtml = pkg.badge ? `<div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#700101] text-white font-bold text-[10px] px-6 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border border-red-500/30">${pkg.badge}</div>` : '';
                const featuresHtml = pkg.caracteristicas.map(c => `<li class="flex items-start space-x-4 ${c.incluido ? '' : 'opacity-30 grayscale'}"><div class="w-5 h-5 mt-0.5 flex items-center justify-center shrink-0"><i class="fas ${obtenerIcono(c.texto)} text-gold text-sm"></i></div><span class="text-[11px] uppercase tracking-wider text-stone-200">${c.texto}</span></li>`).join('');
                tarjeta.innerHTML = `
                    ${badgeHtml}
                    <div class="w-full text-center mb-8">
                        <p class="text-[10px] text-gold uppercase tracking-[0.4em] mb-1">Paquete</p>
                        <h3 class="text-4xl font-serif font-black text-white uppercase tracking-tighter flex items-center justify-center gap-2">${pkg.nombre} ${pkg.badge?.toLowerCase().includes('estelar') ? '<i class="fas fa-star text-gold text-2xl"></i>' : ''}</h3>
                    </div>
                    <div class="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent mb-8"></div>
                    <ul class="w-full space-y-6 mb-10 overflow-hidden">${featuresHtml}</ul>
                    <div class="w-full mt-auto space-y-4">
                        <div class="pricing-gold py-4 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2 sm:gap-0 group relative overflow-hidden">
                            <div class="relative z-10">
                                <p class="text-[9px] font-bold uppercase tracking-widest text-black/60">Individual</p>
                                <p class="text-xl sm:text-2xl font-black text-black tracking-tighter">$ ${formatearPrecio(pkg.precio)} <span class="text-[10px]">COP</span></p>
                            </div>
                        </div>
                        <div class="pricing-red py-3 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2 sm:gap-0 opacity-90 hover:opacity-100 transition-opacity">
                            <div>
                                <p class="text-[9px] font-bold uppercase tracking-widest text-white/60">Pareja</p>
                                <p class="text-lg sm:text-xl font-bold text-white tracking-tighter">$ ${formatearPrecio(pkg.precio_pareja || (Number(pkg.precio) * 1.8))} <span class="text-[10px]">COP</span></p>
                            </div>
                            <i class="fas fa-users text-white/40 text-sm hidden sm:block"></i>
                        </div>
                        <button onclick="abrirModal('${pkg.id}', '${pkg.nombre}', '${pkg.precio}')" class="w-full mt-4 bg-transparent border border-gold/50 hover:bg-gold hover:text-black text-gold font-bold py-3 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] cursor-pointer">Reservar ahora</button>
                    </div>`;
                contenedorPaquetes.appendChild(tarjeta);
            });
        }

        const carrusel = document.getElementById('carrusel-imagenes');
        const seccionCarrusel = carrusel?.closest('section');
        if (carrusel && datos.configuracion?.banners && datos.configuracion.banners.length > 0) {
            carrusel.innerHTML = '';
            datos.configuracion.banners.forEach(url => {
                const img = document.createElement('img');
                const finalUrl = url.startsWith('http') ? url : `${url}?t=${Date.now()}`;
                img.src = finalUrl;
                img.className = "w-full h-full object-cover shrink-0 filter brightness-75 min-w-full";
                carrusel.appendChild(img);
            });
            if (seccionCarrusel) seccionCarrusel.classList.remove('hidden');
            iniciarAnimacionCarrusel();
        } else if (seccionCarrusel) {
            seccionCarrusel.classList.add('hidden');
        }

        const heroPrincipal = document.getElementById('hero-principal');
        const heroBgBlurred = document.getElementById('hero-bg-blurred');
        if (heroPrincipal && datos.configuracion) {
            const fallback = 'https://images.unsplash.com/photo-1549413240-200787cb099b?q=80&w=2070&auto=format&fit=crop';
            let imgSrc = datos.configuracion.hero_principal || fallback;
            const finalSrc = imgSrc.startsWith('http') ? imgSrc : `${imgSrc}?t=${Date.now()}`;
            heroPrincipal.src = finalSrc;
            heroPrincipal.onerror = () => { if (heroPrincipal.src !== fallback) { heroPrincipal.src = fallback; if (heroBgBlurred) heroBgBlurred.style.backgroundImage = `url('${fallback}')`; } };
            heroPrincipal.classList.remove('hidden');
            if (heroBgBlurred) heroBgBlurred.style.backgroundImage = `url('${finalSrc}')`;
        }

        if (datos.configuracion) {
            const btnWhatsapp = document.getElementById('btn-whatsapp');
            const footerTexto = document.getElementById('footer-texto');
            const footerContacto = document.getElementById('footer-contacto');
            if (btnWhatsapp) btnWhatsapp.href = datos.configuracion.link_whatsapp || '#';
            if (footerTexto) footerTexto.innerText = datos.configuracion.footer_texto || '';
            if (footerContacto) footerContacto.innerText = datos.configuracion.footer_contacto || '';
        }

        const cInstructores = document.getElementById('contenedor-instructores');
        const cTaxiDancers = document.getElementById('contenedor-taxi-dancers');
        const cDjs = document.getElementById('contenedor-djs');
        if (datos.talento) {
            renderizarGrupoTalento(cInstructores, datos.talento.filter(p => ['profesor', 'instructor', 'maestro'].includes(normalizarRol(p.rol))));
            renderizarGrupoTalento(cTaxiDancers, datos.talento.filter(p => ['taxi dancer', 'taxidancer'].includes(normalizarRol(p.rol))));
            renderizarGrupoTalento(cDjs, datos.talento.filter(p => ['dj', 'djs'].includes(normalizarRol(p.rol))));
            asignarEventosEstrellas();
        }
    } catch (error) { console.error("Error al cargar contenido:", error); }
}

function iniciarAnimacionCarrusel() {
    const contenedor = document.getElementById('carrusel-imagenes');
    let indice = 0;
    if (window.carruselInterval) clearInterval(window.carruselInterval);
    window.carruselInterval = setInterval(() => {
        const total = contenedor.children.length;
        if(total <= 1) return;
        indice = (indice + 1) % total;
        contenedor.style.transform = `translateX(-${indice * 100}%)`;
    }, 4000);
}

window.abrirModal = function(id, nombre, precio) {
    const selector = document.getElementById('modal-paquete-id');
    const contenedorSeleccion = document.getElementById('contenedor-seleccion-paquete');
    
    if (id) {
        contenedorSeleccion.classList.add('hidden');
        selector.innerHTML = `<option value="${id}">${nombre}</option>`;
        document.getElementById('modal-titulo-paquete').innerText = `${nombre} - $${formatearPrecio(precio)} COP`;
    } else {
        contenedorSeleccion.classList.remove('hidden');
        document.getElementById('modal-titulo-paquete').innerText = "Inscripción General";
        if (window.paquetesDisponibles) {
            selector.innerHTML = window.paquetesDisponibles.map(p => `<option value="${p.id}">${p.nombre} - $${formatearPrecio(p.precio)} COP</option>`).join('');
        }
    }
    
    const modal = document.getElementById('modal-inscripcion');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.cerrarModal = function() {
    const modal = document.getElementById('modal-inscripcion');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

window.abrirModalManual = function() {
    window.abrirModal(null);
}

function configurarModalInscripcion() {
    const modal = document.getElementById('modal-inscripcion');
    const formModal = document.getElementById('form-modal-pago');

    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

    formModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selector = document.getElementById('modal-paquete-id');
        const paqueteId = selector.value;
        const paqueteNombre = selector.options[selector.selectedIndex].text;

        const email = document.getElementById('modal-email').value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Correo electrónico inválido.');

        const datosEnvio = {
            nombre_completo: document.getElementById('modal-nombre').value,
            email: email,
            telefono: document.getElementById('modal-telefono').value,
            paquete_id: paqueteId,
            paquete_nombre: paqueteNombre.split('-')[0].trim(),
            metodo_pago: document.getElementById('modal-metodo-pago').value,
            tarjeta_titular: document.getElementById('modal-tarjeta-titular').value,
            tarjeta_numero: document.getElementById('modal-tarjeta-numero').value,
            tarjeta_expiracion: document.getElementById('modal-tarjeta-exp').value,
            tarjeta_cvv: document.getElementById('modal-tarjeta-cvv').value,
            datos_pago_referencia: document.getElementById('modal-referencia').value
        };

        try {
            const res = await fetch(`${API_URL}/inscripciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosEnvio)
            });
            const resultado = await res.json();
            if (res.ok) { alert(`🎉 Inscripción confirmada. Registro: ${resultado.id_registro}`); cerrarModal(); e.target.reset(); }
            else { alert(resultado.error || 'Error en la inscripción.'); }
        } catch (error) { alert('Error de conexión.'); }
    });
}

function asignarEventosEstrellas() {
    document.querySelectorAll('.XML-estrellas i').forEach(estrella => {
        estrella.addEventListener('click', (e) => {
            const talentoId = e.target.parentElement.getAttribute('data-id');
            const estrellas = e.target.getAttribute('data-voto');
            abrirModalCalificacion(talentoId, estrellas);
        });
    });
}

function abrirModalCalificacion(talentoId, estrellas) {
    document.getElementById('calif-talento-id').value = talentoId;
    document.getElementById('calif-estrellas').value = estrellas;
    
    const display = document.getElementById('calif-estrellas-display');
    display.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const icon = document.createElement('i');
        icon.className = i <= estrellas ? 'fas fa-star' : 'far fa-star';
        display.appendChild(icon);
    }
    
    document.getElementById('modal-calificacion').classList.remove('hidden');
    document.getElementById('modal-calificacion').classList.add('flex');
}

function cerrarModalCalificacion() {
    document.getElementById('modal-calificacion').classList.add('hidden');
    document.getElementById('modal-calificacion').classList.remove('flex');
    document.getElementById('form-calificacion').reset();
}

// Inicialización de eventos para el nuevo modal
document.getElementById('form-calificacion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const talentoId = document.getElementById('calif-talento-id').value;
    const estrellas = document.getElementById('calif-estrellas').value;
    const nombre = document.getElementById('calif-nombre').value;
    const telefono = document.getElementById('calif-telefono').value;

    try {
        const res = await fetch(`${API_URL}/calificaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ talentoId, estrellas, nombre, telefono })
        });
        const resultado = await res.json();
        if (res.ok) {
            alert("¡Gracias por tu calificación!");
            cerrarModalCalificacion();
            cargarContenidoCompleto();
        } else {
            alert(resultado.error || "Error al calificar.");
        }
    } catch (error) {
        alert("Error de conexión.");
    }
});

// Cerrar modal al hacer clic fuera
document.getElementById('modal-calificacion').addEventListener('click', (e) => {
    if (e.target.id === 'modal-calificacion') cerrarModalCalificacion();
});
