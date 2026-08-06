// ==========================================
// CONFIGURACIÓN DE SUPABASE
// Proyecto creado por Victor Rodrigues UTS Guayana 
// ==========================================
const SUPABASE_URL = "https://heshjmfxuxiczjllnmnp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_lXFlQOWjdoU3_HZUhQsO-Q_z6BnVyTT";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// VALIDACIONES Y UTILIDADES DE USUARIO
// ==========================================
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function normalizarRol(rol) {
    const r = (rol || "").toString().trim().toLowerCase();
    return r === "admin" ? "admin" : "basico";
}

function validarNombreCompleto(nombre) {
    const palabras = (nombre || "").split(/\s+/).filter(Boolean);
    return palabras.length >= 2;
}

document.addEventListener("DOMContentLoaded", () => {

    const formLogin = document.getElementById("form-login");
if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("login-email") || document.getElementById("email");
        const passInput = document.getElementById("login-pass") || document.getElementById("password");
        
        if (!emailInput || !passInput) {
            showToast("Error: No se encontraron los campos de texto.", "error");
            return;
        }

        const email = emailInput.value.trim();
        const password = passInput.value;

        if (!validarEmail(email)) {
            showToast("Formato de correo inválido.", "error");
            return;
        }
        if (!password) {
            showToast("Ingresa tu contraseña.", "error");
            return;
        }

        showLoader(true);
        const { data: usuarios, error } = await supabaseClient
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .limit(1);

        showLoader(false);

        if (error) { 
            showToast("Error: " + error.message, "error"); 
            return; 
        }

        if (usuarios && usuarios.length > 0 && usuarios[0].password === password) {
            const usuarioEncontrado = usuarios[0];
            const rolNormalizado = normalizarRol(usuarioEncontrado.rol);
            usuarioEncontrado.rol = rolNormalizado;

            localStorage.setItem("usuarioLogueado", JSON.stringify(usuarioEncontrado));
            localStorage.setItem("userRole", rolNormalizado);

            if (rolNormalizado === "admin") {
                window.location.href = "datos.html";
            } else {
                window.location.href = "portal-cliente.html";
            }
        } else {
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

            // 1. Validación de campos antes de enviar
            if (!validarNombreCompleto(nombre)) {
                showToast("Por favor, introduce tu nombre y apellido completo.", "error");
                return;
            }
            if (!validarEmail(email)) {
                showToast("Formato de correo inválido.", "error");
                return;
            }
            if (password.length < 6) {
                showToast("La contraseña debe tener al menos 6 caracteres.", "error");
                return;
            }

            // 2. Evitar correos duplicados
            showLoader(true);
            const { data: existente } = await supabaseClient
                .from("usuarios")
                .select("id")
                .eq("email", email)
                .limit(1);

            if (existente && existente.length > 0) {
                showLoader(false);
                showToast("Ya existe una cuenta con ese correo.", "error");
                return;
            }

            // 3. Los usuarios nuevos se crean siempre con rol "basico"
            const { error } = await supabaseClient
                .from("usuarios")
                .insert([{ nombre, email, password, rol: "basico" }]);
            showLoader(false);

            if (error) { 
                showToast("Error al registrar: " + error.message, "error"); 
            } else {
                showToast("¡Usuario creado con éxito!", "success");
                setTimeout(() => { window.location.href = "index.html"; }, 1500);
            }
        });
    }

    // --- CARGA DE DATOS EN PANEL (solo si la sesión es admin) ---
    if (document.getElementById("cuerpo-tabla") || document.getElementById("cuerpo-productos") || document.getElementById("cuerpo-pedidos")) {
        if (normalizarRol(localStorage.getItem("userRole")) === "admin") {
            cargarTodo();
            cargarUsuarios();
        }
    }

    // --- CREACIÓN DE USUARIOS DESDE EL PANEL ADMIN ---
    const formUsuarioAdmin = document.getElementById("form-usuario-admin");
    if (formUsuarioAdmin) {
        formUsuarioAdmin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("ua-nombre").value.trim();
            const email = document.getElementById("ua-email").value.trim();
            const password = document.getElementById("ua-pass").value;
            const rol = document.getElementById("ua-rol").value;

            if (!validarNombreCompleto(nombre)) {
                showToast("Nombre y apellido requeridos.", "error");
                return;
            }
            if (!validarEmail(email)) {
                showToast("Formato de correo inválido.", "error");
                return;
            }
            if (password.length < 6) {
                showToast("La contraseña debe tener al menos 6 caracteres.", "error");
                return;
            }

            showLoader(true);
            const { data: existente } = await supabaseClient
                .from("usuarios")
                .select("id")
                .eq("email", email)
                .limit(1);

            if (existente && existente.length > 0) {
                showLoader(false);
                showToast("Ese correo ya está registrado.", "error");
                return;
            }

            const { error } = await supabaseClient
                .from("usuarios")
                .insert([{ nombre, email, password, rol }]);
            showLoader(false);

            if (error) {
                showToast("Error al crear usuario: " + error.message, "error");
                return;
            }

            showToast("¡Usuario creado correctamente!", "success");
            formUsuarioAdmin.reset();
            cargarUsuarios();
        });
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
    cargarInstalaciones(); // Sincroniza la sección de técnicos e instalaciones
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
            pedidos ( id, cliente_nombre ),
            tecnicos ( nombre_completo ),
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
                <td>
                    <strong>${i.tecnicos?.nombre_completo || 'Sin asignar'}</strong>
                    <br>
                    <button onclick="abrirModalAsignarTecnico(${i.id})" class="btn btn-secundario btn-sm" style="margin-top:6px;">
                        Asignar Técnico
                    </button>
                </td>
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
    
    if (error) {
        showToast("Error al cargar pedidos: " + error.message, "error");
        return;
    }

    const contador = document.getElementById("contador-pedidos");
    if (contador) contador.textContent = (pedidos && pedidos.length) || 0;

    if (!pedidos || pedidos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #64748b;">📋 No hay pedidos registrados.</td></tr>`;
        return;
    }

    tabla.innerHTML = pedidos.map(ped => {
        const items = ped.detalle_pedidos && ped.detalle_pedidos.length > 0 
            ? ped.detalle_pedidos.map(d => `${d.cantidad}x ${d.productos?.nombre || 'Producto'}`).join(', ')
            : 'Sin detalles';
        const fecha = ped.created_at ? new Date(ped.created_at).toLocaleDateString() : 'N/A';

        const estado = (ped.estado || "pendiente");
        const badgeEstado = estado === "aprobado"
            ? '<span class="badge" style="background:#ecfdf5; color:#059669;">APROBADO</span>'
            : estado === "rechazado"
                ? '<span class="badge" style="background:#fef2f2; color:#b91c1c;">RECHAZADO</span>'
                : '<span class="badge">PENDIENTE</span>';

        const accionesHtml = (estado === "aprobado" || estado === "rechazado")
            ? `<span style="font-size:12px; color:#64748b;">${estado === "aprobado" ? "Facturado ✓" : "Rechazado ✕"}</span>`
            : `<button onclick="abrirModalFacturaAdmin(${ped.id})" class="btn btn-primario btn-sm">Emitir Factura</button>`;

        return `
            <tr>
                <td>#${ped.id}</td>
                <td><strong>${ped.cliente_nombre}</strong><br><small style="color:#64748b;">${ped.cliente_identificacion}</small></td>
                <td>${items}</td>
                <td>${fecha}</td>
                <td>${badgeEstado}</td>
                <td class="acciones">${accionesHtml}</td>
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
    const overlay = document.getElementById("overlay-instalacion");
    const selectTecnico = document.getElementById("inst-select-tecnico");
    const selectProducto = document.getElementById("inst-select-producto");
    
    if (!overlay) return;
    overlay.classList.add("mostrar");

    // Cargar técnicos desde la base de datos
    const { data: tecnicos } = await supabaseClient.from("tecnicos").select("id, nombre_completo").order("nombre_completo");
    selectTecnico.innerHTML = tecnicos && tecnicos.length > 0 
        ? tecnicos.map(t => `<option value="${t.id}">${t.nombre_completo}</option>`).join('')
        : `<option value="">No hay técnicos registrados</option>`;

    // Cargar productos desde la base de datos
    const { data: productos } = await supabaseClient.from("productos").select("id, nombre").order("nombre");
    selectProducto.innerHTML = productos && productos.length > 0 
        ? productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')
        : `<option value="">No hay productos disponibles</option>`;
}

function cerrarModalInstalacion() {
    const overlay = document.getElementById("overlay-instalacion");
    if (overlay) overlay.classList.remove("mostrar");
}

// ==========================================
// ASIGNAR / REASIGNAR TÉCNICO A UNA INSTALACIÓN
// ==========================================
async function abrirModalAsignarTecnico(instalacionId) {
    const overlay = document.getElementById("overlay-asignar-tecnico");
    const selectTecnico = document.getElementById("tecnico-select-reasignar");
    const infoEl = document.getElementById("tecnico-info-instalacion");
    if (!overlay) return;

    document.getElementById("tecnico-instalacion-id").value = instalacionId;
    overlay.classList.add("mostrar");

    const [instRes, tecRes] = await Promise.all([
        supabaseClient
            .from("instalaciones")
            .select("id, pedidos(cliente_nombre), tecnicos(nombre_completo), productos(nombre), cantidad_instalada")
            .eq("id", instalacionId)
            .single(),
        supabaseClient.from("tecnicos").select("id, nombre_completo").order("nombre_completo")
    ]);

    if (instRes.error) {
        showToast("Error al cargar la instalación: " + instRes.error.message, "error");
        return;
    }

    const inst = instRes.data;
    const tecnicos = tecRes.data || [];

    if (infoEl) {
        const cliente = inst.pedidos?.cliente_nombre || 'N/A';
        const producto = inst.productos?.nombre || 'N/A';
        const cantidad = inst.cantidad_instalada || 0;
        infoEl.textContent = `Instalación #${inst.id} — Cliente: ${cliente} | Producto: ${producto} (${cantidad} u.)`;
    }

    selectTecnico.innerHTML = tecnicos.length > 0
        ? tecnicos.map(t => `<option value="${t.id}" ${t.id === inst.tecnico_id ? 'selected' : ''}>${t.nombre_completo}</option>`).join('')
        : `<option value="">No hay técnicos registrados</option>`;
}

