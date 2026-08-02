// ============================================
// VERIFICACIÓN DE ROL (USANDO localStorage)
// ============================================
function verificarAdminLocal() {
    const usuarioStr = localStorage.getItem('usuarioLogueado');
    const rolStr = localStorage.getItem('userRole');

    if (!usuarioStr || !rolStr) {
        alert('No hay sesión activa. Inicia sesión nuevamente.');
        window.location.href = 'index.html';
        return false;
    }

    const rol = (rolStr || '').trim().toLowerCase();

    console.log('Verificando rol desde localStorage:', rol);

    if (rol !== 'admin') {
        alert('Acceso denegado. Solo administradores.');
        window.location.href = 'portal-cliente.html';
        return false;
    }

    return true;
}

// ============================================
// TOASTS Y LOADERS LOCALES (USAN DOM DEL PANEL)
// ============================================
function mostrarToastPanel(mensaje, tipo = 'exito') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <span>${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarLoader(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
}

function ocultarLoader(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
}

// ============================================
// CARGA DE DATOS DEL PANEL ADMIN
// ============================================
async function cargarTodo() {
    await Promise.all([
        cargarPedidos(),
        cargarClientes(),
        cargarInstalaciones(),
        cargarProductos()
    ]);
    mostrarToastPanel('Datos actualizados correctamente', 'exito');
}

// ---- PEDIDOS ----
async function cargarPedidos() {
    const tabla = document.getElementById('cuerpo-pedidos');
    const vacio = document.getElementById('vacio-pedidos');
    const contador = document.getElementById('contador-pedidos');
    if (!tabla) return;

    mostrarLoader('loader-pedidos');

    try {
        const { data: pedidos, error } = await supabaseClient
            .from('pedidos')
            .select('*, detalle_pedidos(*, productos(nombre))')
            .order('id', { ascending: false })
            .limit(10);

        if (error) throw error;

        tabla.innerHTML = '';
        contador && (contador.textContent = pedidos?.length || 0);

        if (!pedidos || pedidos.length === 0) {
            if (vacio) vacio.hidden = false;
            tabla.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">
                        📋 No hay pedidos registrados.
                    </td>
                </tr>
            `;
            return;
        }

        if (vacio) vacio.hidden = true;

        pedidos.forEach(ped => {
            const items = ped.detalle_pedidos && ped.detalle_pedidos.length > 0
                ? ped.detalle_pedidos
                    .map(d => `${d.cantidad}x ${d.productos?.nombre || 'Producto'}`)
                    .join(', ')
                : 'Sin detalles';

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>#${ped.id}</td>
                <td><strong>${ped.cliente_nombre}</strong><br>
                    <small style="color:#64748b;">${ped.cliente_identificacion}</small>
                </td>
                <td>${items}</td>
                <td>${new Date(ped.created_at).toLocaleDateString()}</td>
                <td>—</td>
                <td class="acciones">
                    <!-- Aquí podrías agregar botones Ver/Editar -->
                </td>
            `;
            tabla.appendChild(fila);
        });

    } catch (err) {
        console.error('Error cargando pedidos:', err);
        mostrarToastPanel('Error al cargar pedidos', 'error');
    } finally {
        ocultarLoader('loader-pedidos');
    }
}

