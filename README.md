# poste.ar · Código Frontend (Auditable)

**Red social anónima con cifrado AES-256 del lado del cliente**

🌐 [https://poste.ar](https://poste.ar)

---

## ¿Qué es este repositorio?

Este es el **código frontend público** de poste.ar — la parte que corre en tu navegador. Podés auditarlo para verificar que el cifrado funciona como decimos.

**Lo que encontrás acá:**
- `index.html` — estructura de la aplicación
- `postear.js` — toda la lógica JavaScript incluyendo cifrado
- `themes/` — estilos CSS (default, retro, mobile)
- `postear.txt` — manual de uso

**Lo que NO encontrás acá:**
- Código del servidor (backend)
- Configuraciones de base de datos
- Credenciales o tokens

---

## Cómo funciona el cifrado

El cifrado ocurre **en tu navegador** antes de enviar al servidor:

```javascript
// En postear.js línea ~380
const contenidoCifrado = CryptoJS.AES.encrypt(texto, semilla).toString();
```

El servidor nunca ve:
- Tus palabras de identidad
- Tus semillas de mensajes cifrados
- El contenido de mensajes cifrados (solo ve texto ilegible)

---

## Tecnología

- **Cifrado:** CryptoJS AES-256
- **Generación de identidad:** SHA-256 de las palabras semilla
- **Sin dependencias** frontend (excepto CryptoJS desde CDN)
- **Vanilla JavaScript** — sin frameworks

---

## Estructura de archivos

```
poste-ar-public/
├── index.html          # Estructura HTML
├── postear.js          # Lógica + cifrado
├── postear.txt         # Manual
└── themes/
    ├── default.css     # Tema por defecto
    ├── retro.css       # Tema retro
    └── mobile.css      # Estilos mobile
```

---

## ¿Querés correr tu propia instancia?

El código del servidor no está en este repositorio público por razones de seguridad operativa. Si querés implementar tu propia versión de poste.ar, necesitás:

- Un backend Node.js que exponga estas rutas API:
  - `GET /api/posts` — devuelve timeline
  - `POST /api/postear` — guarda posts
  - `GET /api/buscar?q=...` — búsqueda
- Una base de datos SQL con esta estructura:
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

---

## Licencia

MIT License — libre para usar, modificar y auditar.

---

## Contacto

🌐 [https://poste.ar](https://poste.ar)

*Versión 4.0 · Febrero 2026 · Ciudadela, Buenos Aires, Argentina*