function cerrarModalAsignarTecnico() {
    const overlay = document.getElementById("overlay-asignar-tecnico");
    if (overlay) overlay.classList.remove("mostrar");
}

async function guardarTecnicoInstalacion() {
    const instalacionId = parseInt(document.getElementById("tecnico-instalacion-id").value);
    const tecnicoId = parseInt(document.getElementById("tecnico-select-reasignar").value);

    if (!instalacionId || !tecnicoId) {
        showToast("Selecciona un técnico válido.", "error");
        return;
    }

    showLoader(true);
    const { error } = await supabaseClient
        .from("instalaciones")
        .update({ tecnico_id: tecnicoId })
        .eq("id", instalacionId);
    showLoader(false);

    if (error) {
        showToast("Error al asignar técnico: " + error.message, "error");
        return;
    }

    showToast("¡Técnico asignado correctamente!", "success");
    cerrarModalAsignarTecnico();
    cargarInstalaciones();
}

async function guardarInstalacion() {
    const pedidoId = parseInt(document.getElementById("inst-pedido-id").value);
    const tecnicoId = parseInt(document.getElementById("inst-select-tecnico").value);
    const productoId = parseInt(document.getElementById("inst-select-producto").value);
    const cantidad = parseInt(document.getElementById("inst-cantidad").value);
    const fechaInstalacion = document.getElementById("inst-fecha")?.value; // Captura correcta de la fecha
    const observaciones = document.getElementById("inst-observaciones").value.trim();

    if (!pedidoId || !tecnicoId || !productoId || !cantidad) {
        showToast("Por favor completa los campos obligatorios de la instalación.", "error");
        return;
    }

    showLoader(true);
    
    // Objeto base con los datos obligatorios mapeados
    const datosInsertar = {
        pedido_id: pedidoId,
        tecnico_id: tecnicoId,
        producto_id: productoId,
        cantidad_instalada: cantidad,
        observaciones: observaciones
    };

    // Si el usuario seleccionó una fecha específica, la agregamos; si no, Supabase usará el valor por defecto
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
    cargarInstalaciones(); // Recarga la tabla automáticamente para ver el cambio
}