// ---- CLIENTES ----
async function cargarClientes() {
    const tabla = document.getElementById('cuerpo-tabla');
    if (!tabla) return;

    try {
        const { data: clientes, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!clientes || clientes.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 20px; color: #64748b;">
                        📂 No hay clientes registrados.
                    </td>
                </tr>
            `;
            return;
        }

        tabla.innerHTML = clientes.map(c => `
            <tr>
                <td>#${c.id}</td>
                <td>${c.nombre || 'N/A'}</td>
                <td>${c.empresa || 'N/A'}</td>
                <td>${c.telefono || 'N/A'}</td>
                <td><span class="badge">${c.ciudad || 'N/A'}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error cargando clientes:', err);
        mostrarToastPanel('Error al cargar clientes', 'error');
    }
}

// ---- INSTALACIONES ----
async function cargarInstalaciones() {
    const tabla = document.getElementById('cuerpo-instalaciones');
    if (!tabla) return;

    try {
        const { data: instalaciones, error } = await supabaseClient
            .from('instalaciones')
            .select(`
                id,
                fecha_instalacion,
                cantidad_instalada,
                pedidos ( id, cliente_nombre ),
                tecnicos ( nombre_completo ),
                productos ( nombre )
            `)
            .order('id', { ascending: false });

        if (error) throw error;

        if (!instalaciones || instalaciones.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">
                        🔧 No hay instalaciones registradas todavía.
                    </td>
                </tr>
            `;
            return;
        }

        tabla.innerHTML = instalaciones.map(i => `
            <tr>
                <td>#${i.id}</td>
                <td>Pedido #${i.pedidos?.id || 'N/A'}<br>
                    <small style="color:#64748b;">${i.pedidos?.cliente_nombre || ''}</small>
                </td>
                <td><strong>${i.tecnicos?.nombre_completo || 'Sin asignar'}</strong></td>
                <td>${i.productos?.nombre || 'Dispositivo genérico'}</td>
                <td><span style="font-weight:bold; color:#2563eb;">${i.cantidad_instalada} u.</span></td>
                <td>${i.fecha_instalacion || 'N/A'}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error cargando instalaciones:', err);
        mostrarToastPanel('Error al cargar instalaciones', 'error');
    }
}

// ---- PRODUCTOS ----
async function cargarProductos() {
    const tabla = document.getElementById('cuerpo-productos');
    if (!tabla) return;

    try {
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!productos || productos.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 20px; color: #64748b;">
                        📦 Sin inventario disponible.
                    </td>
                </tr>
            `;
            return;
        }

        tabla.innerHTML = productos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria || 'N/A'}</td>
                <td><span style="color:#10b981; font-weight:600;">$${Number(p.precio).toFixed(2)}</span></td>
                <td>${p.stock} u.</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error cargando productos:', err);
        mostrarToastPanel('Error al cargar inventario', 'error');
    }
}

// ============================================
// MODALES (USAN LOS PANEL-NUEVO-PRODUCTO Y PANEL-COMPRA EXISTENTES)
// ============================================
function abrirModalInstalacion() {
    const panel = document.getElementById('panel-instalacion');
    const selectTecnico = document.getElementById('inst-select-tecnico');
    const selectProducto = document.getElementById('inst-select-producto');

    if (!panel) return;
    panel.style.display = 'block';

    // Técnicos
    supabaseClient
        .from('tecnicos')
        .select('id, nombre_completo')
        .order('nombre_completo')
        .then(({ data }) => {
            if (!selectTecnico) return;
            selectTecnico.innerHTML = data && data.length
                ? data.map(t => `<option value="${t.id}">${t.nombre_completo}</option>`).join('')
                : '<option value="">No hay técnicos registrados</option>';
        });

    // Productos
    supabaseClient
        .from('productos')
        .select('id, nombre')
        .order('nombre')
        .then(({ data }) => {
            if (!selectProducto) return;
            selectProducto.innerHTML = data && data.length
                ? data.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')
                : '<option value="">No hay productos disponibles</option>';
        });
}

function cerrarModalInstalacion() {
    const panel = document.getElementById('panel-instalacion');
    if (panel) panel.style.display = 'none';
}

// guardarInstalacion ya lo tienes en conexion.js; puedes usar ese mismo

function abrirModalNuevoProducto() {
    const panel = document.getElementById('panel-nuevo-producto');
    if (panel) panel.style.display = 'block';
}

function cerrarModalNuevoProducto() {
    const panel = document.getElementById('panel-nuevo-producto');
    if (panel) panel.style.display = 'none';
}

function abrirModalCompra() {
    const panel = document.getElementById('panel-compra');
    const select = document.getElementById('select-producto-compra');

    if (!panel || !select) return;
    panel.style.display = 'block';

    supabaseClient
        .from('productos')
        .select('id, nombre, stock')
        .order('nombre')
        .then(({ data, error }) => {
            if (error) {
                mostrarToastPanel('Error al cargar productos', 'error');
                return;
            }
            select.innerHTML = data && data.length
                ? data.map(p => `<option value="${p.id}" data-stock="${p.stock}">${p.nombre} (Stock actual: ${p.stock})</option>`).join('')
                : '<option value="">No hay productos disponibles</option>';
        });
}

function cerrarModalCompra() {
    const panel = document.getElementById('panel-compra');
    if (panel) panel.style.display = 'none';
}

// ============================================
// LOGOUT DEL PANEL
// ============================================
function logoutPanel() {
    // Si usas solo login manual, limpia localStorage
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}

// ============================================
// INICIALIZACIÓN DEL PANEL ADMIN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const esAdmin = verificarAdminLocal();
    if (esAdmin) {
        cargarTodo();
    }
});