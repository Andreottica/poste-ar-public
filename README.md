# poste.ar · Código Frontend (Auditable)
**Red social anónima con cifrado AES-256 del lado del cliente**
🌐 [https://poste.ar](https://poste.ar)

---

## ¿Qué es este repositorio?

Este es el **código frontend público** de poste.ar — la parte que corre en tu navegador. Podés auditarlo para verificar que el cifrado funciona como decimos.

**Lo que encontrás acá:**
- `index.html` — estructura de la aplicación
- `postear.js` — toda la lógica JavaScript incluyendo cifrado
- `postear.txt` — manual de uso
- `administrador.txt` — semilla del canal de contacto (ver más abajo)
- `themes/` — estilos CSS (default, retro, mobile)

**Lo que NO encontrás acá:**
- Código del servidor (backend)
- Configuraciones de base de datos
- Credenciales o tokens

---

## Cómo funciona

poste.ar tiene dos espacios separados:

- **Timeline público** — cualquiera puede leer y escribir. Cada posteo recibe una firma automática única (`reti.344@poste.ar`) que identifica al posteo, no a la persona.
- **Timeline cifrado** — canal invisible al público. Solo quien tenga las palabras semilla correctas puede leer los mensajes. Permite chatear en grupo de forma secreta: todos los que usen la misma semilla comparten el mismo canal.

No hay registro. No hay cuenta. No hay perfil. No hay login.

---

## Cómo funciona el cifrado

El cifrado ocurre **en tu navegador** antes de enviar al servidor:

```javascript
// En postear.js
const contenidoCifrado = CryptoJS.AES.encrypt(textoFinal, semilla).toString();
```

El descifrado también ocurre en el navegador. La semilla nunca sale de tu dispositivo.

El servidor nunca ve:
- Semillas de mensajes
- Nicks o seudónimos (viajan cifrados dentro del mensaje)
- El contenido de mensajes cifrados (solo recibe texto ilegible)

---

## Tecnología

- **Cifrado:** CryptoJS AES-256
- **Sin dependencias** frontend (excepto CryptoJS desde CDN)
- **Vanilla JavaScript** — sin frameworks

---

## Estructura de archivos

```
poste-ar-public/
├── index.html          # Estructura HTML
├── postear.js          # Lógica + cifrado
├── postear.txt         # Manual de uso
├── administrador.txt   # Semilla del canal de contacto (reemplazar con tus palabras)
└── themes/
    ├── default.css     # Tema por defecto
    ├── retro.css       # Tema retro
    └── mobile.css      # Estilos mobile
```

---

## ¿Querés correr tu propia instancia?

El código del servidor no está en este repositorio por razones de seguridad operativa.

Para implementar tu propia versión necesitás un backend Node.js con estas rutas:

- `GET /api/posts` — devuelve el timeline
- `POST /api/postear` — guarda un post y genera su firma automática
- `GET /api/buscar?q=...` — búsqueda en el timeline
- `GET /api/contacto-semilla` — devuelve la semilla del canal de contacto (uso interno)

La base de datos requiere esta estructura:

```sql
CREATE TABLE posteos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etiqueta TEXT NOT NULL,
    contenido TEXT NOT NULL,
    color TEXT,
    semilla TEXT,
    contenido_oculto TEXT,
    fecha TEXT
);
```

**Para configurar tu instancia**, podés usar el siguiente prompt con cualquier IA:

> "Quiero implementar una red social anónima y efímera llamada poste.ar. El frontend está hecho en HTML, CSS y JavaScript vanilla con cifrado AES-256 del lado del cliente. Necesito un backend en Node.js + Express con una base de datos SQL remota, hosting en la nube con CDN y proxy de seguridad, y un sistema de purga automática semanal. Las rutas necesarias son: GET /api/posts, POST /api/postear, GET /api/buscar, GET /api/contacto-semilla. El servidor genera una firma automática por posteo basada en el ID. Ayudame a configurar todo el stack desde cero."

**Sobre `administrador.txt`:**
Este archivo contiene las palabras semilla del canal de contacto con el administrador. En este repositorio dice `xxxx xxxx xxxx xxxx`. Al deployar tu propia instancia, reemplazalo con tus propias palabras secretas. Nunca compartas esas palabras públicamente.

---

## Sobre este proyecto

poste.ar fue desarrollado íntegramente con **Claude** (Anthropic), usando la versión gratuita, a lo largo de varios meses de trabajo colaborativo. Es un ejemplo concreto de lo que se puede construir con una IA como único par de programación.

---

## Licencia

MIT License — libre para usar, modificar y auditar.

---

*Versión 5.0 · Febrero 2026 · Ciudadela, Buenos Aires, Argentina*