// ==========================================
// LÓGICA MULTI-PRODUCTO PARA PEDIDOS
// ==========================================
let productosDisponibles = [];

async function inicializarFormularioPedido() {
    const { data } = await supabaseClient.from("productos").select("*").gt("stock", 0);
    productosDisponibles = data || [];
    agregarFilaProducto();

    const btnAgregar = document.getElementById("btn-agregar-linea");
    if (btnAgregar) {
        btnAgregar.addEventListener("click", agregarFilaProducto);
    }
    
    const formPedido = document.getElementById("form-pedido");
    if (formPedido) {
        formPedido.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("ped-nombre").value.trim();
            const identificacion = document.getElementById("ped-identificacion").value.trim();
            
            const filas = document.querySelectorAll(".fila-producto-item");
            const itemsPedido = [];

            for (let fila of filas) {
                const select = fila.querySelector(".select-producto");
                const inputCant = fila.querySelector(".input-cantidad");
                const prodId = parseInt(select.value);
                const cantidad = parseInt(inputCant.value);

                if (!prodId || !cantidad || cantidad <= 0) continue;

                const prod = productosDisponibles.find(p => p.id === prodId);
                if (prod && cantidad > prod.stock) {
                    showToast(`Stock insuficiente para ${prod.nombre}. Stock disponible: ${prod.stock}`, "error");
                    return;
                }

                itemsPedido.push({ producto_id: prodId, cantidad, precio_unitario: prod.precio });
            }

            if (itemsPedido.length === 0) {
                showToast("Agrega al menos un producto válido al pedido.", "error");
                return;
            }

            showLoader(true);
            const { data: nuevoPedido, error: errPed } = await supabaseClient
                .from("pedidos")
                .insert([{ cliente_nombre: nombre, cliente_identificacion: identificacion }])
                .select()
                .single();

            if (errPed) { 
                showLoader(false);
                showToast("Error al crear pedido: " + errPed.message, "error"); 
                return; 
            }

            for (let item of itemsPedido) {
                await supabaseClient.from("detalle_pedidos").insert([{
                    pedido_id: nuevoPedido.id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario
                }]);

                const prodActual = productosDisponibles.find(p => p.id === item.producto_id);
                await supabaseClient
                    .from("productos")
                    .update({ stock: prodActual.stock - item.cantidad })
                    .eq("id", item.producto_id);
            }

            showLoader(false);
            showToast("¡Pedido registrado con éxito y stock actualizado!", "success");
            setTimeout(() => { window.location.href = "datos.html"; }, 1500);
        });
    }
}

