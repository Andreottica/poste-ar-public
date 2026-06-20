# poste.ar 24/7

**Red social minimalista · Sin registro · Sin datos personales · Todo se borra cada lunes**

🌐 [https://poste.ar](https://poste.ar) · Ciudadela, Buenos Aires, Argentina

---

## ¿Qué es poste.ar?

Una red sin usuarios obligatorios. Publicás, escribís mensajes privados cifrados y ofrecés o pedís cosas en trueque. Sin cookies, sin IPs guardadas, sin publicidad. Todo se borra los lunes a las 00:00 hs hora Argentina.

---

## Tres aplicaciones independientes

### pp · public — `poste.ar/public`
Timeline público anónimo. Sin usuario, sin registro. Escribís y leés.

### mm · micro mail — `poste.ar/micro`
Mensajes privados cifrados de extremo a extremo. Necesitás un nick y 12 palabras semilla — esa es tu única contraseña. Los mensajes se cifran en tu dispositivo antes de salir. El servidor no puede leerlos.

### tt · trueque — `poste.ar/trueque`
Avisos públicos de trueque. Solo lectura — para publicar, entrás a mm y escribís a `trueque@`.

---

## Privacidad y seguridad

- Sin cookies ni IPs guardadas
- Cifrado ECDH + AES-GCM 256 bits (lado del cliente)
- Las claves privadas nunca salen del dispositivo del usuario
- Si el servidor fuera hackeado, solo encontrarían texto cifrado ilegible
- Código auditable: F12 en el navegador

---

## Stack técnico

- **Frontend:** HTML, CSS, JavaScript vanilla — sin frameworks
- **Backend:** Node.js + Express
- **Base de datos:** Turso (libSQL / SQLite)
- **Cifrado:** ECDH P-256 + AES-GCM 256 (noble-curves)
- **CDN / Proxy:** Cloudflare
- **Hosting frontend:** poste.ar (dominio propio)

---

## Deployar tu propia instancia

### Requisitos

- Node.js 18+
- Base de datos compatible con libSQL (Turso o SQLite local)
- Dominio propio (recomendado Cloudflare como proxy)

### Variables de entorno

Creá un archivo `.env` en la raíz:

```
PORT=3000
TURSO_URL=libsql://tu-base.turso.io
TURSO_TOKEN=tu_token
```

### Instalación

```bash
git clone https://github.com/Andreottica/poste-ar-public
cd poste-ar-public
npm install
npm start
```

Las tablas se crean automáticamente al iniciar el servidor.

---

## Estructura del proyecto

```
public/
├── index.html          ← puerta de entrada
├── public/index.html   ← pp · timeline público
├── micro/index.html    ← mm · mensajes privados
├── trueque/index.html  ← tt · avisos de trueque
├── crypto.js           ← cifrado ECDH + AES-GCM
├── noble-p256.js       ← curvas elípticas P-256
└── palabras.js         ← diccionario para semillas
server.js               ← API REST + purga automática
```

---

## Filosofía

En un mundo donde todo se registra y vende, poste.ar es un espacio que se borra solo. No hay algoritmos, no hay perfiles, no hay permanencia. Lo que importa es lo que querés decir, no quién sos.

Todo se borra los lunes. Lo efímero es una decisión.

---

## Licencia

MIT — libre para usar, modificar y distribuir citando al autor original.

---

## Créditos

Desarrollado por **andreottica@** en poste.ar  
Código escrito íntegramente con Claude de Anthropic  
Contacto: **administrador@** en poste.ar  

*Versión 1.0 · Junio 2026 · Ciudadela, Buenos Aires, Argentina*
