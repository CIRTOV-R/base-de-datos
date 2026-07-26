// ==========================================
// CONFIGURACIÓN DE SUPABASE
// Proyecto: Innova - UTS Guayana
// ==========================================
const SUPABASE_URL = "https://heshjmfxuxiczjllnmnp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_lXFlQOWjdoU3_HZUhQsO-Q_z6BnVyTT";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado correctamente. Inicializando eventos...");

    const formLogin = document.getElementById("form-login");
    
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Formulario de login interceptado.");

            const emailInput = document.getElementById("login-email");
            const passInput = document.getElementById("login-pass");

            if (!emailInput || !passInput) {
                alert("Error: No se encontraron los campos de correo o contraseña.");
                return;
            }

            const email = emailInput.value.trim();
            const password = passInput.value;

            console.log("Intentando iniciar sesión con:", email);

            try {
                // Consulta directa a Supabase
                const { data: usuarios, error } = await supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("email", email)
                    .eq("password", password);

                console.log("Respuesta recibida de Supabase:", { usuarios, error });

                if (error) {
                    throw error;
                }

                if (usuarios && usuarios.length > 0) {
                    console.log("¡Usuario encontrado! Redirigiendo a datos.html...");
                    localStorage.setItem("usuario_conectado", JSON.stringify(usuarios[0]));
                    
                    // Redirección inmediata
                    window.location.href = "datos.html";
                } else {
                    alert("Correo o contraseña incorrectos.");
                }

            } catch (err) {
                console.error("Error crítico en la conexión con Supabase:", err);
                alert("Error al conectar con la base de datos: " + err.message);
            }
        });
    } else {
        console.warn("No se encontró el elemento #form-login en esta página.");
    }
});
// prueba  
