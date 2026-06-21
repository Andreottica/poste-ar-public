const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const db = createClient({
  url: process.env.DB_URL,
  authToken: process.env.DB_TOKEN
});

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
    const ip = req.headers['cf-connecting-ip'] || req.ip;
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
    const ip = req.headers['cf-connecting-ip'] || req.ip;
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
// MIDDLEWARE DE SEGURIDAD - SOLO CDN
// ============================================
app.set('trust proxy', true);

app.use((req, res, next) => {
    const cfIP = req.headers['cf-connecting-ip'];
    const cfRay = req.headers['cf-ray'];
    const host = req.get('host') || '';

    // Permitir localhost en desarrollo
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return next();
    }

    // Bloquear si NO viene del CDN
    if (!cfIP || !cfRay) {
        console.log(`🚫 Acceso bloqueado - Host: ${host}`);
        return res.status(403).send('Acceso denegado');
    }

    next();
});

app.use(rateLimitGeneral);

// ============================================
// FUNCIONES DE FECHA Y PURGA
// ============================================
function generarColor(firma) {
    const colores = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63','#00bcd4','#8bc34a','#ff5722','#607d8b'];
    let hash = 0;
    for (let i = 0; i < firma.length; i++) hash = firma.charCodeAt(i) + ((hash << 5) - hash);
    return colores[Math.abs(hash) % colores.length];
}

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
        await db.execute("DELETE FROM posteos");
        await db.execute("DELETE FROM micro_posts");
        console.log('✓ Posteos y micro purgados - Lunes 00:00 Argentina');
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
// USUARIOS — registro de nicks y claves públicas
// ============================================

async function inicializarTablaUsuarios() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nick TEXT UNIQUE NOT NULL,
                clave_publica TEXT NOT NULL,
                fecha TEXT NOT NULL
            )
        `);
        console.log('✓ Tabla usuarios lista');
    } catch(e) {
        console.error('Error al inicializar tabla usuarios:', e);
    }
}
inicializarTablaUsuarios();

// ============================================
// LISTA NEGRA DE NICKS
// ============================================
const NICKS_RESERVADOS = [
    'admin', 'administrador',
    'admin.postear', 'administrador.postear',
    'admin.poste', 'administrador.poste',
    'admin.oficial', 'administrador.oficial',
    'admin.sistema', 'administrador.sistema',
    'soporte', 'sistema', 'moderador',
    'root', 'staff', 'oficial',
    'trueque',
];

const NICKS_SUBSTRING = ['postear', 'poste.ar', 'trueque'];

function nickPermitido(nick) {
    if (NICKS_RESERVADOS.includes(nick)) return false;
    if (NICKS_SUBSTRING.some(s => nick.includes(s))) return false;
    return true;
}

app.post('/api/registrar', rateLimitPost, async (req, res) => {
    const { nick, clave_publica } = req.body;
    if (!nick || !clave_publica) return res.status(400).json({ error: 'Faltan datos' });
    if (!/^[a-z0-9.]{2,30}$/.test(nick)) return res.status(400).json({ error: 'Nick inválido' });
    if (!nickPermitido(nick)) return res.status(400).json({ error: 'Ese nick está reservado' });
    try {
        const fecha = obtenerFechaArgentina();
        await db.execute({
            sql: "INSERT INTO usuarios (nick, clave_publica, fecha) VALUES (?, ?, ?)",
            args: [nick, clave_publica, fecha]
        });
        res.status(201).json({ ok: true });
    } catch(e) {
        if (e.message && e.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'El nick ya está en uso' });
        }
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/nick/:nick(*)', async (req, res) => {
    const nick = req.params.nick;
    try {
        if (!nickPermitido(nick)) return res.json({ disponible: false });
        const rs = await db.execute({
            sql: "SELECT nick FROM usuarios WHERE nick = ?",
            args: [nick]
        });
        res.json({ disponible: rs.rows.length === 0 });
    } catch(e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/usuario/:nick(*)', async (req, res) => {
    const nick = req.params.nick;
    try {
        const rs = await db.execute({
            sql: "SELECT nick, clave_publica FROM usuarios WHERE nick = ?",
            args: [nick]
        });
        if (rs.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({
            nick: rs.rows[0].nick,
            clave_publica: rs.rows[0].clave_publica
        });
    } catch(e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// ============================================
// MICRO — timeline anónimo simple (pp)
// ============================================

async function inicializarTablaMicro() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS micro_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contenido TEXT NOT NULL,
                fecha TEXT NOT NULL
            )
        `);
        console.log('✓ Tabla micro_posts lista');
    } catch(e) {
        console.error('Error al inicializar tabla micro_posts:', e);
    }
}
inicializarTablaMicro();