function agregarFilaProducto() {
    const contenedor = document.getElementById("contenedor-productos-pedido");
    if (!contenedor) return;
    
    const div = document.createElement("div");
    div.className = "fila-producto-item";
    div.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px; align-items: center;";

    let opciones = productosDisponibles.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock} - $${p.precio})</option>`).join('');

    div.innerHTML = `
        <select class="select-producto" required style="flex: 2; padding: 10px; border-radius: 6px; border: 1px solid #d1d5db;">
            <option value="">Selecciona un producto</option>
            ${opciones}
        </select>
        <input type="number" class="input-cantidad" placeholder="Cant." min="1" value="1" required style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #d1d5db;">
        <button type="button" class="btn-eliminar-linea" style="background: #ef4444; color: white; border: none; padding: 10px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">✕</button>
    `;

    div.querySelector(".btn-eliminar-linea").addEventListener("click", () => {
        if (document.querySelectorAll(".fila-producto-item").length > 1) {
            div.remove();
        } else {
            showToast("El pedido debe tener al menos un producto.", "error");
        }
    });

    contenedor.appendChild(div);
}

// ==========================================
// CONTROL DE NUEVOS PRODUCTOS
// ==========================================
function abrirModalNuevoProducto() {
    const overlay = document.getElementById("overlay-nuevo-producto");
    if (overlay) overlay.classList.add("mostrar");
}

function cerrarModalNuevoProducto() {
    const overlay = document.getElementById("overlay-nuevo-producto");
    if (overlay) overlay.classList.remove("mostrar");
}

async function guardarNuevoProducto() {
    const nombre = document.getElementById("nuevo-prod-nombre").value.trim();
    const categoria = document.getElementById("nuevo-prod-categoria").value.trim();
    const precio = parseFloat(document.getElementById("nuevo-prod-precio").value);
    const stock = parseInt(document.getElementById("nuevo-prod-stock").value);

    if (!nombre || isNaN(precio) || isNaN(stock)) {
        showToast("Por favor completa el nombre, precio y stock de forma correcta.", "error");
        return;
    }

    showLoader(true);
    const { error } = await supabaseClient
        .from("productos")
        .insert([{ nombre, categoria, precio, stock }]);
    showLoader(false);

    if (error) {
        showToast("Error al registrar el producto: " + error.message, "error");
        return;
    }

    showToast("¡Producto agregado con éxito!", "success");
    
    document.getElementById("nuevo-prod-nombre").value = "";
    document.getElementById("nuevo-prod-categoria").value = "";
    document.getElementById("nuevo-prod-precio").value = "0.00";
    document.getElementById("nuevo-prod-stock").value = "10";
    cerrarModalNuevoProducto();

    cargarProductos();
}

// ==========================================
// CONTROL DE COMPRAS Y STOCK
// ==========================================
async function abrirModalCompra() {
    const overlay = document.getElementById("overlay-compra");
    const select = document.getElementById("select-producto-compra");
    
    if (!overlay || !select) return;
    overlay.classList.add("mostrar");
    
    const { data: productos, error } = await supabaseClient.from("productos").select("id, nombre, stock").order("nombre");
    
    if (error) {
        showToast("Error al cargar productos: " + error.message, "error");
        return;
    }

    select.innerHTML = productos && productos.length > 0 
        ? productos.map(p => `<option value="${p.id}" data-stock="${p.stock}">${p.nombre} (Stock actual: ${p.stock})</option>`).join('')
        : `<option value="">No hay productos disponibles</option>`;
}

function cerrarModalCompra() {
    const overlay = document.getElementById("overlay-compra");
    if (overlay) overlay.classList.remove("mostrar");
}

async function guardarCompraStock() {
    const select = document.getElementById("select-producto-compra");
    const inputCantidad = document.getElementById("cantidad-comprada");
    
    if (!select || !inputCantidad) return;

    const productoId = parseInt(select.value);
    const cantidadAgregada = parseInt(inputCantidad.value);

    if (!productoId || !cantidadAgregada || cantidadAgregada <= 0) {
        showToast("Por favor selecciona un producto válido y una cantidad mayor a 0.", "error");
        return;
    }

    const optionSelected = select.options[select.selectedIndex];
    const stockActual = parseInt(optionSelected.getAttribute("data-stock")) || 0;
    const nuevoStock = stockActual + cantidadAgregada;

    showLoader(true);
    const { error } = await supabaseClient
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", productoId);
    showLoader(false);

    if (error) {
        showToast("Error al actualizar el stock: " + error.message, "error");
        return;
    }

    showToast("¡Inventario actualizado con éxito! Se sumaron " + cantidadAgregada + " unidades.", "success");
    cerrarModalCompra();
    cargarProductos();
}

// ==========================================
// CONTROL DE SPINNER / LOADER GLOBAL
// ==========================================
function showLoader(show) {
    let loader = document.getElementById('global-loader');
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = 'position: fixed; inset: 0; background: rgba(255,255,255,0.7); z-index: 10000; display: flex; justify-content: center; align-items: center;';
        loader.innerHTML = '<div style="border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>';
        document.body.appendChild(loader);
        
        if (!document.getElementById('loader-spin-style')) {
            const style = document.createElement('style');
            style.id = 'loader-spin-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// ==========================================
// SISTEMA DE NOTIFICACIONES TOAST PROFESIONAL
// ==========================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
        success: '#10b981', // Verde
        error: '#ef4444',   // Rojo
        info: '#3b82f6'     // Azul
    };

    toast.style.cssText = `
        background-color: ${bgColors[type] || '#333'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        transform: translateY(20px);
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
// ==========================================
// VERIFICAR ROL PARA PÁGINAS
// ==========================================
function protegerPaginaAdmin() {
    const rolStr = localStorage.getItem("userRole");

    if (!rolStr) {
        alert("No hay sesión activa. Inicia sesión.");
        window.location.href = "index.html";
        return false;
    }

    const rol = rolStr.trim().toLowerCase();

    if (rol !== "admin") {
        alert("Acceso denegado. Solo administradores.");
        window.location.href = "portal-cliente.html";
        return false;
    }

    return true;
}

// ==========================================
// GESTIÓN DE USUARIOS (SOLO ADMIN)
// ==========================================
async function cargarUsuarios() {
    const tabla = document.getElementById("cuerpo-usuarios");
    if (!tabla) return;

    const { data: usuarios, error } = await supabaseClient
        .from("usuarios")
        .select("id, nombre, email, rol")
        .order("id");

    if (error) {
        showToast("Error al cargar usuarios: " + error.message, "error");
        return;
    }

    if (!usuarios || usuarios.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #64748b;">👥 No hay usuarios registrados.</td></tr>`;
        return;
    }

    tabla.innerHTML = usuarios.map(u => {
        const esAdmin = u.rol === "admin";
        const boton = esAdmin
            ? `<button onclick="cambiarRolUsuario(${u.id},'basico')" class="btn btn-secundario btn-sm">Hacer Básico</button>`
            : `<button onclick="cambiarRolUsuario(${u.id},'admin')" class="btn btn-primario btn-sm">Hacer Admin</button>`;
        return `
            <tr>
                <td>#${u.id}</td>
                <td>${u.nombre || 'N/A'}</td>
                <td>${u.email || 'N/A'}</td>
                <td><span class="badge">${esAdmin ? 'Administrador' : 'Básico'}</span></td>
                <td class="acciones">${boton}</td>
            </tr>
        `;
    }).join('');
}

async function cambiarRolUsuario(id, nuevoRol) {
    const etiqueta = nuevoRol === "admin" ? "Administrador" : "Básico";
    if (!confirm(`¿Cambiar el rol de este usuario a ${etiqueta}?`)) return;

    const { error } = await supabaseClient
        .from("usuarios")
        .update({ rol: nuevoRol })
        .eq("id", id);

    if (error) {
        showToast("Error al cambiar rol: " + error.message, "error");
        return;
    }

    showToast("Rol actualizado correctamente.", "success");
    cargarUsuarios();
}

// ==========================================
// CIERRE DE MODALES FLOTANTES (clic en el fondo o tecla Esc)
// ==========================================
document.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal-overlay")) {
        e.target.classList.remove("mostrar");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.mostrar").forEach(m => m.classList.remove("mostrar"));
    }
});

