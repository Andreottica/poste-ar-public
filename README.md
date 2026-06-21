
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
- **Base de datos:** libSQL (compatible con SQLite — recomendamos [Turso](https://turso.tech) para producción)
- **Cifrado:** ECDH P-256 + AES-GCM 256 (Web Crypto API nativa del navegador)
- **Identidad:** PBKDF2 (310.000 iteraciones) → par de claves P-256
- **CDN/Proxy:** se recomienda Cloudflare u otro CDN por delante del servidor

---

## Cómo deployar tu propia instancia

### Requisitos

- Node.js 18+
- Base de datos compatible con libSQL (ej: [Turso](https://turso.tech), o SQLite local para desarrollo)
- Un proveedor de hosting Node.js (ej: Render, Railway, Fly.io, VPS propio)
- CDN por delante del servidor (recomendado — el código incluye middleware que bloquea acceso directo)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tu-repo
cd tu-repo
npm install
```

### 2. Configurar variables de entorno

Renombrá `.env` a `.env` y completá con tus credenciales:

```
TURSO_URL=tu_url_de_base_de_datos
TURSO_TOKEN=tu_token_secreto
PORT=3000
```

> **En producción** no uses el archivo `.env` — configurá estas variables directamente en el panel de tu proveedor de hosting (en Render: Settings → Environment Variables). Nunca subas credenciales reales a GitHub.

### 3. Base de datos

Las tablas se crean automáticamente al iniciar el servidor. Por referencia:

```sql
CREATE TABLE posteos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etiqueta TEXT NOT NULL,
    contenido TEXT NOT NULL,
    color TEXT,
    semilla TEXT,
    contenido_oculto TEXT,
    contenido_cifrado TEXT,
    contenido_cifrado_propio TEXT,
    contenido_trueque TEXT,
    fecha TEXT,
    tipo TEXT
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

### 4. Iniciar

```bash
npm start
```

### 5. Keep-alive (opcional)

El servidor expone `GET /keep-alive` que responde `ok`. Si usás un proveedor con free tier que duerme el servidor por inactividad (ej: Render free), podés usar un servicio externo de ping periódico apuntando a esa ruta para mantenerlo activo.

### 6. CDN y dominio

El middleware de seguridad verifica headers de Cloudflare. Si usás otro CDN o querés acceso directo durante desarrollo, el servidor permite `localhost` sin restricciones. Para producción con otro CDN, ajustá el middleware en `server.js`.

### 7. Personalización

- Reemplazá todas las menciones a `poste.ar` en los HTML por el nombre de tu sitio
- Actualizá el `sitemap.xml` con tu dominio
- Ajustá la zona horaria en `server.js` si tu sitio no es para Argentina (función `obtenerFechaArgentina`)
- La purga semanal está configurada para lunes 00:00 hs Argentina — ajustala a tu preferencia

---

## Prompt para configuración asistida

Si querés ayuda para configurar tu instancia, podés usar este prompt en Claude:

```
Quiero deployar una red social anónima open source basada en poste.ar.
El stack es Node.js + Express + libSQL (compatible con SQLite).
Necesito configurarlo en [tu proveedor de hosting].
Ayudame paso a paso con la configuración del servidor,
la base de datos y las variables de entorno.
```

---

## Filosofía

En un mundo donde todo se registra y vende, este es un espacio que se borra solo.

No hay algoritmos. No hay perfiles. No hay permanencia.
No hay empresa que venda tus datos. No hay teléfono que te identifique.

Solo comunicación, aquí y ahora.

---

*Código original: andreottica@ · poste.ar · Ciudadela, Buenos Aires, Argentina · 2026*