app.get('/micro/api/posts', async (req, res) => {
    try {
        const rs = await db.execute(
            "SELECT * FROM micro_posts ORDER BY id DESC LIMIT 100"
        );
        res.json(Array.from(rs.rows));
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/micro/api/post', rateLimitPost, async (req, res) => {
    const { contenido } = req.body;
    if (!contenido || typeof contenido !== 'string') return res.status(400).json({ error: 'Faltan datos' });
    const texto = contenido.trim();
    if (texto.length === 0 || texto.length > 500) return res.status(400).json({ error: 'Contenido inválido' });
    try {
        const fecha = obtenerFechaArgentina();
        const rs = await db.execute({
            sql: "INSERT INTO micro_posts (contenido, fecha) VALUES (?, ?)",
            args: [texto, fecha]
        });
        res.status(201).json({ id: Number(rs.lastInsertRowid), contenido: texto, fecha });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ============================================
// MICRO MAIL — mensajes cifrados entre usuarios (mm)
// ============================================

async function inicializarTablaPosteos() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS posteos (
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
            )
        `);
        // Columnas que pueden no existir en instancias antiguas
        try { await db.execute("ALTER TABLE posteos ADD COLUMN contenido_oculto TEXT"); } catch(e) {}
        try { await db.execute("ALTER TABLE posteos ADD COLUMN contenido_cifrado TEXT"); } catch(e) {}
        try { await db.execute("ALTER TABLE posteos ADD COLUMN contenido_cifrado_propio TEXT"); } catch(e) {}
        try { await db.execute("ALTER TABLE posteos ADD COLUMN contenido_trueque TEXT"); } catch(e) {}
        try { await db.execute("ALTER TABLE posteos ADD COLUMN tipo TEXT"); } catch(e) {}
        console.log('✓ Tabla posteos lista');
    } catch(e) {
        console.error('Error al inicializar tabla posteos:', e);
    }
}
inicializarTablaPosteos();

// Inbox — mensajes donde soy remitente o destinatario
app.get('/micro/api/mm/inbox/:nick', async (req, res) => {
    const nick = req.params.nick;
    if (!nick || !/^[a-z0-9.]{2,30}$/.test(nick)) return res.status(400).json({ error: 'Nick inválido' });
    try {
        const rs = await db.execute({
            sql: `SELECT * FROM posteos 
                  WHERE tipo = 'mensaje'
                  AND (etiqueta LIKE ? OR contenido_oculto = ?)
                  UNION ALL
                  SELECT * FROM posteos
                  WHERE tipo = 'trueque'
                  AND etiqueta LIKE ?
                  ORDER BY id DESC LIMIT 100`,
            args: [`${nick}@ %`, nick, `${nick}@ %`]
        });
        res.json(Array.from(rs.rows));
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Enviar mensaje — intercepta trueque@ para publicar aviso público
app.post('/micro/api/mm/enviar', rateLimitPost, async (req, res) => {
    const { remitente, destinatario, contenido_cifrado, contenido_cifrado_propio, contenido_plano } = req.body;
    if (!remitente || !destinatario || !contenido_cifrado) return res.status(400).json({ error: 'Faltan datos' });
    if (!/^[a-z0-9.]{2,30}$/.test(remitente)) return res.status(400).json({ error: 'Nick inválido' });

    // Intercepción: mensaje a trueque@ → aviso público en texto plano
    if (destinatario === 'trueque') {
        if (!contenido_plano || typeof contenido_plano !== 'string') return res.status(400).json({ error: 'Faltan datos' });
        const texto = contenido_plano.trim();
        if (!texto || texto.length > 500) return res.status(400).json({ error: 'Contenido inválido' });
        try {
            const fecha = obtenerFechaArgentina();
            const etiqueta = `${remitente}@ trueque`;
            const rs = await db.execute({
                sql: `INSERT INTO posteos (etiqueta, contenido, color, semilla, contenido_oculto, contenido_trueque, contenido_cifrado_propio, fecha, tipo)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trueque')`,
                args: [etiqueta, '[trueque]', '#888888', '', 'trueque', texto, texto, fecha]
            });
            return res.status(201).json({ ok: true, id: Number(rs.lastInsertRowid) });
        } catch(e) {
            console.error(e);
            return res.status(500).json({ error: 'Error interno' });
        }
    }

    // Mensaje normal cifrado
    if (!/^[a-z0-9.]{2,30}$/.test(destinatario)) return res.status(400).json({ error: 'Nick inválido' });
    try {
        const rsD = await db.execute({ sql: "SELECT nick FROM usuarios WHERE nick = ?", args: [destinatario] });
        if (rsD.rows.length === 0) return res.status(404).json({ error: `El usuario "${destinatario}" no existe` });
        const fecha = obtenerFechaArgentina();
        const etiqueta = `${remitente}@ ${destinatario}`;
        const rs = await db.execute({
            sql: `INSERT INTO posteos (etiqueta, contenido, color, semilla, contenido_oculto, contenido_cifrado, contenido_cifrado_propio, fecha, tipo)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mensaje')`,
            args: [etiqueta, '[inbox]', '#888888', '', destinatario, contenido_cifrado, contenido_cifrado_propio || null, fecha]
        });
        res.status(201).json({ ok: true, id: Number(rs.lastInsertRowid) });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Borrar mensaje
app.delete('/micro/api/mm/mensaje/:id', async (req, res) => {
    const { nick, tipo } = req.body;
    const id = parseInt(req.params.id);
    if (!nick || !id || !tipo) return res.status(400).json({ error: 'Faltan datos' });
    try {
        const rs = await db.execute({ sql: "SELECT * FROM posteos WHERE id = ?", args: [id] });
        if (rs.rows.length === 0) return res.status(404).json({ error: 'Mensaje no encontrado' });
        const m = rs.rows[0];
        if (tipo === 'propio' && m.etiqueta && m.etiqueta.startsWith(nick + '@')) {
            await db.execute({ sql: "UPDATE posteos SET contenido_cifrado_propio = NULL WHERE id = ?", args: [id] });
        } else if (tipo === 'recibido' && m.contenido_oculto === nick) {
            await db.execute({ sql: "DELETE FROM posteos WHERE id = ?", args: [id] });
        } else {
            return res.status(403).json({ error: 'Sin permiso' });
        }
        res.json({ ok: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ============================================
// TRUEQUE — avisos públicos (tt)
// ============================================

app.get('/trueque/api/avisos', async (req, res) => {
    try {
        const rs = await db.execute({
            sql: `SELECT id, etiqueta, contenido_trueque, fecha FROM posteos 
                  WHERE tipo = 'trueque' AND contenido_trueque IS NOT NULL
                  ORDER BY id DESC LIMIT 100`,
            args: []
        });
        res.json(Array.from(rs.rows));
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ============================================
// UTILIDADES
// ============================================

app.get('/source', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'source.txt'));
});

app.get('/keep-alive', (req, res) => res.send('ok'));

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log('🔒 Protección CDN activada');
    console.log('⏰ Purga automática configurada para lunes 00:00 Argentina');
});
