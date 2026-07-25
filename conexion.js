// ==========================================
// CONFIGURACIÓN DE SUPABASE
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
            const emailInput = document.getElementById("login-email") || document.getElementById("email");
            const passInput = document.getElementById("login-pass") || document.getElementById("password");
            
            if (!emailInput || !passInput) {
                alert("Error: No se encontraron los campos de texto.");
                return;
            }

            const { data: usuarios, error } = await supabaseClient
                .from("usuarios")
                .select("*")
                .eq("email", emailInput.value.trim())
                .eq("password", passInput.value);

            if (error) { alert("Error: " + error.message); return; }

            if (usuarios && usuarios.length > 0) {
                window.location.href = "datos.html";
            } else {
                alert("Credenciales incorrectas.");
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

            const { error } = await supabaseClient.from("usuarios").insert([{ nombre, email, password }]);
            if (error) {
                alert("Error al registrar: " + error.message);
            } else {
                alert("¡Usuario creado con éxito!");
                window.location.href = "index.html";
            }
        });
    }

    // --- CARGA DE DATOS EN PANEL ---
    if (document.getElementById("cuerpo-tabla")) {
        cargarTodo();
    }

    // --- INICIALIZAR VISTA DE NUEVO PEDIDO ---
    if (document.getElementById("form-pedido")) {
        inicializarFormularioPedido();
    }
});

// Funciones globales del Panel
function cargarTodo() {
    cargarClientes();
    cargarProductos();
    cargarPedidos();
}

async function cargarClientes() {
    const tabla = document.getElementById("cuerpo-tabla");
    if (!tabla) return;
    const { data: clientes } = await supabaseClient.from("clientes").select("*").order("id");
    tabla.innerHTML = clientes.length ? clientes.map(c => `<tr><td>#${c.id}</td><td>${c.nombre}</td><td>${c.empresa}</td><td>${c.telefono || 'N/A'}</td><td><span class="badge">${c.ciudad}</span></td></tr>`).join('') : `<tr><td colspan="5" style="text-align:center;">No hay clientes.</td></tr>`;
}

async function cargarProductos() {
    const tabla = document.getElementById("cuerpo-productos");
    if (!tabla) return;
    const { data: productos } = await supabaseClient.from("productos").select("*").order("id");
    tabla.innerHTML = productos.length ? productos.map(p => `<tr><td>#${p.id}</td><td>${p.nombre}</td><td>${p.categoria || 'N/A'}</td><td><span class="precio">$${p.precio}</span></td><td>${p.stock} u.</td></tr>`).join('') : `<tr><td colspan="5" style="text-align:center;">Sin inventario.</td></tr>`;
}

async function cargarPedidos() {
    const tabla = document.getElementById("cuerpo-pedidos");
    if (!tabla) return;
    const { data: pedidos } = await supabaseClient.from("pedidos").select("*, detalle_pedidos(*, productos(nombre))").order("id", { ascending: false });
    
    if (!pedidos || pedidos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay pedidos registrados.</td></tr>`;
        return;
    }

    tabla.innerHTML = pedidos.map(ped => {
        const items = ped.detalle_pedidos.map(d => `${d.cantidad}x ${d.productos?.nombre || 'Producto'}`).join(', ');
        return `
            <tr>
                <td>#${ped.id}</td>
                <td><strong>${ped.cliente_nombre}</strong><br><small>${ped.cliente_identificacion}</small></td>
                <td>${items}</td>
                <td>${new Date(ped.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// LÓGICA MULTI-PRODUCTO PARA PEDIDOS
// ==========================================
let productosDisponibles = [];

async function inicializarFormularioPedido() {
    const { data } = await supabaseClient.from("productos").select("*").gt("stock", 0);
    productosDisponibles = data || [];
    agregarFilaProducto();

    document.getElementById("btn-agregar-linea").addEventListener("click", agregarFilaProducto);
    
    document.getElementById("form-pedido").addEventListener("submit", async (e) => {
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

            // Validar stock local
            const prod = productosDisponibles.p(p => p.id === prodId);
            if (prod && cantidad > prod.stock) {
                alert(`Stock insuficiente para ${prod.nombre}. Stock disponible: ${prod.stock}`);
                return;
            }

            itemsPedido.push({ producto_id: prodId, cantidad, precio_unitario: prod.precio });
        }

        if (itemsPedido.length === 0) {
            alert("Agrega al menos un producto válido al pedido.");
            return;
        }

        // 1. Crear el Pedido Principal
        const { data: nuevoPedido, error: errPed } = await supabaseClient
            .from("pedidos")
            .insert([{ cliente_nombre: nombre, cliente_identificacion: identificacion }])
            .select()
            .single();

        if (errPed) { alert("Error al crear pedido: " + errPed.message); return; }

        // 2. Insertar Detalles y Actualizar Stock
        for (let item of itemsPedido) {
            await supabaseClient.from("detalle_pedidos").insert([{
                pedido_id: nuevoPedido.id,
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario
            }]);

            // Descontar stock en tabla productos
            const prodActual = productosDisponibles.find(p => p.id === item.producto_id);
            await supabaseClient
                .from("productos")
                .update({ stock: prodActual.stock - item.cantidad })
                .eq("id", item.producto_id);
        }

        alert("¡Pedido registrado con éxito y stock actualizado!");
        window.location.href = "datos.html";
    });
}

function agregarFilaProducto() {
    const contenedor = document.getElementById("contenedor-productos-pedido");
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
        <button type="button" class="btn-eliminar-linea" style="background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">X</button>
    `;

    div.querySelector(".btn-eliminar-linea").addEventListener("click", () => {
        if (document.querySelectorAll(".fila-producto-item").length > 1) {
            div.remove();
        } else {
            alert("El pedido debe tener al menos un producto.");
        }
    });

    contenedor.appendChild(div);

}
async function cargarProductos() {
    const tabla = document.getElementById("cuerpo-productos");
    if (!tabla) return;
    
    const { data: productos, error } = await supabaseClient.from("productos").select("*").order("id");
    
    if (error) {
        alert("Error al cargar inventario: " + error.message);
        return;
    }

    tabla.innerHTML = productos && productos.length > 0 
        ? productos.map(p => `<tr><td>#${p.id}</td><td>${p.nombre}</td><td>${p.categoria || 'N/A'}</td><td><span class="precio">$${p.precio}</span></td><td>${p.stock} u.</td></tr>`).join('') 
        : `<tr><td colspan="5" style="text-align:center;">Sin inventario.</td></tr>`;
}