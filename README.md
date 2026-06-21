# poste.ar · Red social anónima y cifrada

**Sin registro. Sin teléfono. Sin email. Sin rastro.**

Código original creado por **andreottica@** · Ciudadela, Buenos Aires, Argentina · 2026

---

## ¿Qué es esto?

Un motor de red social minimalista, anónima y efímera. Tres secciones independientes:

- **pp** · timeline público anónimo
- **mm** · mensajes privados cifrados de extremo a extremo  
- **tt** · avisos de trueque públicos

Todo se borra automáticamente una vez por semana. No hay registro, no hay cookies, no hay IPs guardadas.

---

## Licencia y atribución

El código es **open source** bajo licencia MIT: podés usarlo, modificarlo y redistribuirlo libremente.

**Condición:** citá al autor original en tu proyecto: `andreottica@` / https://poste.ar

**El nombre `poste.ar` está registrado** y es propiedad de su autor. Si deployás tu propia instancia, usá un nombre propio.

---

## Stack técnico

- **Frontend:** HTML, CSS, JavaScript vanilla (sin frameworks)
- **Backend:** Node.js + Express
- **Base de datos:** SQLite o compatible (la librería usada es `@libsql/client`)
- **Cifrado:** ECDH P-256 + AES-GCM 256 (Web Crypto API nativa del navegador)
- **Identidad:** PBKDF2 (310.000 iteraciones) → par de claves P-256
- **CDN/Proxy:** se recomienda poner un proxy por delante del servidor para proteger su IP

---

## Cómo deployar tu propia instancia

### Lo que necesitás

1. **Un servidor Node.js** — cualquier proveedor de hosting que soporte Node.js 18+, o un VPS propio.

2. **Una base de datos SQL remota** compatible con `@libsql/client`. Buscá un proveedor de base de datos SQL en la nube, creá una base de datos, y te van a dar una URL de conexión y un token de autenticación.

3. **Un proxy o CDN** por delante del servidor — recomendado para no exponer la IP del servidor directamente. El código incluye un middleware que bloquea el acceso directo (sin proxy). Durante desarrollo local esto no aplica, `localhost` funciona sin restricciones.

---

### Instalación

```bash
git clone https://github.com/tu-usuario/tu-repo
cd tu-repo
npm install
```

---

### Variables de entorno

El servidor necesita estas tres variables para funcionar. Renombrá el archivo `.env.example` a `.env` y completá con tus datos:

```
DB_URL=url_de_tu_base_de_datos
DB_TOKEN=token_de_tu_base_de_datos
PORT=3000
```

- `DB_URL` → la dirección de conexión que te da tu proveedor de base de datos
- `DB_TOKEN` → la clave de autenticación que te da tu proveedor de base de datos
- `PORT` → en producción lo asigna automáticamente el hosting, no hace falta tocarlo

> **Importante:** el archivo `.env` es solo para desarrollo local. En producción, configurá estas variables en el panel de configuración de tu proveedor de hosting — casi todos tienen una sección llamada "Environment Variables" o "Variables de entorno". Nunca subas credenciales reales a GitHub.

---

### Base de datos

Las tablas se crean automáticamente al iniciar el servidor por primera vez. No necesitás hacer nada. Por referencia, esta es la estructura:

```sql
CREATE TABLE posteos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etiqueta TEXT NOT NULL,
    contenido TEXT NOT NULL,
    color TEXT, semilla TEXT,
    contenido_oculto TEXT,
    contenido_cifrado TEXT,
    contenido_cifrado_propio TEXT,
    contenido_trueque TEXT,
    fecha TEXT, tipo TEXT
);

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nick TEXT UNIQUE NOT NULL,
    clave_publica TEXT NOT NULL,
    fecha TEXT NOT NULL
);

CREATE TABLE micro_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contenido TEXT NOT NULL,
    fecha TEXT NOT NULL
);
```

---

### Iniciar el servidor

```bash
npm start
```

---

### Keep-alive

El servidor tiene una ruta `GET /keep-alive` que responde `ok`. Algunos proveedores de hosting gratuitos "duermen" el servidor si no recibe visitas por un tiempo. Si es tu caso, podés usar cualquier servicio de ping periódico apuntando a `https://tu-dominio.com/keep-alive` para mantenerlo activo.

---

### Proxy y CDN

El servidor verifica que las peticiones vengan a través de un proxy (chequea headers estándar de CDN). Si tu proveedor de CDN usa headers distintos, ajustá el middleware de seguridad al inicio de `server.js`.

---

### Personalización

- Reemplazá todas las menciones a `poste.ar` en los HTML por el nombre de tu sitio
- Actualizá el `sitemap.xml` con tu dominio
- La purga semanal está configurada para lunes 00:00 hs Argentina — ajustala a tu zona horaria en `server.js` (función `obtenerFechaArgentina`)

---

## Filosofía

En un mundo donde todo se registra y vende, este es un espacio que se borra solo.

No hay algoritmos. No hay perfiles. No hay permanencia.
No hay empresa que venda tus datos. No hay teléfono que te identifique.

Solo comunicación, aquí y ahora.

---

*Código original: andreottica@ · poste.ar · Ciudadela, Buenos Aires, Argentina · 2026*
