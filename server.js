// ============================================
// default.server.js — PLANTILLA DE SERVIDOR
// poste.ar · Red social anónima y cifrada
// ============================================
// Este archivo es una plantilla para implementar
// tu propia instancia de poste.ar.
// Los espacios marcados con [CONFIGURAR] requieren
// que definas tus propios servicios y credenciales.
// ============================================

const express = require('express');
const path = require('path');

// [CONFIGURAR] Reemplazar con el cliente de tu base de datos SQL
// Ejemplo: better-sqlite3, pg, mysql2, etc.
// const db = require('tu-cliente-de-base-de-datos');
// Las credenciales deben ir en variables de entorno (.env)
// TURSO_URL, TURSO_TOKEN, DATABASE_URL, etc. según tu proveedor.

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// RATE LIMITING - Sin dependencias externas
// ============================================
const requestCounts = new Map();
const LIMITE_REQUESTS = 60;  // máximo requests por minuto por IP
const LIMITE_POSTS = 5;       // máximo posts por minuto por IP
const postCounts = new Map();

function limpiarContadores() {
    const ahora = Date.now();
    for (const [ip, data] of requestCounts.entries()) {
        if (ahora - data.inicio > 60000) requestCounts.delete(ip);
    }
    for (const [ip, data] of postCounts.entries()) {
        if (ahora - data.inicio > 60000) postCounts.delete(ip);
    }
}
setInterval(limpiarContadores, 60000);

function rateLimitGeneral(req, res, next) {
    // [CONFIGURAR] Reemplazar 'x-real-ip' con el header de IP
    // que use tu proxy o CDN
    const ip = req.headers['x-real-ip'] || req.ip;
    const ahora = Date.now();
    const data = requestCounts.get(ip) || { count: 0, inicio: ahora };
    if (ahora - data.inicio > 60000) { data.count = 0; data.inicio = ahora; }
    data.count++;
    requestCounts.set(ip, data);
    if (data.count > LIMITE_REQUESTS) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Esperá un momento.' });
    }
    next();
}

function rateLimitPost(req, res, next) {
    // [CONFIGURAR] Ídem header de IP
    const ip = req.headers['x-real-ip'] || req.ip;
    const ahora = Date.now();
    const data = postCounts.get(ip) || { count: 0, inicio: ahora };
    if (ahora - data.inicio > 60000) { data.count = 0; data.inicio = ahora; }
    data.count++;
    postCounts.set(ip, data);
    if (data.count > LIMITE_POSTS) {
        return res.status(429).json({ error: 'Demasiados posts. Esperá un momento.' });
    }
    next();
}

// ============================================
// MIDDLEWARE DE SEGURIDAD
// ============================================
app.set('trust proxy', true);

app.use((req, res, next) => {
    const host = req.get('host') || '';

    // Permitir localhost en desarrollo
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return next();
    }

    // [CONFIGURAR] Agregar aquí la validación de tu proxy o CDN
    // Ejemplo: verificar headers específicos que envíe tu proveedor
    // para asegurarte que el tráfico pasa por el proxy y no directo
    // if (!req.headers['x-tu-header-de-proxy']) {
    //     return res.status(403).send('Acceso denegado');
    // }

    next();
});

app.use(rateLimitGeneral);

// ============================================
// FIRMA AUTOMÁTICA DE POSTEOS
// ============================================
const SILABAS = ['ba','be','bi','bo','bu','ca','ce','ci','co','cu','da','de','di','do','du','fa','fe','fi','fo','fu','ga','ge','gi','go','gu','ja','je','ji','jo','ju','ka','ke','ki','ko','ku','la','le','li','lo','lu','ma','me','mi','mo','mu','na','ne','ni','no','nu','pa','pe','pi','po','pu','ra','re','ri','ro','ru','sa','se','si','so','su','ta','te','ti','to','tu','va','ve','vi','vo','vu','za','ze','zi','zo','zu'];

function generarFirma(id) {
    // Sílaba determinística por id, número = id mod 1000 (nunca pasa de 999)
    const silaba = SILABAS[id % SILABAS.length];
    const num = id % 1000;
    return `${silaba}.${num}@poste.ar`;
}

// ============================================
// FUNCIONES DE FECHA Y PURGA
// ============================================
function obtenerFechaArgentina() {
    const ahora = new Date();
    const offsetArgentina = -3 * 60;
    const offsetLocal = ahora.getTimezoneOffset();
    const diffMinutos = offsetArgentina - offsetLocal;
    const fechaArgentina = new Date(ahora.getTime() + diffMinutos * 60 * 1000);
    return fechaArgentina.toISOString().slice(0, 19).replace('T', ' ');
}

