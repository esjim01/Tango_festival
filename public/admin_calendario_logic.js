
function renderCalendarioAdmin(tabs) {
    const container = document.getElementById('admin-calendario-container');
    if (!container) return;

    container.innerHTML = tabs.map((tab, idx) => `
        <div class="bg-stone-950 border border-stone-800 p-3 rounded-lg space-y-3">
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-stone-500 uppercase">Tab ${idx + 1}:</span>
                <input type="text" 
                       onchange="actualizarNombreTabCalendario(${idx}, this.value)" 
                       class="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500" 
                       value="${escaparHtml(tab.nombre)}">
            </div>
            
            <div class="space-y-2">
                <label class="block text-[9px] font-bold text-stone-500 uppercase">Imágenes del calendario</label>
                <div class="flex gap-2 overflow-x-auto p-2 bg-stone-900 rounded-lg custom-scrollbar min-h-[60px]">
                    ${tab.imagenes && tab.imagenes.length > 0 
                        ? tab.imagenes.map((img, imgIdx) => `
                            <div class="relative shrink-0 group">
                                <img src="${img}?t=${Date.now()}" class="w-12 h-12 object-cover rounded border border-stone-700">
                                <button onclick="eliminarImagenCalendario(${idx}, ${imgIdx})" 
                                        class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')
                        : '<p class="text-[9px] text-stone-600">No hay imágenes.</p>'
                    }
                </div>
                <input type="file" 
                       onchange="subirImagenesCalendario(${idx}, this)" 
                       multiple accept="image/*" 
                       class="w-full bg-stone-900 border border-stone-700 rounded p-1 text-[10px] text-stone-400 focus:outline-none focus:border-amber-500">
            </div>
        </div>
    `).join('');
}

window.actualizarNombreTabCalendario = async (idx, nuevoNombre) => {
    try {
        const res = await fetchAdmin(`${API_ADMIN}/calendario/${idx}/nombre`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre })
        });
        if (res.ok) {
            console.log('Nombre de pestaña actualizado');
        } else {
            alert('Error al actualizar el nombre');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
};

window.subirImagenesCalendario = async (idx, input) => {
    if (!input.files || input.files.length === 0) return;
    
    const formData = new FormData();
    Array.from(input.files).forEach(file => formData.append('calendarioImages', file));

    try {
        const res = await fetchAdmin(`${API_ADMIN}/upload/calendario/${idx}`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            alert('Imágenes subidas con éxito');
            await cargarDatosPanelMaestro();
        } else {
            alert('Error al subir imágenes');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
};

window.eliminarImagenCalendario = async (tabIdx, imgIdx) => {
    if (!confirm('¿Deseas eliminar esta imagen?')) return;
    
    try {
        const res = await fetchAdmin(`${API_ADMIN}/calendario/${tabIdx}/${imgIdx}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            await cargarDatosPanelMaestro();
        } else {
            alert('Error al eliminar la imagen');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
};
