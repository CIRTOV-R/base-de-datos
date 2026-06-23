// CONFIGURACIÓN DE TU PROYECTO SUPABASE
const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU_CLAVE_ANONIMA_DE_SUPABASE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- EVENTO: REGISTRAR USUARIO ---
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;

        const { data, error } = await supabaseClient
            .from('usuarios')
            .insert([{ nombre, email, password }]);

        if (error) {
            alert("Error al registrar: " + error.message);
        } else {
            alert("Usuario creado con éxito en Supabase.");
            window.location.href = "index.html"; // Te manda al login
        }
    });
}

// --- EVENTO: LOGIN DE USUARIO ---
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        // Busca en la tabla usuarios si coincide el correo y contraseña
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('password', password);

        if (error || data.length === 0) {
            alert("Usuario o contraseña incorrectos.");
        } else {
            alert("¡Ingreso correcto! Bienvenido " + data[0].nombre);
            window.location.href = "datos.html"; // Te manda a ver las tablas
        }
    });
}

// --- FUNCIÓN: MOSTRAR LOS DATOS DE LA TABLA ---
async function cargarClientes() {
    const { data: clientes, error } = await supabaseClient
        .from('clientes')
        .select('*');

    if (error) {
        alert("Error cargando datos: " + error.message);
        return;
    }

    const tabla = document.getElementById('cuerpo-tabla');
    tabla.innerHTML = ""; // Vaciar la tabla antes de cargar

    clientes.forEach(cliente => {
        tabla.innerHTML += `
            <tr>
                <td>${cliente.id}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.empresa}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.ciudad}</td>
            </tr>
        `;
    });
}