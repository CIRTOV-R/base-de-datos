// ==========================================
// CONFIGURACIÓN DE TU PROYECTO SUPABASE
// ==========================================
const SUPABASE_URL = "https://heshjmfxuxiczjllnmnp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_lXFlQOWjdoU3_HZUhQsO-Q_z6BnVyTT";

// Inicializar el cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// DETECTOR DE CARGA DEL DOCUMENTO (DOM)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // --- LÓGICA: FORMULARIO DE LOGIN (index.html) ---
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            // Consultar en la tabla usuarios
            const { data: usuarios, error } = await supabaseClient
                .from("usuarios")
                .select("*")
                .eq("email", email)
                .eq("password", password);

            if (error) {
                alert("Error en el servidor: " + error.message);
                return;
            }

            if (usuarios && usuarios.length > 0) {
                // Credenciales correctas -> Redirecciona al panel
                window.location.href = "datos.html";
            } else {
                alert("Credenciales incorrectas o usuario inexistente.");
            }
        });
    }

    // --- LÓGICA: FORMULARIO DE REGISTRO (registro.html) ---
    const formRegistro = document.getElementById("form-registro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("nombre").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            // Insertar nuevo usuario en la tabla usuarios
            const { error } = await supabaseClient
                .from("usuarios")
                .insert([{ nombre, email, password }]);

            if (error) {
                alert("Error al registrar: " + error.message);
            } else {
                alert("¡Usuario creado con éxito!");
                window.location.href = "index.html"; // Redirige al Login
            }
        });
    }

    // --- LÓGICA: CARGA AUTOMÁTICA DEL PANEL (datos.html) ---
    // Si detecta la tabla de clientes en la página actual, ejecuta la carga masiva
    if (document.getElementById("cuerpo-tabla")) {
        cargarTodo();
    }
});

// ==========================================
// FUNCIONES GLOBALES PARA EL PANEL DE DATOS
// ==========================================

// Función maestra invocada por el botón de actualización y al cargar la página
function cargarTodo() {
    cargarClientes();
    cargarProductos();
}

// Cargar registros de la tabla 'clientes'
async function cargarClientes() {
    const tablaClientes = document.getElementById("cuerpo-tabla");
    if (!tablaClientes) return;

    tablaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando clientes...</td></tr>`;

    const { data: clientes, error } = await supabaseClient
        .from("clientes")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        alert("Error al cargar clientes: " + error.message);
        return;
    }

    tablaClientes.innerHTML = "";

    if (clientes.length === 0) {
        tablaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay clientes registrados.</td></tr>`;
        return;
    }

    clientes.forEach(cli => {
        tablaClientes.innerHTML += `
            <tr>
                <td>${cli.id}</td>
                <td>${cli.nombre}</td>
                <td>${cli.empresa}</td>
                <td>${cli.telefono || 'N/A'}</td>
                <td>${cli.ciudad}</td>
            </tr>
        `;
    });
}

// Cargar registros de la tabla 'productos'
async function cargarProductos() {
    const tablaProductos = document.getElementById("cuerpo-productos");
    if (!tablaProductos) return;

    tablaProductos.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando productos...</td></tr>`;

    const { data: productos, error } = await supabaseClient
        .from("productos")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        alert("Error al cargar productos: " + error.message);
        return;
    }

    tablaProductos.innerHTML = "";

    if (productos.length === 0) {
        tablaProductos.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay productos en el inventario.</td></tr>`;
        return;
    }

    productos.forEach(prod => {
        tablaProductos.innerHTML += `
            <tr>
                <td>${prod.id}</td>
                <td>**${prod.nombre}**</td>
                <td>${prod.categoria || 'N/A'}</td>
                <td>$${prod.precio}</td>
                <td>${prod.stock} u.</td>
            </tr>
        `;
    });
}