// CONFIGURACIÓN DE TU PROYECTO SUPABASE
// (Reemplaza con tus datos reales de Project Settings > API en Supabase)
const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU_CLAVE_ANONIMA_DE_SUPABASE";

// Inicializar el cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Asegurar que el código corra cuando el HTML esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    
    // === FUNCIONALIDAD: REGISTRAR USUARIO ===
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-pass').value;

            // Inserta el nuevo usuario en la tabla de Supabase
            const { data, error } = await supabaseClient
                .from('usuarios')
                .insert([{ nombre, email, password }]);

            if (error) {
                alert("Error al registrar: " + error.message);
            } else {
                alert("¡Usuario creado con éxito en Supabase!");
                window.location.href = "index.html"; // Redirige al Login
            }
        });
    }

    // === FUNCIONALIDAD: LOGIN DE USUARIO ===
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-pass').value;

            // Consulta si existe el usuario con ese correo y contraseña
            const { data, error } = await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .eq('password', password);

            if (error || !data || data.length === 0) {
                alert("Credenciales incorrectas o usuario inexistente.");
            } else {
                alert("¡Ingreso correcto! Bienvenido/a " + data[0].nombre);
                window.location.href = "datos.html"; // Redirige al Panel de Datos
            }
        });
    }

    // === AUTOMATIZACIÓN: CARGAR DATOS SI ESTAMOS EN DATOS.HTML ===
    // Esto hace que los datos carguen solos al entrar a la página sin obligar a presionar el botón
    if (document.getElementById('cuerpo-tabla')) {
        cargarClientes();
    }
});

// === FUNCIONALIDAD: OBTENER Y MOSTRAR LOS CLIENTES ===
async function cargarClientes() {
    const tabla = document.getElementById('cuerpo-tabla');
    if (!tabla) return;

    tabla.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando datos desde Supabase...</td></tr>`;

    const { data: clientes, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .order('id', { ascending: true }); // Ordenados por ID

    if (error) {
        alert("Error al cargar los datos: " + error.message);
        return;
    }

    tabla.innerHTML = ""; // Vaciar mensaje de carga

    if (clientes.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay clientes registrados.</td></tr>`;
        return;
    }

    // Recorrer los 15 registros y agregarlos a la tabla
    clientes.forEach(cliente => {
        tabla.innerHTML += `
            <tr>
                <td>${cliente.id}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.empresa || 'N/A'}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>${cliente.ciudad || 'N/A'}</td>
            </tr>
        `;
    });
}