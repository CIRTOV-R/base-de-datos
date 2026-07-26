// ==========================================
// CONFIGURACIÓN DE SUPABASE
// Proyecto creado por Victor Rodrigues UTS Guayana 
// ==========================================
const SUPABASE_URL = "https://heshjmfxuxiczjllnmnp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_lXFlQOWjdoU3_HZUhQsO-Q_z6BnVyTT";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LOGIN ---
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("1. El formulario de login fue interceptado correctamente.");

            const emailInput = document.getElementById("login-email") || document.getElementById("email");
            const passInput = document.getElementById("login-pass") || document.getElementById("password");
            
            if (!emailInput || !passInput) {
                console.log("Error: No se encontraron los inputs.");
                showToast("Error: No se encontraron los campos de texto.", "error");
                return;
            }

            console.log("2. Enviando consulta a Supabase con email:", emailInput.value.trim());
            showLoader(true);

            const { data: usuarios, error } = await supabaseClient
                .from("usuarios")
                .select("*")
                .eq("email", emailInput.value.trim())
                .eq("password", passInput.value);

            showLoader(false);
            console.log("3. Respuesta recibida de Supabase. Error:", error);
            console.log("4. Usuarios encontrados:", usuarios);

            if (error) { 
                showToast("Error: " + error.message, "error"); 
                return; 
            }

            if (usuarios && usuarios.length > 0) {
                console.log("5. ¡Credenciales correctas! Redirigindo a datos.html...");
                window.location.href = "datos.html";
            } else {
                console.log("6. Credenciales incorrectas (array vacío).");
                showToast("Credenciales incorrectas.", "error");
            }
        });
    }

    // --- REGISTRO ---
    const formRegistro = document.getElementById("form-registro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("reg-nombre").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-pass").value;

            showLoader(true);
            const { error } = await supabaseClient.from("usuarios").insert([{ nombre, email, password }]);
            showLoader(false);

            if (error) {
                showToast("Error al registrar: " + error.message, "error");
            } else {
                showToast("¡Usuario creado con éxito!", "success");
                setTimeout(() => { window.location.href = "index.html"; }, 1500);
            }
        });
    }

    // --- CARGA DE DATOS EN PANEL ---
    if (document.getElementById("cuerpo-tabla") || document.getElementById("cuerpo-productos") || document.getElementById("cuerpo-pedidos") || document.getElementById("cuerpo-instalaciones")) {
        cargarTodo();
    }

    // --- INICIALIZAR VISTA DE NUEVO PEDIDO ---
    if (document.getElementById("form-pedido")) {
        inicializarFormularioPedido();
    }

    // --- ENVÍO DEL FORMULARIO CRUD DINÁMICO (Crear o Actualizar) ---
    const crudForm = document.getElementById('crud-form');
    if (crudForm) {
        crudForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) return;

            const isEditing = editingRecordId !== null;
            showToast(isEditing ? 'Actualizando registro...' : 'Insertando registro en Supabase...', 'info');
            let formData = {};

            try {
                if (typeof currentTab !== 'undefined' && currentTab === 'clientes') {
                    formData = {
                        nombre: document.getElementById('c-nombre').value.trim(),
                        telefono: document.getElementById('c-telefono').value.trim(),
                        direccion: document.getElementById('c-direccion').value.trim(),
                        historial_financiero: document.getElementById('c-historial').value
                    };
                } else if (typeof currentTab !== 'undefined' && currentTab === 'productos') {
                    formData = {
                        nombre: document.getElementById('pr-descripcion').value.trim(),
                        stock: parseInt(document.getElementById('pr-stock').value),
                        precio: parseFloat(document.getElementById('pr-precio').value)
                    };
                }

                let queryResponse;
                const pkField = getPrimaryKeyField(typeof currentTab !== 'undefined' ? currentTab : 'clientes');

                if (isEditing) {
                    queryResponse = await supabaseClient
                        .from(currentTab)
                        .update(formData)
                        .eq(pkField, editingRecordId)
                        .select();
                } else {
                    queryResponse = await supabaseClient
                        .from(currentTab)
                        .insert([formData])
                        .select();
                }

                if (queryResponse.error) throw queryResponse.error;

                showToast(isEditing ? '¡Registro actualizado correctamente!' : '¡Registro agregado correctamente!', 'success');
                closeCrudFormModal();
                cargarTodo();
            } catch (err) {
                console.error('Error al guardar/actualizar:', err);
                showToast('Error en la operación: ' + err.message, 'error');
            }
        });
    }
});
// ==========================================
// FUNCIONES GLOBALES DEL PANEL
// ==========================================
function cargarTodo() {
    cargarClientes();
    cargarProductos();
    cargarPedidos();
    cargarInstalaciones();
}

