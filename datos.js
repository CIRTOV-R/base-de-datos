// ============================================
// VERIFICACIÓN DE AUTENTICACIÓN Y ROL
// ============================================
async function verificarAdmin() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'index.html';
            return false;
        }

        // Verificar si es admin (asumiendo que tienes un campo 'rol' en tu tabla de usuarios)
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', session.user.id)
            .single();

        if (usuario?.rol !== 'admin') {
            mostrarToast('Acceso denegado. Solo administradores.', 'error');
            setTimeout(() => {
                window.location.href = 'portal-cliente.html';
            }, 2000);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error verificando admin:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// ============================================
// FUNCIONES DE UI
// ============================================
function mostrarToast(mensaje, tipo = 'exito') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${tipo === 'exito' ? '#10b981' : '#ef4444'}" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            ${tipo === 'exito' 
                ? '<path d="M9 12l2 2 4-4"></path>' 
                : '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
        </svg>
        <span>${mensaje}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarLoader(id) {
    document.getElementById(id).hidden = false;
}

function ocultarLoader(id) {
    document.getElementById(id).hidden = true;
}

// ============================================
// CARGA DE DATOS
// ============================================
async function cargarTodo() {
    await Promise.all([
        cargarPedidos(),
        cargarClientes(),
        cargarInstalaciones(),
        cargarProductos()
    ]);
    mostrarToast('Datos actualizados correctamente');
}

async function cargarPedidos() {
    mostrarLoader('loader-pedidos');
    
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .select(`
                id,
                cliente_id,
                fecha,
                estado,
                clientes (nombre, cedula_rif)
            `)
            .order('fecha', { ascending: false })
            .limit(10);

        if (error) throw error;

        const tbody = document.getElementById('cuerpo-pedidos');
        const vacio = document.getElementById('vacio-pedidos');
        const contador = document.getElementById('contador-pedidos');

        tbody.innerHTML = '';
        contador.textContent = data?.length || 0;

        if (!data || data.length === 0) {
            vacio.hidden = false;
            return;
        }

        vacio.hidden = true;
        
        data.forEach(pedido => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><strong>#${pedido.id}</strong></td>
                <td>${pedido.clientes?.nombre || 'N/A'}</td>
                <td>${pedido.productos_solicitados || 'Sin productos'}</td>
                <td>${new Date(pedido.fecha).toLocaleDateString()}</td>
                <td><span class="badge badge-${pedido.estado === 'completado' ? 'exito' : 'advertencia'}">${pedido.estado}</span></td>
                <td class="acciones">
                    <button class="btn btn-secundario btn-sm" onclick="verPedido(${pedido.id})">Ver</button>
                </td>
            `;
            tbody.appendChild(fila);
        });

    } catch (error) {
        console.error('Error cargando pedidos:', error);
        mostrarToast('Error al cargar pedidos', 'error');
    } finally {
        ocultarLoader('loader-pedidos');
    }
}

// ============================================
// MODALES
// ============================================
function abrirModalInstalacion() {
    document.getElementById('modal-instalacion').showModal();
    cargarSelectsInstalacion();
}

function cerrarModalInstalacion() {
    document.getElementById('modal-instalacion').close();
    document.querySelector('#modal-instalacion form').reset();
}

function abrirModalProducto() {
    document.getElementById('modal-producto').showModal();
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').close();
    document.querySelector('#modal-producto form').reset();
}

function abrirModalCompra() {
    document.getElementById('modal-compra').showModal();
    cargarSelectProductoCompra();
}

function cerrarModalCompra() {
    document.getElementById('modal-compra').close();
    document.querySelector('#modal-compra form').reset();
}

// ============================================
// GUARDAR DATOS
// ============================================
async function guardarInstalacion(event) {
    if (event) event.preventDefault();

    const pedidoId = document.getElementById('inst-pedido-id').value;
    const tecnicoId = document.getElementById('inst-select-tecnico').value;
    const productoId = document.getElementById('inst-select-producto').value;
    const cantidad = document.getElementById('inst-cantidad').value;
    const observaciones = document.getElementById('inst-observaciones').value;

    if (!pedidoId || !tecnicoId || !productoId) {
        mostrarToast('Completa todos los campos requeridos', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('instalaciones')
            .insert({
                pedido_id: parseInt(pedidoId),
                tecnico_id: parseInt(tecnicoId),
                producto_id: parseInt(productoId),
                cantidad: parseInt(cantidad),
                observaciones,
                fecha: new Date().toISOString()
            });

        if (error) throw error;

        mostrarToast('Instalación registrada correctamente');
        cerrarModalInstalacion();
        cargarInstalaciones();

    } catch (error) {
        console.error('Error guardando instalación:', error);
        mostrarToast('Error al guardar instalación', 'error');
    }
}

async function guardarNuevoProducto(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('nuevo-prod-nombre').value;
    const categoria = document.getElementById('nuevo-prod-categoria').value;
    const precio = parseFloat(document.getElementById('nuevo-prod-precio').value);
    const stock = parseInt(document.getElementById('nuevo-prod-stock').value);

    try {
        const { error } = await supabase
            .from('productos')
            .insert({ nombre, categoria, precio, stock });

        if (error) throw error;

        mostrarToast('Producto creado correctamente');
        cerrarModalProducto();
        cargarProductos();

    } catch (error) {
        console.error('Error guardando producto:', error);
        mostrarToast('Error al guardar producto', 'error');
    }
}

async function guardarCompraStock(event) {
    if (event) event.preventDefault();

    const productoId = document.getElementById('select-producto-compra').value;
    const cantidad = parseInt(document.getElementById('cantidad-comprada').value);

    if (!productoId) {
        mostrarToast('Selecciona un producto', 'error');
        return;
    }

    try {
        // Obtener stock actual
        const { data: producto } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', productoId)
            .single();

        // Actualizar stock
        const { error } = await supabase
            .from('productos')
            .update({ stock: producto.stock + cantidad })
            .eq('id', productoId);

        if (error) throw error;

        mostrarToast(`Stock actualizado: +${cantidad} unidades`);
        cerrarModalCompra();
        cargarProductos();

    } catch (error) {
        console.error('Error actualizando stock:', error);
        mostrarToast('Error al actualizar stock', 'error');
    }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const esAdmin = await verificarAdmin();
    if (esAdmin) {
        cargarTodo();
    }
});