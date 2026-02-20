let buscando = false;
    let timeoutBusqueda = null;
    let todosLosPosts = [];
    let temas = ['default', 'retro'];
    let temaActual = localStorage.getItem('tema') || 'default';
    let modoOscuro = localStorage.getItem('modo') === 'noche';
    let modoApp = 'publico';
    let semillaGlobalActiva = '';
    async function cargarListaTemas() {
        try {
            const response = await fetch('/api/temas');
            if (response.ok) {
                const temasDisponibles = await response.json();
                const temasFiltrados = temasDisponibles.filter(t => t !== 'mobile');
                if (temasFiltrados.length > 0) {
                    temas = temasFiltrados;
                }
            }
        } catch(e) {
            console.log('Usando lista de temas por defecto');
        }
        if (!temas.includes(temaActual)) {
            temaActual = 'default';
            localStorage.setItem('tema', temaActual);
        }
    }
    function cargarTema() {
        const link = document.getElementById('theme-stylesheet');
        link.href = `themes/${temaActual}.css`;
        const btnTema = document.getElementById('btn-tema');
        if(btnTema) {
            btnTema.innerText = `[ ${temaActual} ]`;
        }
        if(modoOscuro) {
            document.body.classList.add('modo-noche');
            ['btn-modo-2', 'btn-modo-3'].forEach(id => {
                const btn = document.getElementById(id);
                if(btn) btn.innerText = '[ noche ]';
            });
        } else {
            document.body.classList.remove('modo-noche');
            ['btn-modo-2', 'btn-modo-3'].forEach(id => {
                const btn = document.getElementById(id);
                if(btn) btn.innerText = '[ día ]';
            });
        }
    }
    function cambiarTema() {
        const indiceActual = temas.indexOf(temaActual);
        const siguienteIndice = (indiceActual + 1) % temas.length;
        temaActual = temas[siguienteIndice];
        localStorage.setItem('tema', temaActual);
        cargarTema();
    }
    function toggleDiaNoche() {
        modoOscuro = !modoOscuro;
        localStorage.setItem('modo', modoOscuro ? 'noche' : 'dia');
        cargarTema();
    }
    function cerrarTodo() {
        // Cierra contacto
        document.getElementById('contacto-box').style.display = 'none';
        document.querySelector('.btn-contacto').innerText = '[ contacto ]';
        // Cierra manual
        document.getElementById('manual-box').style.display = 'none';
        // Limpia timeline
        document.getElementById('timeline').innerHTML = '';
    }
    function cerrarContacto() {
        cerrarTodo();
    }
    function toggleModoApp() {
        cerrarTodo();
        if(modoApp === 'publico') {
            modoApp = 'encriptado';
            const btn = document.getElementById('btn-modo-app');
            btn.innerText = '[ ← público ]';
            btn.style.background = '#28a745';
            document.getElementById('editor-publico-section').classList.add('hidden');
            document.getElementById('editor-encriptado-section').classList.remove('hidden');
            document.getElementById('search-input').classList.add('hidden');
            document.getElementById('search-info').classList.add('hidden');
            document.getElementById('btn-volver').classList.add('hidden');
            document.getElementById('timeline').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-terciario);">Ingresá una semilla para ver mensajes cifrados.</div>';
            semillaGlobalActiva = '';
            document.body.classList.add('en-timeline');
        } else {
            modoApp = 'publico';
            const btn = document.getElementById('btn-modo-app');
            btn.innerText = '[ encriptado → ]';
            btn.style.background = '#dc3545';
            document.getElementById('editor-publico-section').classList.remove('hidden');
            document.getElementById('editor-encriptado-section').classList.add('hidden');
            document.getElementById('search-input').classList.remove('hidden');
            document.getElementById('semilla-leer-input').value = '';
            document.getElementById('checkbox-mantener-semilla').checked = false;
            semillaGlobalActiva = '';
            document.body.classList.remove('en-timeline');
            cargarTimeline();
        }
    }
    function formatearFecha(timestamp) {
        const fecha = new Date(timestamp);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const mes = meses[fecha.getMonth()];
        const hora = String(fecha.getHours()).padStart(2, '0');
        const min = String(fecha.getMinutes()).padStart(2, '0');
        return `${dia}-${mes} ${hora}:${min}hs`;
    }

    function toggleContacto() {
        const box = document.getElementById('contacto-box');
        const abierto = box.style.display === 'block';
        cerrarTodo();
        if(!abierto) {
            document.getElementById('editor-publico-section').classList.add('hidden');
            document.getElementById('editor-encriptado-section').classList.add('hidden');
            document.getElementById('search-input').classList.add('hidden');
            document.getElementById('search-info').classList.add('hidden');
            document.getElementById('btn-volver').classList.add('hidden');
            document.getElementById('timeline').innerHTML = '';
            box.style.display = 'block';
            document.querySelector('.btn-contacto').innerText = '[ volver ]';
        } else {
            box.style.display = 'none';
            document.querySelector('.btn-contacto').innerText = '[ contacto ]';
            if(modoApp === 'publico') {
                document.getElementById('editor-publico-section').classList.remove('hidden');
                document.getElementById('search-input').classList.remove('hidden');
                cargarTimeline();
            } else {
                document.getElementById('editor-encriptado-section').classList.remove('hidden');
            }
        }
    }
    async function enviarContacto() {
        const texto = document.getElementById('editor-contacto').value.trim();
        if(!texto) {
            alert('Escribí un mensaje antes de enviar');
            return;
        }
        try {
            const resSemilla = await fetch('/api/contacto-semilla');
            const { semilla } = await resSemilla.json();
            const contenidoCifrado = CryptoJS.AES.encrypt(`[contacto] ${texto}`, semilla).toString();
            const payload = {
                contenido: '.',
                contenido_oculto: contenidoCifrado
            };
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                document.getElementById('editor-contacto').value = '';
                document.getElementById('contacto-box').style.display = 'none';
                alert('Mensaje enviado al administrador.');
            } else {
                alert('Error al enviar');
            }
        } catch(e) {
            console.error('Error:', e);
            alert('Error de conexión');
        }
    }
    function toggleManual() {
        const box = document.getElementById('manual-box');
        const abierto = box.style.display === 'block';
        cerrarTodo();
        if(abierto) {
            // estaba abierto, cerrarTodo ya lo cerró, restaurar editor
            if(modoApp === 'publico') {
                document.getElementById('editor-publico-section').classList.remove('hidden');
                document.getElementById('search-input').classList.remove('hidden');
                cargarTimeline();
            } else {
                document.getElementById('editor-encriptado-section').classList.remove('hidden');
            }
            return;
        }
        // abrir manual
        document.getElementById('editor-publico-section').classList.add('hidden');
        document.getElementById('editor-encriptado-section').classList.add('hidden');
        document.getElementById('search-input').classList.add('hidden');
        document.getElementById('search-info').classList.add('hidden');
        document.getElementById('btn-volver').classList.add('hidden');
        fetch('postear.txt').then(r => r.text()).then(t => {
            box.innerText = t;
            box.style.display = 'block';
        });
    }
    function actualizarContadorReset() {
        const ahora = new Date();
        const diaSemana = ahora.getDay();
        // lunes=1: si ya pasó la medianoche, próximo lunes es en 7 días
        let diasHastaLunes;
        if (diaSemana === 1) {
            diasHastaLunes = 7;
        } else if (diaSemana === 0) {
            diasHastaLunes = 1;
        } else {
            diasHastaLunes = 8 - diaSemana;
        }
        const proximoLunes = new Date(ahora);
        proximoLunes.setDate(ahora.getDate() + diasHastaLunes);
        proximoLunes.setHours(0, 0, 0, 0);
        const diff = proximoLunes - ahora;
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        let texto = "El timeline se borra todos los lunes: ";
        if(dias > 0) texto += `${dias}d `;
        texto += `${horas}h ${minutos}m`;
        const contador = document.getElementById('contador-reset');
        if(contador) {
            contador.classList.remove('hidden');
            contador.innerText = texto;
        }
    }
    async function cargarTimeline() {
        if(modoApp === 'encriptado') return;
        try {
            const res = await fetch('/api/posts');
            const posts = await res.json();
            console.log('Posts recibidos:', posts.length);
            console.log('Primeros 3 posts:', posts.slice(0, 3));
            todosLosPosts = posts;
            mostrarPosts(posts);
        } catch(e) {
            console.error('Error al cargar timeline:', e);
        }
    }
    function escaparHTML(texto) {
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function procesarTexto(texto) {
        // Primero escapar todo el HTML para prevenir XSS
        let html = escaparHTML(texto);
        // Luego aplicar nuestro markdown propio (sobre texto ya seguro)
        html = html.replace(/&lt;([^&]+?):(https?:\/\/[^&]+?)&gt;/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/&lt;([^&]+?):(?!\/\/)([^&\s]+)&gt;/g, '<a href="http://$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
        html = html.replace(/_(.*?)_/g, '<i>$1</i>');
        html = html.replace(/#(\w+)/g, '<span style="color: #d32f2f; font-weight: bold;">#$1</span>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }
    function mostrarPosts(posts) {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        let postsPublicos = 0;
        posts.forEach(post => {
            console.log('Post contenido:', post.contenido, 'Largo:', post.contenido.length);
            if(post.contenido === '.' || post.contenido === '') {
                console.log('Post saltado (cifrado puro)');
                return;
            }
            postsPublicos++;
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            const idAv = `av-${post.id}`;
            const htmlContent = procesarTexto(post.contenido);
            const fechaStr = formatearFecha(post.fecha);
            const etiquetaSegura = escaparHTML(post.etiqueta);
            const colorSeguro = escaparHTML(post.color);
            postDiv.innerHTML = `
                <div class="avatar" id="${idAv}"></div>
                <div class="post-body">
                    <div class="marca-tag" style="color: ${colorSeguro}">${etiquetaSegura}</div>
                    <div class="fecha-tag">${fechaStr}</div>
                    <div style="white-space: pre-wrap; font-size: 15px;">${htmlContent}</div>
                </div>
            `;
            timeline.appendChild(postDiv);
            generateAvatarFromMarca(idAv, post.etiqueta, post.color);
        });
        console.log('Posts públicos mostrados:', postsPublicos);
    }
    async function leerMensajesCifrados() {
        const semilla = document.getElementById('semilla-leer-input').value.trim();
        if(!semilla) {
            alert('Ingresá una semilla para descifrar mensajes');
            return;
        }
        semillaGlobalActiva = semilla;
        try {
            const res = await fetch('/api/posts');
            const posts = await res.json();
            console.log('Posts para descifrar:', posts.length);
            const mensajesDescifrados = [];
            posts.forEach(post => {
                if(!post.contenido_oculto) return;
                try {
                    const bytes = CryptoJS.AES.decrypt(post.contenido_oculto, semilla);
                    const textoDescifrado = bytes.toString(CryptoJS.enc.Utf8);
                    console.log('Texto descifrado:', textoDescifrado, 'Largo:', textoDescifrado.length);
                    if(textoDescifrado && textoDescifrado.length > 0) {
                        // Extraer nick si existe: formato [nick] mensaje
                        let nickBase = null;
                        let textoMostrar = textoDescifrado;
                        const matchNick = textoDescifrado.match(/^\[([^\]]+)\]\s*/);
                        if(matchNick) {
                            nickBase = matchNick[1];
                            textoMostrar = textoDescifrado.slice(matchNick[0].length);
                        }
                        mensajesDescifrados.push({
                            id: post.id,
                            etiqueta: post.etiqueta, // se sobreescribe después si hay nick
                            nickBase: nickBase,
                            color: post.color,
                            texto: textoMostrar,
                            fecha: post.fecha
                        });
                    }
                } catch(e) {
                    console.log('Error descifrando:', e);
                }
            });
            console.log('Mensajes descifrados exitosamente:', mensajesDescifrados.length);
            if(mensajesDescifrados.length === 0) {
                document.getElementById('timeline').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-terciario);">No se encontraron mensajes con esta semilla.</div>';
                return;
            }
            // Ordenar ascendente para contar nicks correctamente
            mensajesDescifrados.sort((a, b) => a.id - b.id);
            const contadorNick = {};
            mensajesDescifrados.forEach(msg => {
                const baseNick = msg.nickBase || null;
                if(baseNick) {
                    contadorNick[baseNick] = (contadorNick[baseNick] || 0) + 1;
                    msg.etiqueta = `${baseNick}.${String(contadorNick[baseNick]).padStart(2,'0')}@poste.ar`;
                }
            });
            // Invertir para mostrar más nuevo arriba
            mensajesDescifrados.reverse();
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';
            mensajesDescifrados.forEach(msg => {
                const postDiv = document.createElement('div');
                postDiv.className = 'post';
                const idAv = `av-${msg.id}`;
                const fechaStr = formatearFecha(msg.fecha);
                const etiquetaSegura = escaparHTML(msg.etiqueta);
                const colorSeguro = escaparHTML(msg.color);
                postDiv.innerHTML = `
                    <div class="avatar" id="${idAv}"></div>
                    <div class="post-body">
                        <div class="marca-tag" style="color: ${colorSeguro}">${etiquetaSegura}</div>
                        <div class="fecha-tag">${fechaStr}</div>
                        <div style="white-space: pre-wrap; font-size: 15px;">${procesarTexto(msg.texto)}</div>
                    </div>
                `;
                timeline.appendChild(postDiv);
                generateAvatarFromMarca(idAv, msg.etiqueta, msg.color);
            });
        } catch(e) {
            console.error('Error al descifrar timeline:', e);
        }
    }
    function validarYPostear() {
        const editor = document.getElementById('editor');
        const texto = editor.value.trim();
        if(!texto) {
            alert('Escribí algo antes de postear');
            return;
        }
        postear(texto, null, null);
    }
    async function postearEncriptado() {
        const editor = document.getElementById('editor-encriptado');
        const password = document.getElementById('password-encriptado-input').value.trim();
        const mantenerSemilla = document.getElementById('checkbox-mantener-semilla').checked;
        const texto = editor.value.trim();
        if(!texto) {
            alert('Escribí algo antes de postear');
            return;
        }
        if(!password) {
            alert('La semilla es obligatoria para mensajes cifrados');
            return;
        }
        const palabras = password.split(/\s+/);
        if(palabras.length < 1 || palabras.length > 12) {
            alert('Usá entre 1 y 12 palabras para la semilla');
            return;
        }
        const nick = document.getElementById('nick-encriptado-input').value.trim();
        const textoFinal = nick ? `[${nick}] ${texto}` : texto;
        const contenidoCifrado = CryptoJS.AES.encrypt(textoFinal, password).toString();
        console.log('Contenido cifrado:', contenidoCifrado);
        const payload = {
            contenido: '.',
            contenido_oculto: contenidoCifrado
        };
        try {
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                editor.value = '';
                if(!mantenerSemilla) {
                    document.getElementById('password-encriptado-input').value = '';
                }
                document.getElementById('char-count-encriptado').innerText = "288 caracteres restantes";
                alert('Mensaje cifrado publicado. Ingresá la semilla nuevamente para verlo.');
            } else {
                alert('Error al postear');
            }
        } catch(e) {
            console.error('Error:', e);
            alert('Error de conexión');
        }
    }
    async function postear(textoPublico, textoOculto, password) {
        let contenidoCifrado = null;
        if(textoOculto && password) {
            contenidoCifrado = CryptoJS.AES.encrypt(textoOculto, password).toString();
        }
        const payload = {
            contenido: textoPublico,
            contenido_oculto: contenidoCifrado
        };
        try {
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                document.getElementById('editor').value = '';
                document.getElementById('char-count').innerText = "576 caracteres restantes";
                if(modoApp === 'publico') {
                    await cargarTimeline();
                }
            } else {
                alert('Error al postear');
            }
        } catch(e) {
            console.error('Error:', e);
            alert('Error de conexión');
        }
    }
    function buscarConDelay() {
        if(modoApp === 'encriptado') return;
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(buscar, 500);
    }
    async function buscar() {
        const query = document.getElementById('search-input').value.trim();
        const btnVolver = document.getElementById('btn-volver');
        const searchInfo = document.getElementById('search-info');
        if(!query) {
            await cargarTimeline();
            btnVolver.classList.add('hidden');
            searchInfo.innerText = '';
            buscando = false;
            return;
        }
        buscando = true;
        btnVolver.classList.remove('hidden');
        try {
            const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`);
            const resultados = await res.json();
            todosLosPosts = resultados;
            mostrarPosts(resultados);
            if(resultados.length === 0) {
                searchInfo.innerText = 'No se encontraron resultados';
            } else {
                searchInfo.innerText = `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`;
            }
        } catch(e) {
            console.error('Error en búsqueda:', e);
            searchInfo.innerText = 'Error al buscar';
        }
    }
    function volverATodos() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-info').innerText = '';
        document.getElementById('btn-volver').classList.add('hidden');
        cargarTimeline();
        buscando = false;
    }
    async function actualizarPosts() {
        if(modoApp === 'publico') {
            await cargarTimeline();
        } else {
            if(semillaGlobalActiva) {
                await leerMensajesCifrados();
            }
        }
    }
    function generateAvatarFromMarca(containerId, marca, colorPrincipal) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        const coloresFondo = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', 
            '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
            '#2980b9', '#8e44ad'
        ];
        let hash = 0;
        for(let i = 0; i < marca.length; i++) {
            hash = marca.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorFondo = coloresFondo[Math.abs(hash) % coloresFondo.length];
        const partes = marca.split('.');
        const letras = (partes[0].substring(0, 2) || 'XX').toUpperCase();
        container.style.backgroundColor = colorFondo;
        container.innerText = letras;
    }

    document.addEventListener('DOMContentLoaded', function() {
        const editor = document.getElementById('editor');
        const charCount = document.getElementById('char-count');
        if(editor && charCount) {
            editor.addEventListener('input', function() {
                const restantes = 576 - this.value.length;
                charCount.innerText = `${restantes} caracteres restantes`;
            });
        }
        const editorEncriptado = document.getElementById('editor-encriptado');
        const charCountEncriptado = document.getElementById('char-count-encriptado');
        if(editorEncriptado && charCountEncriptado) {
            editorEncriptado.addEventListener('input', function() {
                const restantes = 288 - this.value.length;
                charCountEncriptado.innerText = `${restantes} caracteres restantes`;
            });
        }
    });
    window.onload = async () => {
        await cargarListaTemas();
        cargarTema();
        actualizarContadorReset();
        setInterval(actualizarContadorReset, 60000);
        cargarTimeline();
    };

    // ============================================
    // MOBILE APP — navegación por pantallas
    // ============================================
    const esMobile = () => window.innerWidth <= 768;

    let mPantallaActual = 'menu';

    function mIrA(pantalla, callback) {
        // ocultar todas
        document.querySelectorAll('.m-pantalla').forEach(p => p.classList.add('m-oculta'));
        // mostrar la pedida
        const el = document.getElementById('m-pantalla-' + pantalla);
        if (el) el.classList.remove('m-oculta');
        mPantallaActual = pantalla;
        // callback opcional al entrar
        if (callback) callback();
        // acciones especiales por pantalla
        if (pantalla === 'timeline-publico') mActualizarPublico();
        if (pantalla === 'manual') mCargarManual();
    }

    function mVolver() {
        mIrA('menu');
    }

    // Actualizar timeline público mobile
    async function mActualizarPublico() {
        const timeline = document.getElementById('m-timeline-publico');
        timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">cargando...</div>';
        try {
            const res = await fetch('/api/posts');
            const posts = await res.json();
            timeline.innerHTML = '';
            if (!posts.length) {
                timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">sin posteos aún.</div>';
                return;
            }
            posts.forEach(p => {
                // saltar posts cifrados (contenido solo '.')
                if ((p.contenido || '').trim() === '.') return;
                const div = document.createElement('div');
                div.className = 'post';
                div.innerHTML = `
                    <div class="avatar" id="av-m-${p.id}"></div>
                    <div class="post-body">
                        <div class="marca-tag">${escaparHTML(p.etiqueta || '')}</div>
                        <div class="fecha-tag">${formatearFecha(p.fecha)}</div>
                        <div style="white-space:pre-wrap;">${procesarTexto(p.contenido || '')}</div>
                    </div>`;
                timeline.appendChild(div);
                if (p.etiqueta && p.color) generateAvatarFromMarca(`av-m-${p.id}`, p.etiqueta, p.color);
            });
        } catch(e) {
            timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">error al cargar.</div>';
        }
    }

    // Buscar en timeline público mobile
    let mBuscarTimer;
    function mBuscarConDelay() {
        clearTimeout(mBuscarTimer);
        mBuscarTimer = setTimeout(mBuscar, 400);
    }

    async function mBuscar() {
        const q = document.getElementById('m-search-input').value.trim();
        const timeline = document.getElementById('m-timeline-publico');
        const url = q ? `/api/buscar?q=${encodeURIComponent(q)}` : '/api/posts';
        try {
            const res = await fetch(url);
            const posts = await res.json();
            timeline.innerHTML = '';
            posts.forEach(p => {
                const div = document.createElement('div');
                div.className = 'post';
                div.innerHTML = `
                    <div class="avatar" id="av-ms-${p.id}"></div>
                    <div class="post-body">
                        <div class="marca-tag">${escaparHTML(p.etiqueta || '')}</div>
                        <div class="fecha-tag">${formatearFecha(p.fecha)}</div>
                        <div style="white-space:pre-wrap;">${procesarTexto(p.contenido || '')}</div>
                    </div>`;
                timeline.appendChild(div);
                if (p.etiqueta && p.color) generateAvatarFromMarca(`av-ms-${p.id}`, p.etiqueta, p.color);
            });
        } catch(e) {}
    }

    // Leer cifrados mobile
    async function mLeerCifrados() {
        const semilla = document.getElementById('m-semilla-leer-input').value.trim();
        if (!semilla) { alert('Ingresá la semilla'); return; }
        const timeline = document.getElementById('m-timeline-cifrado');
        timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">descifrando...</div>';
        try {
            const res = await fetch('/api/posts');
            const posts = await res.json();
            const descifrados = [];
            posts.forEach(p => {
                if (!p.contenido_oculto) return;
                try {
                    const bytes = CryptoJS.AES.decrypt(p.contenido_oculto, semilla);
                    const texto = bytes.toString(CryptoJS.enc.Utf8);
                    if (texto && texto.length > 0) {
                        let textoMostrar = texto;
                        let nick = null;
                        const matchNick = texto.match(/^\[([^\]]+)\]\s*/);
                        if (matchNick) { nick = matchNick[1]; textoMostrar = texto.slice(matchNick[0].length); }
                        descifrados.push({ id: p.id, etiqueta: nick || p.etiqueta, color: p.color, fecha: p.fecha, texto: textoMostrar });
                    }
                } catch(e) {}
            });
            if (!descifrados.length) {
                timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">sin mensajes con esta semilla.</div>';
                return;
            }
            descifrados.sort((a,b) => a.id - b.id).reverse();
            timeline.innerHTML = '';
            descifrados.forEach(m => {
                const div = document.createElement('div');
                div.className = 'post';
                div.innerHTML = `
                    <div class="avatar" id="av-mc-${m.id}"></div>
                    <div class="post-body">
                        <div class="marca-tag">${escaparHTML(m.etiqueta || '')}</div>
                        <div class="fecha-tag">${formatearFecha(m.fecha)}</div>
                        <div style="white-space:pre-wrap;">${procesarTexto(m.texto)}</div>
                    </div>`;
                timeline.appendChild(div);
                if (m.etiqueta && m.color) generateAvatarFromMarca(`av-mc-${m.id}`, m.etiqueta, m.color);
            });
        } catch(e) {
            timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">error al descifrar.</div>';
        }
    }

    // Postear público mobile
    async function mPostearPublico() {
        const texto = document.getElementById('m-editor').value.trim();
        if (!texto) { alert('Escribí algo antes de postear'); return; }
        try {
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contenido: texto })
            });
            if (res.ok) {
                document.getElementById('m-editor').value = '';
                document.getElementById('m-count-publico').textContent = '576';
                mIrA('timeline-publico');
            } else {
                const data = await res.json();
                alert(data.error || 'Error al postear');
            }
        } catch(e) { alert('Error de conexión'); }
    }

    // Postear cifrado mobile
    async function mPostearCifrado() {
        const texto = document.getElementById('m-editor-cifrado').value.trim();
        const semilla = document.getElementById('m-semilla-escribir').value.trim();
        const nick = document.getElementById('m-nick').value.trim();
        if (!texto) { alert('Escribí un mensaje'); return; }
        if (!semilla) { alert('Ingresá la semilla'); return; }
        const textoFinal = nick ? `[${nick}] ${texto}` : texto;
        const cifrado = CryptoJS.AES.encrypt(textoFinal, semilla).toString();
        try {
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contenido: '.', contenido_oculto: cifrado })
            });
            if (res.ok) {
                document.getElementById('m-editor-cifrado').value = '';
                document.getElementById('m-count-cifrado').textContent = '288';
                // ir al timeline cifrado con la semilla precargada
                document.getElementById('m-semilla-leer-input').value = semilla;
                mIrA('timeline-cifrado');
                mLeerCifrados();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al postear');
            }
        } catch(e) { alert('Error de conexión'); }
    }

    // Enviar contacto mobile
    async function mEnviarContacto() {
        const texto = document.getElementById('m-editor-contacto').value.trim();
        if (!texto) { alert('Escribí un mensaje'); return; }
        try {
            const resSemilla = await fetch('/api/contacto-semilla');
            const { semilla } = await resSemilla.json();
            const cifrado = CryptoJS.AES.encrypt(`[contacto] ${texto}`, semilla).toString();
            const res = await fetch('/api/postear', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contenido: '.', contenido_oculto: cifrado })
            });
            if (res.ok) {
                document.getElementById('m-editor-contacto').value = '';
                document.getElementById('m-count-contacto').textContent = '576';
                alert('Mensaje enviado al administrador.');
                mIrA('timeline-cifrado');
            } else {
                alert('Error al enviar');
            }
        } catch(e) { alert('Error de conexión'); }
    }

    // Contador de caracteres mobile
    function mContarChars(textarea, spanId, max) {
        const restantes = max - textarea.value.length;
        document.getElementById(spanId).textContent = restantes;
    }

    // Cargar manual mobile
    function mCargarManual() {
        const el = document.getElementById('m-manual-contenido');
        if (el.innerHTML) return; // ya cargado
        fetch('postear.txt').then(r => r.text()).then(t => { el.textContent = t; });
    }

    // Cambiar tema mobile
    function mCambiarTema() {
        cambiarTema();
        const temas = ['default', 'retro'];
        const actual = localStorage.getItem('tema') || 'default';
        document.getElementById('m-btn-tema').textContent = `[ tema: ${actual} ]`;
    }

    // Inicializar mobile
    if (esMobile()) {
        // Sincronizar botón día/noche
        document.addEventListener('DOMContentLoaded', () => {});
        // Escuchar cambios de modo noche para actualizar botón
        const origToggle = window.toggleDiaNoche;
        window.toggleDiaNoche = function() {
            origToggle && origToggle();
            const btn = document.getElementById('m-btn-noche');
            if (btn) btn.textContent = document.body.classList.contains('modo-noche') ? '[ noche ]' : '[ día ]';
        };
    }
