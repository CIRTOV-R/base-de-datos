# Informe de Revisión y Corrección — Sistema Innova

**Proyecto:** base-de-datos (Innova)
**Base de datos:** Supabase
**Despliegue:** Vercel (sitio estático)
**Fecha:** 05/08/2026

---

## 1. Errores encontrados y corregidos

### 1.1 Errores de sintaxis

| # | Archivo | Problema | Corrección |
|---|---------|----------|------------|
| 1 | `portal-cliente.html` (línea 1) | `<<!DOCTYPE html>` — un `<` de más. El navegador abría la página en *quirks mode*, causando estilos/posicionamiento inconsistentes. | Se reescribió el archivo con `<!DOCTYPE html>` válido. |
| 2 | `datos.html` | Doble carga de datos: `conexion.js` y el script inline cargaban `cargarTodo()` al mismo tiempo (doble consulta a Supabase). | Se dejó que `conexion.js` cargue los datos y el script inline solo hace la validación de rol. |

### 1.2 Bugs de lógica

| # | Archivo | Problema | Corrección |
|---|---------|----------|------------|
| 3 | `conexion.js` (registro) | Los usuarios nuevos se creaban **sin rol** (`rol = NULL`). Al iniciar sesión el rol quedaba vacío y `portal-cliente.html` bloqueaba el acceso: **un usuario recién registrado no podía entrar**. | Los usuarios nuevos se crean siempre con `rol: "basico"`. El login normaliza cualquier rol a `admin` o `basico`. |
| 4 | `conexion.js` (login) | Se comparaba la contraseña directamente en la consulta SQL (`.eq("password", valor)`). | Ahora se busca por correo y se compara en el cliente; se normaliza el rol y se redirige según nivel. |
| 5 | `conexion.js` (carga del panel) | Los datos del panel se consultaban **antes** de verificar el rol (un usuario básico visitando `datos.html` disparaba consultas antes de ser redirigido). | `cargarTodo()` y `cargarUsuarios()` solo se ejecutan si el rol es `admin`. |
| 6 | `conexion.js` (`cargarPedidos`) | Si el error de consulta se combinaba con datos vacíos, se mostraba "No hay pedidos" sin informar el error real. Además `new Date(ped.created_at)` explotaba si la fecha era nula. | Se muestra el mensaje de error real y se protege la fecha nula (`created_at ? new Date(...) : "N/A"`). También se actualiza el contador de pedidos. |
| 7 | `portal-cliente.html` | Los formularios de pedido e instalación eran **simulados** (solo mostraban `alert` y reset, no guardaban nada). Un pedido del usuario básico se perdía. | Se implementaron formularios reales contra Supabase (insertar pedido, detalle de pedido, descontar stock, asignar técnico). |
| 8 | `portal-cliente.html` | El `<select>` de productos usaba `option.value = prod.nombre` (valor de texto) en lugar del ID. | Se usa `option.value = prod.id`. |
| 9 | `pedido.html` | No tenía protección de sesión: cualquiera podía entrar y crear pedidos sin iniciar sesión. | Se agregó validación de sesión activa; si no hay sesión, redirige a `index.html`. |

### 1.3 Mal manejo de flujos / accesos

- **Dos niveles de usuario implementados:**
  - **Administrador** (`rol = admin`) → acceso total: `datos.html` (clientes, pedidos, instalaciones/técnicos, inventario y ahora Gestión de Usuarios).
  - **Usuario Básico** (`rol = basico`) → acceso limitado: `portal-cliente.html` con **Gestión de Pedidos** y **Asignación de Técnicos** únicamente.
- El registro público crea siempre usuarios **básicos** (nadie puede autoregistrarse como admin).
- **Gestión de Usuarios (nuevo, solo admin):** sección en `datos.html` para crear usuarios, asignar rol y cambiar roles de `admin` ↔ `basico`.
- Redirecciones correctas: `admin → datos.html`, `basico → portal-cliente.html`; los no logueados van a `index.html`.

---

