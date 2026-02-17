    let miMarca = "";
    let miColor = "";
    let buscando = false;
    let timeoutBusqueda = null;
    let todosLosPosts = [];
    let temas = ['default', 'retro'];
    let temaActual = localStorage.getItem('tema') || 'default';
    let modoOscuro = localStorage.getItem('modo') === 'noche';
    let modoApp = 'publico';
    let semillaGlobalActiva = '';
    let offsetActual = 0;
    let cargandoMas = false;
    let hayMasPosts = true;

    // Toast notification
    function mostrarToast(mensaje, tipo) {
        let toast = document.getElementById('toast-msg');
        if(!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-msg';
            toast.style.cssText = `
                position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
                padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: 500;
                z-index: 9999; opacity: 0; transition: opacity 0.3s ease;
                max-width: 90vw; text-align: center; pointer-events: none;
            `;
            document.body.appendChild(toast);
        }
        toast.innerText = mensaje;
        toast.style.background = tipo === 'error' ? '#c0392b' : tipo === 'ok' ? '#27ae60' : '#333';
        toast.style.color = 'white';
        toast.style.opacity = '1';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }
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
            const btnModo = document.getElementById('btn-modo');
            if(btnModo) btnModo.innerText = '[ noche ]';
        } else {
            document.body.classList.remove('modo-noche');
            const btnModo = document.getElementById('btn-modo');
            if(btnModo) btnModo.innerText = '[ día ]';
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
    function toggleModoApp() {
        if(modoApp === 'publico') {
            modoApp = 'encriptado';
            document.getElementById('btn-modo-app').innerText = '[ encriptado ]';
            document.getElementById('editor-publico-section').classList.add('hidden');
            document.getElementById('editor-encriptado-section').classList.remove('hidden');
            document.getElementById('search-input').classList.add('hidden');
            document.getElementById('search-info').classList.add('hidden');
            document.getElementById('btn-volver').classList.add('hidden');
            document.getElementById('timeline').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-terciario);">Ingresá una semilla para ver mensajes cifrados.</div>';
            semillaGlobalActiva = '';
        } else {
            modoApp = 'publico';
            document.getElementById('btn-modo-app').innerText = '[ público ]';
            document.getElementById('editor-publico-section').classList.remove('hidden');
            document.getElementById('editor-encriptado-section').classList.add('hidden');
            document.getElementById('search-input').classList.remove('hidden');
            document.getElementById('semilla-leer-input').value = '';
            document.getElementById('checkbox-mantener-semilla').checked = false;
            semillaGlobalActiva = '';
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
    function generarUsuarioDesdeIdentidad(identidad) {
        const hash = CryptoJS.SHA256(identidad).toString();
        const silabas = ['ba','be','bi','bo','bu','ca','ce','ci','co','cu','da','de','di','do','du','fa','fe','fi','fo','fu','ga','ge','gi','go','gu','ja','je','ji','jo','ju','ka','ke','ki','ko','ku','la','le','li','lo','lu','ma','me','mi','mo','mu','na','ne','ni','no','nu','pa','pe','pi','po','pu','ra','re','ri','ro','ru','sa','se','si','so','su','ta','te','ti','to','tu','va','ve','vi','vo','vu','xa','xe','xi','xo','xu','ya','ye','yi','yo','yu','za','ze','zi','zo','zu'];
        const idx1 = parseInt(hash.substring(0, 8), 16) % silabas.length;
        const num1 = parseInt(hash.substring(8, 16), 16) % 90 + 10;
        const idx2 = parseInt(hash.substring(16, 24), 16) % silabas.length;
        const num2 = parseInt(hash.substring(24, 32), 16) % 90 + 10;
        return `${silabas[idx1]}${silabas[idx2]}.${num1}@${silabas[(idx1+idx2)%silabas.length]}${silabas[(num1+num2)%silabas.length]}.${num2}`;
    }
    function generarColorDesdeIdentidad(identidad) {
        const hash = CryptoJS.SHA256(identidad).toString();
        const hue = parseInt(hash.substring(0, 8), 16) % 360;
        return `hsl(${hue}, 60%, 45%)`;
    }
    function entrar() {
        let identidad = document.getElementById('identity-input').value.trim();
        const recordarUsuario = document.getElementById('checkbox-recordar-usuario').checked;
        const recordarPassword = document.getElementById('checkbox-recordar-password').checked;
        const loginError = document.getElementById('login-error');
        const passwordGuardado = localStorage.getItem('password-guardado');
        loginError.classList.add('hidden');
        if(!recordarUsuario) {
            localStorage.removeItem('usuario-guardado');
        }
        if(!recordarPassword) {
            localStorage.removeItem('password-guardado');
        }
        if(recordarPassword && passwordGuardado && !identidad) {
            identidad = passwordGuardado;
        }
        if(!identidad) {
            mostrarToast('Ingresá al menos 3 palabras', 'error');
            return;
        }
        const palabras = identidad.split(/\s+/);
        if(palabras.length < 3 || palabras.length > 12) {
            mostrarToast('Usá entre 3 y 12 palabras', 'error');
            return;
        }
        const usuarioGuardado = localStorage.getItem('usuario-guardado');
        if(usuarioGuardado) {
            const usuarioIngresado = generarUsuarioDesdeIdentidad(identidad);
            if(usuarioIngresado !== usuarioGuardado) {
                loginError.classList.remove('hidden');
                return;
            }
        }
        sessionStorage.setItem('identidad', identidad);
        miMarca = generarUsuarioDesdeIdentidad(identidad);
        miColor = generarColorDesdeIdentidad(identidad);
        if(recordarUsuario) {
            localStorage.setItem('usuario-guardado', miMarca);
        }
        if(recordarPassword) {
            localStorage.setItem('password-guardado', identidad);
        }
        document.documentElement.style.setProperty('--rastro-color', miColor);
        document.getElementById('display-user').innerText = miMarca;
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('contador-reset').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        cargarTimeline();
    }
    function salir() {
        sessionStorage.removeItem('identidad');
        miMarca = "";
        miColor = "";
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('contador-reset').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('identity-input').value = '';
        document.getElementById('timeline').innerHTML = '';
        document.getElementById('login-error').classList.add('hidden');
        modoApp = 'publico';
        semillaGlobalActiva = '';
        cargarPreferenciasLogin();
    }
    function cargarPreferenciasLogin() {
        const usuarioGuardado = localStorage.getItem('usuario-guardado');
        const passwordGuardado = localStorage.getItem('password-guardado');
        const usuarioDisplay = document.getElementById('login-usuario-guardado');
        const usuarioGuardadoSpan = document.getElementById('usuario-guardado-display');
        if(usuarioGuardado) {
            document.getElementById('checkbox-recordar-usuario').checked = true;
            usuarioDisplay.classList.remove('hidden');
            usuarioGuardadoSpan.innerText = usuarioGuardado;
        } else {
            document.getElementById('checkbox-recordar-usuario').checked = false;
            usuarioDisplay.classList.add('hidden');
        }
        if(passwordGuardado) {
            document.getElementById('checkbox-recordar-password').checked = true;
        } else {
            document.getElementById('checkbox-recordar-password').checked = false;
        }
    }
    function verificarSesion() {
        const identidad = sessionStorage.getItem('identidad');
        if(identidad) {
            miMarca = generarUsuarioDesdeIdentidad(identidad);
            miColor = generarColorDesdeIdentidad(identidad);
            document.documentElement.style.setProperty('--rastro-color', miColor);
            document.getElementById('display-user').innerText = miMarca;
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('contador-reset').classList.remove('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            cargarTimeline();
        } else {
            cargarPreferenciasLogin();
        }
    }
    function toggleIntro() {
        const box = document.getElementById('intro-box');
        box.style.display = box.style.display === 'block' ? 'none' : 'block';
    }
    function toggleManual() {
        const box = document.getElementById('manual-box');
        if(box.style.display === 'block') { box.style.display = 'none'; return; }
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
        if(contador) contador.innerText = texto;
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
    function procesarTexto(texto) {
        let html = texto;
        html = html.replace(/<([^<>]+?):(https?:\/\/[^<>]+?)>/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/<([^<>]+?):(?!\/\/)([^<>\s]+)>/g, '<a href="http://$2" target="_blank" rel="noopener noreferrer">$1</a>');
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
            const fecha = new Date(post.fecha);
            const fechaStr = formatearFecha(post.fecha);
            postDiv.innerHTML = `
                <div class="avatar" id="${idAv}"></div>
                <div class="post-body">
                    <div class="marca-tag" style="color: ${post.color}">${post.etiqueta}</div>
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
            mostrarToast('Ingresá una semilla para descifrar', 'error');
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
                        mensajesDescifrados.push({
                            id: post.id,
                            etiqueta: post.etiqueta,
                            color: post.color,
                            texto: textoDescifrado,
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
            mensajesDescifrados.sort((a, b) => a.fecha - b.fecha);
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';
            mensajesDescifrados.forEach(msg => {
                const postDiv = document.createElement('div');
                postDiv.className = 'post';
                const idAv = `av-${msg.id}`;
                const fecha = new Date(msg.fecha);
                const fechaStr = formatearFecha(msg.fecha);
                postDiv.innerHTML = `
                    <div class="avatar" id="${idAv}"></div>
                    <div class="post-body">
                        <div class="marca-tag" style="color: ${msg.color}">${msg.etiqueta}</div>
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
            mostrarToast('Escribí algo antes de postear', 'error');
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
            mostrarToast('Escribí algo antes de postear', 'error');
            return;
        }
        if(!password) {
            mostrarToast('La semilla es obligatoria', 'error');
            return;
        }
        const palabras = password.split(/\s+/);
        if(palabras.length < 1 || palabras.length > 12) {
            mostrarToast('Usá entre 1 y 12 palabras para la semilla', 'error');
            return;
        }
        const contenidoCifrado = CryptoJS.AES.encrypt(texto, password).toString();
        console.log('Contenido cifrado:', contenidoCifrado);
        const payload = {
            etiqueta: miMarca,
            contenido: '.',
            color: miColor,
            semilla: null,
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
                mostrarToast('Mensaje cifrado publicado', 'ok');
            } else {
                mostrarToast('Error al postear', 'error');
            }
        } catch(e) {
            console.error('Error:', e);
            mostrarToast('Error de conexión', 'error');
        }
    }
    async function postear(textoPublico, textoOculto, password) {
        let contenidoCifrado = null;
        if(textoOculto && password) {
            contenidoCifrado = CryptoJS.AES.encrypt(textoOculto, password).toString();
        }
        const payload = {
            etiqueta: miMarca,
            contenido: textoPublico,
            color: miColor,
            semilla: null,
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
                mostrarToast('Error al postear', 'error');
            }
        } catch(e) {
            console.error('Error:', e);
            mostrarToast('Error de conexión', 'error');
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
    function manejarCambioCheckboxes() {
        const recordarUsuario = document.getElementById('checkbox-recordar-usuario');
        const recordarPassword = document.getElementById('checkbox-recordar-password');
        const usuarioDisplay = document.getElementById('login-usuario-guardado');
        recordarUsuario.addEventListener('change', function() {
            if(!this.checked) {
                localStorage.removeItem('usuario-guardado');
                usuarioDisplay.classList.add('hidden');
            } else {
                const usuarioGuardado = localStorage.getItem('usuario-guardado');
                if(usuarioGuardado) {
                    usuarioDisplay.classList.remove('hidden');
                }
            }
        });
        recordarPassword.addEventListener('change', function() {
            if(!this.checked) {
                localStorage.removeItem('password-guardado');
            }
        });
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
        verificarSesion();
        actualizarContadorReset();
        setInterval(actualizarContadorReset, 60000);
        manejarCambioCheckboxes();
    };