function esLunesCeroHoras() {
    const ahora = new Date();
    const offsetArgentina = -3 * 60;
    const offsetLocal = ahora.getTimezoneOffset();
    const diffMinutos = offsetArgentina - offsetLocal;
    const fechaArgentina = new Date(ahora.getTime() + diffMinutos * 60 * 1000);
    return fechaArgentina.getDay() === 1 && fechaArgentina.getHours() === 0 && fechaArgentina.getMinutes() < 5;
}

async function purgarBaseDeDatos() {
    try {
        // [CONFIGURAR] Reemplazar con la llamada a tu cliente de DB
        // await db.execute("DELETE FROM posteos");
        console.log('✓ Base de datos purgada - Lunes 00:00 Argentina');
    } catch(e) {
        console.error('Error al purgar base de datos:', e);
    }
}

setInterval(async () => {
    if(esLunesCeroHoras()) await purgarBaseDeDatos();
}, 5 * 60 * 1000);

// ============================================
// MIDDLEWARE GENERAL
// ============================================
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));

// ============================================
// RUTAS API
// ============================================
app.get('/api/posts', async (req, res) => {
    try {
        // [CONFIGURAR] Reemplazar con la consulta a tu DB
        // const rs = await db.execute("SELECT * FROM posteos ORDER BY id DESC LIMIT 50");
        // res.json(Array.from(rs.rows));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/buscar', async (req, res) => {
    try {
        const query = (req.query.q || '').slice(0, 100);
        if (!query.trim()) {
            // [CONFIGURAR] Reemplazar con la consulta a tu DB
            // const rs = await db.execute("SELECT * FROM posteos ORDER BY id DESC LIMIT 50");
            // return res.json(Array.from(rs.rows));
        }

        const terminos = query.split(',').map(t => t.trim()).filter(t => t).slice(0, 5);

        let sql = "SELECT * FROM posteos WHERE ";
        const conditions = [];
        const args = [];

        terminos.forEach(termino => {
            conditions.push("(LOWER(etiqueta) LIKE ? OR LOWER(contenido) LIKE ? OR LOWER(fecha) LIKE ?)");
            const searchTerm = `%${termino.toLowerCase()}%`;
            args.push(searchTerm, searchTerm, searchTerm);
        });

        sql += conditions.join(' AND ') + " ORDER BY id DESC";

        // [CONFIGURAR] Reemplazar con la consulta a tu DB
        // const rs = await db.execute({ sql, args });
        // res.json(Array.from(rs.rows));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/api/postear', rateLimitPost, async (req, res) => {
    let { contenido, contenido_oculto } = req.body;

    if (!contenido) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    if (contenido.length > 600) return res.status(400).json({ error: 'Contenido demasiado largo' });
    if (contenido_oculto && contenido_oculto.length > 2000) return res.status(400).json({ error: 'Contenido oculto demasiado largo' });

    try {
        const fechaArgentina = obtenerFechaArgentina();

        // [CONFIGURAR] Reemplazar con la inserción a tu DB
        // El servidor inserta primero con etiqueta placeholder,
        // obtiene el id autogenerado, genera la firma y actualiza.
        // const result = await db.execute({
        //     sql: "INSERT INTO posteos (etiqueta, contenido, color, semilla, contenido_oculto, fecha) VALUES (?, ?, ?, ?, ?, ?)",
        //     args: ['_', contenido, '#888888', null, contenido_oculto || null, fechaArgentina]
        // });
        // const nuevoId = Number(result.lastInsertRowid);
        // const firma = generarFirma(nuevoId);
        // await db.execute({
        //     sql: "UPDATE posteos SET etiqueta = ? WHERE id = ?",
        //     args: [firma, nuevoId]
        // });
        // res.status(201).json({ firma });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/contacto-semilla', async (req, res) => {
    try {
        const fs = require('fs');
        // Lee la semilla del archivo administrador.txt en la raíz del proyecto
        // Reemplazá el contenido de ese archivo con tus propias palabras secretas
        const semilla = fs.readFileSync(path.join(__dirname, 'administrador.txt'), 'utf8').trim();
        res.json({ semilla });
    } catch(e) {
        res.status(500).json({ error: 'No disponible' });
    }
});

app.get('/keep-alive', (req, res) => res.send('ok'));

// [CONFIGURAR] Puerto y mensajes de inicio
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});