## 2. Validaciones de campos añadidas

| Campo | Validación |
|-------|------------|
| Nombre completo | Mínimo 2 palabras (nombre y apellido) — ya existía y se conservó. |
| Correo electrónico | Formato válido con regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. |
| Contraseña | Mínimo 6 caracteres. |
| Correo duplicado | Se consulta si el correo ya existe antes de insertar (registro público y creación desde panel admin). |
| Pedido | Cliente: nombre completo + identificación (mín. 4 caracteres). Productos: cantidad > 0 y ≤ stock disponible. |
| Asignación de técnico | Requiere pedido, técnico, producto y cantidad ≥ 1. |

---

## 3. Archivos modificados

- `conexion.js` — validaciones, login/registro corregidos, carga protegida por rol, `cargarUsuarios()`, `cambiarRolUsuario()`, `cargarPedidos` corregido.
- `datos.html` — nueva sección "Gestión de Usuarios", script de protección simplificado (sin doble carga).
- `portal-cliente.html` — reescrito como **Portal Básico** (sintaxis corregida + funcionalidad real).
- `pedido.html` — protección de sesión.

---

## 4. Observaciones y pendientes (no bloqueantes)

1. **Contraseñas en texto plano.** Se recomienda fuertemente almacenar un hash (p. ej. SHA-256 con Web Crypto o bcrypt en un backend) en lugar del texto plano. La corrección se omitió para no romper el inicio de sesión de las cuentas existentes.
2. **RLS en Supabase.** Verificar que las políticas *Row Level Security* de la tabla `usuarios` impidan que cualquier usuario anónimo lea/modifique cuentas. Con la clave anónima expuesta en el cliente, sin RLS cualquier persona puede leer la tabla.
3. **`datos.js` sin uso.** El archivo define funciones duplicadas de `conexion.js` pero **ningún HTML lo carga**. Se recomienda eliminarlo para evitar confusión.
4. **Código CRUD muerto en `conexion.js`** (referencias a `crud-form`, `form-overlay`, `openEditModal`, `deleteRecord`): esos elementos no existen en `datos.html`, por lo que ese bloque nunca se ejecuta. Puede eliminarse o integrarse cuando se añadan botones Editar/Eliminar.
5. **Identificación del cliente** guardada como texto libre; si se desea, puede validarse como solo números para cédula.

---

## 5. Paso a paso: actualizar el repositorio de GitHub

El repositorio remoto ya está configurado:
`origin → https://github.com/CIRTOV-R/base-de-datos.git` (rama `main`).

### Opción A — Desde la terminal

```bash
# 1. Entrar a la carpeta del proyecto
cd "/home/vixt0/Desktop/victor univ/proyecto de tecnoinova/base-de-datos"

# 2. Ver el estado y qué archivos cambiaron
git status
git diff --stat

# 3. Añadir todos los cambios al área de staging
git add .

# 4. Crear un commit con mensaje descriptivo
git commit -m "Corrección de bugs, validaciones y roles de usuario (admin/basico)"

# 5. Subir los cambios a GitHub
git push origin main
```

### Opción B — Desde VS Code (Git GUI)

1. Abre la carpeta del proyecto en VS Code.
2. Ve al ícono **Control de código fuente** (rama del lado izquierdo, `Ctrl+Shift+G`).
3. Escribe el mensaje del commit y pulsa **✓ Commit** (flecha para "Confirmar y enviar" o usa **Sincronizar cambios**).
4. Si pide autenticación, elige "Iniciar sesión con GitHub".

### Opción C — Despliegue en Vercel (recordatorio)

Una vez subido a GitHub, Vercel detecta el cambio y redepliega el proyecto automáticamente si está conectado al repo. En **Settings → Git → Ignored Build Step** se puede dejar el build estándar; no hay dependencias, así que el comando de build puede quedar vacío y el directorio de salida como raíz.

> Nota: al ser sitio estático, Vercel solo sirve los archivos; la base de datos vive en Supabase y no requiere cambios de despliegue.
