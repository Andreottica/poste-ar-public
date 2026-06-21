// ============================================
// POSTE.AR CRYPTO — v2.2
//
// Flujo:
//   Registro   → semillas → PBKDF2 → escalar → noble/curves P-256 → par ECDH
//                → solo clave pública al servidor
//   Login      → semillas → mismo proceso → verificar contra clave pública guardada
//   Inbox      → ECDH efímero + AES-GCM 256 → cifrado en el navegador
//                → self-copy para ver mensajes enviados
//
// El servidor nunca ve ni guarda la clave privada.
// Las semillas son la identidad — quien las tiene, es el usuario.
// ============================================

const Crypto = (() => {

    const PBKDF2_ITERATIONS = 310000;

    function base64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    function desbase64url(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        const bin = atob(str);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }

    async function derivarParECDH(semillas) {
        const enc = new TextEncoder();

        const claveBase = await crypto.subtle.importKey(
            'raw', enc.encode(semillas.trim()),
            { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const escalarBuffer = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: enc.encode('poste.ar/v2/ecdh-derivacion'),
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            claveBase, 256
        );

        const escalar = new Uint8Array(escalarBuffer);
        const pub65 = nobleCurves.p256.getPublicKey(escalar, false);

        const xBuf = new Uint8Array(pub65.slice(1, 33)).buffer;
        const yBuf = new Uint8Array(pub65.slice(33, 65)).buffer;

        const jwkPrivada = {
            kty: 'EC', crv: 'P-256',
            d: base64url(escalarBuffer),
            x: base64url(xBuf),
            y: base64url(yBuf),
            ext: true,
            key_ops: ['deriveKey', 'deriveBits']
        };

        const clavePrivada = await crypto.subtle.importKey(
            'jwk', jwkPrivada,
            { name: 'ECDH', namedCurve: 'P-256' },
            true, ['deriveKey', 'deriveBits']
        );

        const clavePublicaJWK = {
            kty: 'EC', crv: 'P-256',
            x: jwkPrivada.x,
            y: jwkPrivada.y,
            ext: true, key_ops: []
        };

        return { clavePublicaJWK, clavePrivada };
    }

    async function generarParRegistro(semillas) {
        const { clavePublicaJWK } = await derivarParECDH(semillas);
        return { clavePublicaJWK };
    }

    async function recuperarClavePrivada(semillas, clavePublicaEsperadaStr) {
        const { clavePublicaJWK, clavePrivada } = await derivarParECDH(semillas);
        if (clavePublicaEsperadaStr) {
            const esperada = JSON.parse(clavePublicaEsperadaStr);
            if (clavePublicaJWK.x !== esperada.x || clavePublicaJWK.y !== esperada.y) {
                throw new Error('Las semillas no corresponden a este nick');
            }
        }
        return clavePrivada;
    }

    async function cifrarMensaje(texto, clavePublicaJWKDestinatario) {
        const clavePublicaDest = await crypto.subtle.importKey(
            'jwk', clavePublicaJWKDestinatario,
            { name: 'ECDH', namedCurve: 'P-256' },
            false, []
        );
        const parEfimero = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
        );
        const claveAES = await crypto.subtle.deriveKey(
            { name: 'ECDH', public: clavePublicaDest },
            parEfimero.privateKey,
            { name: 'AES-GCM', length: 256 },
            false, ['encrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const textoCifrado = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, claveAES,
            new TextEncoder().encode(texto)
        );
        const pubEfimeraJWK = await crypto.subtle.exportKey('jwk', parEfimero.publicKey);
        const paquete = {
            v: 1,
            eph: pubEfimeraJWK,
            iv: base64url(iv.buffer),
            ct: base64url(textoCifrado)
        };
        return base64url(new TextEncoder().encode(JSON.stringify(paquete)));
    }

    async function descifrarMensaje(mensajeCifradoB64, clavePrivadaECDH) {
        const paqueteBytes = desbase64url(mensajeCifradoB64);
        const paquete = JSON.parse(new TextDecoder().decode(paqueteBytes));
        if (paquete.v !== 1) throw new Error('Versión de paquete desconocida');
        const pubEfimera = await crypto.subtle.importKey(
            'jwk', paquete.eph,
            { name: 'ECDH', namedCurve: 'P-256' },
            false, []
        );
        const claveAES = await crypto.subtle.deriveKey(
            { name: 'ECDH', public: pubEfimera },
            clavePrivadaECDH,
            { name: 'AES-GCM', length: 256 },
            false, ['decrypt']
        );
        const iv = new Uint8Array(desbase64url(paquete.iv));
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv }, claveAES, desbase64url(paquete.ct)
        );
        return new TextDecoder().decode(plaintext);
    }

    function serializarClavePublica(jwk) { return JSON.stringify(jwk); }
    function deserializarClavePublica(str) { return JSON.parse(str); }

    return {
        generarParRegistro,
        recuperarClavePrivada,
        cifrarMensaje,
        descifrarMensaje,
        serializarClavePublica,
        deserializarClavePublica,
    };

})();