// Función encargada de consultar la tabla de instalaciones y rellenar el HTML
async function cargarInstalaciones() {
    const tabla = document.getElementById("cuerpo-instalaciones");
    if (!tabla) return;

    const { data: instalaciones, error } = await supabaseClient
        .from("instalaciones")
        .select(`
            id,
            fecha_instalacion,
            cantidad_instalada,
            observaciones,
            pedidos ( id, cliente_nombre ),
            tecnicos ( nombre ),
            productos ( nombre )
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error al cargar instalaciones:", error);
        return;
    }

    tabla.innerHTML = instalaciones && instalaciones.length > 0
        ? instalaciones.map(i => `
            <tr>
                <td>#${i.id}</td>
                <td>Pedido #${i.pedidos?.id || 'N/A'} <br><small style="color: #64748b;">${i.pedidos?.cliente_nombre || ''}</small></td>
                <td><strong>${i.tecnicos?.nombre || 'Sin asignar'}</strong></td>
                <td>${i.productos?.nombre || 'Dispositivo genérico'}</td>
                <td><span style="font-weight: bold; color: #2563eb;">${i.cantidad_instalada} u.</span></td>
                <td>${i.fecha_instalacion || 'N/A'}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">🔧 No hay instalaciones registradas todavía.</td></tr>`;
}

async function cargarClientes() {
    const tabla = document.getElementById("cuerpo-tabla");
    if (!tabla) return;
    
    const { data: clientes, error } = await supabaseClient.from("clientes").select("*").order("id");
    if (error) {
        console.error("Error al cargar clientes:", error);
        return;
    }

    tabla.innerHTML = clientes && clientes.length ? clientes.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td>${c.nombre || 'N/A'}</td>
            <td>${c.empresa || 'N/A'}</td>
            <td>${c.telefono || 'N/A'}</td>
            <td><span class="badge">${c.ciudad || 'N/A'}</span></td>
        </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #64748b;">📂 No hay clientes registrados.</td></tr>`;
}

async function cargarProductos() {
    const tabla = document.getElementById("cuerpo-productos");
    if (!tabla) return;
    
    const { data: productos, error } = await supabaseClient.from("productos").select("*").order("id");
    
    if (error) {
        showToast("Error al cargar inventario: " + error.message, "error");
        return;
    }

    tabla.innerHTML = productos && productos.length > 0 
        ? productos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria || 'N/A'}</td>
                <td><span class="precio" style="color: #10b981; font-weight: 600;">$${Number(p.precio).toFixed(2)}</span></td>
                <td>${p.stock} u.</td>
            </tr>
        `).join('') 
        : `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #64748b;">📦 Sin inventario disponible.</td></tr>`;
}