// ==========================================
// EMITIR FACTURA DESDE PEDIDOS (ADMIN)
// ==========================================
let pedidoFacturaActual = null;
let itemsFacturaActual = [];

async function generarNumeroFacturaGlobal() {
    const anio = new Date().getFullYear();
    const { data, error } = await supabaseClient
        .from("facturas")
        .select("numero_factura");

    if (error) throw error;

    let max = 0;
    (data || []).forEach(f => {
        const m = (f.numero_factura || "").match(/(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    });

    return `INV-${anio}-${String(max + 1).padStart(4, "0")}`;
}

async function abrirModalFacturaAdmin(pedidoId) {
    const overlay = document.getElementById("overlay-factura-admin");
    if (!overlay) return;

    // Si el pedido ya tiene factura, se avisa y no se abre
    const { data: existente } = await supabaseClient
        .from("facturas")
        .select("numero_factura")
        .eq("pedido_id", pedidoId)
        .limit(1);

    if (existente && existente.length > 0) {
        showToast("Este pedido ya fue facturado (" + existente[0].numero_factura + ").", "error");
        return;
    }

    showLoader(true);
    const [pedRes, detRes] = await Promise.all([
        supabaseClient.from("pedidos").select("*").eq("id", pedidoId).single(),
        supabaseClient.from("detalle_pedidos").select("*, productos(nombre)").eq("pedido_id", pedidoId)
    ]);
    showLoader(false);

    if (pedRes.error || detRes.error) {
        showToast("Error al cargar el pedido: " + (pedRes.error?.message || detRes.error?.message), "error");
        return;
    }

    const pedido = pedRes.data;
    const detalle = detRes.data || [];

    if (detalle.length === 0) {
        showToast("El pedido no tiene productos para facturar.", "error");
        return;
    }

    pedidoFacturaActual = pedido;
    itemsFacturaActual = detalle;

    const ivaPct = 16;
    const subtotal = detalle.reduce((a, d) => a + (d.cantidad * d.precio_unitario), 0);
    const impuesto = subtotal * (ivaPct / 100);
    const total = subtotal + impuesto;

    const filas = detalle.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${d.productos?.nombre || 'Producto'}</td>
            <td>${d.cantidad}</td>
            <td>$${Number(d.precio_unitario).toFixed(2)}</td>
            <td>$${(d.cantidad * d.precio_unitario).toFixed(2)}</td>
        </tr>
    `).join("");

    document.getElementById("cuerpo-factura-admin").innerHTML = `
        <div style="margin-bottom:16px; font-size:14px; color:#475569;">
            <div><strong style="color:#1e293b;">Cliente:</strong> ${pedido.cliente_nombre || 'N/A'}</div>
            <div><strong style="color:#1e293b;">Identificación:</strong> ${pedido.cliente_identificacion || 'N/A'}</div>
            <div><strong style="color:#1e293b;">Pedido:</strong> #${pedido.id}</div>
            <div><strong style="color:#1e293b;">Correo del cliente:</strong> ${pedido.usuario_email || '— (no aparecerá en el portal del cliente)'}</div>
        </div>
        <table class="tabla">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Cant.</th>
                    <th scope="col">Precio Unit.</th>
                    <th scope="col">Subtotal</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
        <div class="totales-factura-admin">
            <div><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
            <div><span>IVA (${ivaPct}%)</span><span>$${impuesto.toFixed(2)}</span></div>
            <div><span>Total</span><span>$${total.toFixed(2)}</span></div>
        </div>
    `;

    overlay.classList.add("mostrar");
}

function cerrarModalFacturaAdmin() {
    const overlay = document.getElementById("overlay-factura-admin");
    if (overlay) overlay.classList.remove("mostrar");
    pedidoFacturaActual = null;
    itemsFacturaActual = [];
}

async function aprobarFacturaAdmin() {
    if (!pedidoFacturaActual) return;

    const pedido = pedidoFacturaActual;

    // Verificación final de duplicados
    const { data: existente } = await supabaseClient
        .from("facturas")
        .select("id")
        .eq("pedido_id", pedido.id)
        .limit(1);

    if (existente && existente.length > 0) {
        showToast("Este pedido ya fue facturado.", "error");
        cerrarModalFacturaAdmin();
        return;
    }

    const ivaPct = 16;
    const subtotal = itemsFacturaActual.reduce((a, d) => a + (d.cantidad * d.precio_unitario), 0);
    const impuesto = subtotal * (ivaPct / 100);
    const total = subtotal + impuesto;

    let numero;
    try {
        numero = await generarNumeroFacturaGlobal();
    } catch (err) {
        showToast("No se pudo generar el número de factura: " + err.message, "error");
        return;
    }

    showLoader(true);
    try {
        const { data: factura, error: errFac } = await supabaseClient
            .from("facturas")
            .insert([{
                numero_factura: numero,
                pedido_id: pedido.id,
                cliente_nombre: pedido.cliente_nombre || "Cliente",
                cliente_identificacion: pedido.cliente_identificacion || null,
                subtotal: subtotal,
                impuesto: impuesto,
                total: total,
                iva_porcentaje: ivaPct,
                estado: "emitida"
            }])
            .select()
            .single();

        if (errFac) throw errFac;

        const detalles = itemsFacturaActual.map(d => ({
            factura_id: factura.id,
            producto_id: d.producto_id,
            descripcion: d.productos?.nombre || "Producto",
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.cantidad * d.precio_unitario
        }));

        const { error: errDet } = await supabaseClient
            .from("factura_detalles")
            .insert(detalles);

        if (errDet) throw errDet;

        const { error: errEstado } = await supabaseClient
            .from("pedidos")
            .update({ estado: "aprobado" })
            .eq("id", pedido.id);

        if (errEstado) console.warn("No se pudo actualizar el estado del pedido:", errEstado.message);

        showToast(`¡Factura ${numero} aprobada y enviada al cliente!`, "success");
        cerrarModalFacturaAdmin();
        cargarPedidos();
    } catch (err) {
        console.error("Error al aprobar la factura:", err);
        showToast("Error al aprobar la factura: " + err.message, "error");
    } finally {
        showLoader(false);
    }
}

function abrirModalRechazoAdmin() {
    const overlay = document.getElementById("overlay-rechazo-admin");
    if (!overlay) return;
    document.getElementById("rechazo-observacion").value = "";
    overlay.classList.add("mostrar");
}

function cerrarModalRechazoAdmin() {
    const overlay = document.getElementById("overlay-rechazo-admin");
    if (overlay) overlay.classList.remove("mostrar");
}

async function rechazarPedidoAdmin() {
    if (!pedidoFacturaActual) return;

    const observacion = document.getElementById("rechazo-observacion").value.trim();

    if (observacion.length < 10) {
        showToast("Escribe una observación (mín. 10 caracteres) para el cliente.", "error");
        return;
    }

    showLoader(true);
    const { error } = await supabaseClient
        .from("pedidos")
        .update({ estado: "rechazado", observacion_rechazo: observacion })
        .eq("id", pedidoFacturaActual.id);
    showLoader(false);

    if (error) {
        showToast("Error al rechazar el pedido: " + error.message, "error");
        return;
    }

    showToast("Pedido rechazado. La observación se envió al cliente.", "success");
    cerrarModalRechazoAdmin();
    cerrarModalFacturaAdmin();
    cargarPedidos();
}