async function cargarPedidos() {
    const tabla = document.getElementById("cuerpo-pedidos");
    if (!tabla) return;
    
    const { data: pedidos, error } = await supabaseClient
        .from("pedidos")
        .select("*, detalle_pedidos(*, productos(nombre))")
        .order("id", { ascending: false });
    
    if (error || !pedidos || pedidos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #64748b;">📋 No hay pedidos registrados.</td></tr>`;
        return;
    }

    tabla.innerHTML = pedidos.map(ped => {
        const items = ped.detalle_pedidos && ped.detalle_pedidos.length > 0 
            ? ped.detalle_pedidos.map(d => `${d.cantidad}x ${d.productos?.nombre || 'Producto'}`).join(', ')
            : 'Sin detalles';
            
        return `
            <tr>
                <td>#${ped.id}</td>
                <td><strong>${ped.cliente_nombre}</strong><br><small style="color:#64748b;">${ped.cliente_identificacion}</small></td>
                <td>${items}</td>
                <td>${new Date(ped.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

// Variable global para rastrear si estamos editando
let editingRecordId = null;

async function openEditModal(tableName, recordId) {
    editingRecordId = recordId;
    const titleEl = document.getElementById('form-modal-title');
    if (titleEl) titleEl.innerText = `Editar Registro (${tableName})`;
    
    showLoader(true);
    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .eq(getPrimaryKeyField(tableName), recordId)
            .single();

        if (error) throw error;

        if (typeof renderFormFields === 'function') {
            renderFormFields(tableName, data);
        }
        const overlay = document.getElementById('form-overlay');
        if (overlay) overlay.classList.remove('hidden');
    } catch (err) {
        console.error('Error al cargar registro para editar:', err);
        showToast('No se pudo cargar el registro: ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

function closeCrudFormModal() {
    const overlay = document.getElementById('form-overlay');
    if (overlay) overlay.classList.add('hidden');
    editingRecordId = null;
}

async function deleteRecord(tableName, recordId) {
    if (!confirm(`¿Estás seguro de que deseas eliminar este registro de ${tableName}?`)) return;
    if (!supabaseClient) return showToast('Supabase no está configurado.', 'error');

    showLoader(true);
    try {
        const pkField = getPrimaryKeyField(tableName);
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq(pkField, recordId);

        if (error) throw error;

        showToast('Registro eliminado correctamente.', 'success');
        cargarTodo();
    } catch (err) {
        console.error('Error al eliminar:', err);
        showToast('Error al eliminar el registro: ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

function getPrimaryKeyField(tableName) {
    const keys = {
        'clientes': 'id_cliente',
        'pedidos': 'id',
        'productos': 'id',
        'detalle_pedidos': 'id'
    };
    return keys[tableName] || 'id';
}

async function abrirModalInstalacion() {
    const panel = document.getElementById("panel-instalacion");
    const selectTecnico = document.getElementById("inst-select-tecnico");
    const selectProducto = document.getElementById("inst-select-producto");
    
    if (!panel) return;
    panel.style.display = "block";

    const { data: tecnicos } = await supabaseClient.from("tecnicos").select("id, nombre").order("nombre");
    if (selectTecnico) {
        selectTecnico.innerHTML = tecnicos && tecnicos.length > 0 
            ? tecnicos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')
            : `<option value="">No hay técnicos registrados</option>`;
    }

    const { data: productos } = await supabaseClient.from("productos").select("id, nombre").order("nombre");
    if (selectProducto) {
        selectProducto.innerHTML = productos && productos.length > 0 
            ? productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')
            : `<option value="">No hay productos disponibles</option>`;
    }
}

function cerrarModalInstalacion() {
    const panel = document.getElementById("panel-instalacion");
    if (panel) panel.style.display = "none";
}

async function guardarInstalacion() {
    const pedidoId = parseInt(document.getElementById("inst-pedido-id")?.value);
    const tecnicoId = parseInt(document.getElementById("inst-select-tecnico")?.value);
    const productoId = parseInt(document.getElementById("inst-select-producto")?.value);
    const cantidad = parseInt(document.getElementById("inst-cantidad")?.value);
    const fechaInstalacion = document.getElementById("inst-fecha")?.value;
    const observaciones = document.getElementById("inst-observaciones")?.value.trim() || "";

    if (!pedidoId || !tecnicoId || !productoId || !cantidad) {
        showToast("Por favor completa los campos obligatorios de la instalación.", "error");
        return;
    }

    showLoader(true);
    
    const datosInsertar = {
        pedido_id: pedidoId,
        tecnico_id: tecnicoId,
        producto_id: productoId,
        cantidad_instalada: cantidad,
        observaciones: observaciones
    };

    if (fechaInstalacion) {
        datosInsertar.fecha_instalacion = fechaInstalacion;
    }

    const { error } = await supabaseClient.from("instalaciones").insert([datosInsertar]);

    showLoader(false);

    if (error) {
        showToast("Error al registrar instalación: " + error.message, "error");
        return;
    }

    showToast("¡Instalación registrada con éxito!", "success");
    cerrarModalInstalacion();
    cargarInstalaciones();
}
// ==========================================
// LÓGICA MULTI-PRODUCTO PARA PEDIDOS
// ==========================================
let productosDisponibles = [];

async function inicializarFormularioPedido() {
    const { data } = await supabaseClient.from("productos").select("*").gt("stock", 0);
    productosDisponibles = data || [];
    
    const contenedor = document.getElementById("contenedor-lineas-pedido");
    if (contenedor && contenedor.children.length === 0) {
        agregarFilaProducto();
    }

    const btnAgregar = document.getElementById("btn-agregar-linea");
    if (btnAgregar && !btnAgregar.dataset.listenerAdded) {
        btnAgregar.dataset.listenerAdded = "true";
        btnAgregar.addEventListener("click", agregarFilaProducto);
    }
    
    const formPedido = document.getElementById("form-pedido");
    if (formPedido && !formPedido.dataset.listenerAdded) {
        formPedido.dataset.listenerAdded = "true";
        formPedido.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombreInput = document.getElementById("ped-nombre");
            const identInput = document.getElementById("ped-identificacion");
            
            if (!nombreInput || !identInput) return;

            const nombre = nombreInput.value.trim();
            const identificacion = identInput.value.trim();

            const filas = document.querySelectorAll(".fila-producto");
            if (filas.length === 0) {
                showToast("Agrega al menos un producto al pedido.", "error");
                return;
            }

            let detalles = [];
            let valido = true;

            filas.forEach(fila => {
                const select = fila.querySelector(".select-producto");
                const inputCant = fila.querySelector(".input-cantidad");
                if (!select || !inputCant) return;

                const productoId = parseInt(select.value);
                const cantidad = parseInt(inputCant.value);

                if (!productoId || !cantidad || cantidad <= 0) {
                    valido = false;
                    return;
                }
                detalles.push({ producto_id: productoId, cantidad: cantidad });
            });

            if (!valido || detalles.length === 0) {
                showToast("Por favor verifica los productos y cantidades seleccionadas.", "error");
                return;
            }

            showLoader(true);
            try {
                // 1. Insertar el pedido principal
                const { data: pedidoCreado, error: errorPedido } = await supabaseClient
                    .from("pedidos")
                    .insert([{ cliente_nombre: nombre, cliente_identificacion: identificacion }])
                    .select()
                    .single();

                if (errorPedido) throw errorPedido;

                const pedidoId = pedidoCreado.id;

                // 2. Insertar los detalles del pedido asociados
                const detallesConId = detalles.map(d => ({
                    pedido_id: pedidoId,
                    producto_id: d.producto_id,
                    cantidad: d.cantidad
                }));

                const { error: errorDetalles } = await supabaseClient
                    .from("detalle_pedidos")
                    .insert(detallesConId);

                if (errorDetalles) throw errorDetalles;

                showLoader(false);
                showToast("¡Pedido registrado con éxito!", "success");
                formPedido.reset();
                if (contenedor) contenedor.innerHTML = "";
                agregarFilaProducto();
                cargarPedidos();
            } catch (err) {
                showLoader(false);
                console.error("Error al registrar el pedido:", err);
                showToast("Error al guardar el pedido: " + err.message, "error");
            }
        });
    }
}

function agregarFilaProducto() {
    const contenedor = document.getElementById("contenedor-lineas-pedido");
    if (!contenedor) return;

    const filaId = Date.now() + Math.random();
    const htmlFila = `
        <div class="fila-producto" id="fila-${filaId}" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <select class="select-producto" style="flex: 2; padding: 8px;">
                <option value="">Seleccione un producto</option>
                ${productosDisponibles.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (Stock: ${p.stock})</option>`).join('')}
            </select>
            <input type="number" class="input-cantidad" value="1" min="1" style="flex: 1; padding: 8px;" placeholder="Cant">
            <button type="button" onclick="document.getElementById('fila-${filaId}').remove()" style="background: #ef4444; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">X</button>
        </div>
    `;
    contenedor.insertAdjacentHTML('beforeend', htmlFila);
}

function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: opacity 0.3s ease;
        background: ${type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#10b981'};
    `;
    toast.innerText = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoader(show) {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10000; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;';
        loader.innerHTML = '<div style="background: white; color: #1e293b; padding: 20px 30px; border-radius: 8px; box-shadow: 0 10px 15px rgba(0,0,0,0.2);">Procesando...</div>';
        document.body.appendChild(loader);
    }
    loader.style.display = show ? 'flex' : 'none';
}