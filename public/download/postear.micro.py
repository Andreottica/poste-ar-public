#!/usr/bin/env python3
# postear.micro.py — cliente de consola para poste.ar 24/7 mm (micro mail)
# uso:  python3 postear.micro.py
# deps: pip install requests rich cryptography

import sys, re, json, random, os, pathlib, hashlib, base64, unicodedata

try:
    import requests
except ImportError:
    print("\n  falta la librería 'requests'.")
    print("  instalala con pip, por ejemplo:")
    print("  pip install requests")
    print("  (según tu sistema puede llamarse python3-requests o py3-requests)\n")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.text    import Text
except ImportError:
    print("\n  falta la librería 'rich'.")
    print("  instalala con pip, por ejemplo:")
    print("  pip install rich")
    print("  (según tu sistema puede llamarse python3-rich o py3-rich)\n")
    sys.exit(1)

try:
    from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, derive_private_key, ECDH
    from cryptography.hazmat.primitives.ciphers.aead  import AESGCM
    from cryptography.hazmat.backends                 import default_backend
except ImportError:
    print("\n  falta la librería 'cryptography'.")
    print("  instalala con pip, por ejemplo:")
    print("  pip install cryptography")
    print("  (según tu sistema puede llamarse python3-cryptography)\n")
    sys.exit(1)

API   = "https://poste.ar"
ANCHO = 66

console = Console(width=ANCHO)

# ── Colores ────────────────────────────────────────────────────────
C_DIM     = "dim"
C_OK      = "bold green"
C_ERR     = "bold red"
C_FECHA   = "bold cyan"
C_BORDE   = "dim white"
C_TITULO  = "bold white"
C_AZUL    = "bold blue"
C_NARANJA = "bold yellow"

# ── Palabras (1393 palabras del diccionario de poste.ar) ───────────
PALABRAS = [
# 1393 palabras
    "abeja", "abierto", "abismo", "abogado", "abrigo", "abril", "abrir", "absoluto",
    "abuelo", "aburrimiento", "acabar", "acantilado", "accesible", "aceite", "aceleración", "acento",
    "acera", "acerca", "acercar", "acompañar", "acordar", "acorde", "acostumbrar", "actitud",
    "actividad", "activista", "activo", "acto", "actor", "actriz", "actual", "actuar",
    "acuerdo", "adaptar", "adelante", "además", "adentro", "admiración", "adquirir", "adulto",
    "aeropuerto", "aeródromo", "afuera", "agregar", "agricultor", "agua", "aguacate", "ahora",
    "ahorro", "aire", "ajeno", "ajo", "alba", "albahaca", "albaricoque", "albornoz",
    "alcalde", "alcanzar", "alce", "alegrar", "alegre", "alegría", "alfombra", "algo",
    "algodón", "algoritmo", "alguien", "aliviar", "alma", "almacén", "almeja", "almendra",
    "almendro", "almohada", "alpaca", "alrededor", "altavoz", "alterar", "alto", "amable",
    "amanecer", "amapola", "amar", "ambiente", "ambulancia", "amigo", "amistad", "amor",
    "amplitud", "ancho", "anchoa", "andar", "andén", "anillo", "animal", "animar",
    "ansiedad", "antes", "antílope", "análisis", "apartamento", "apatía", "apoyo", "aprender",
    "apéndice", "araña", "arbusto", "archipiélago", "archivo", "arco", "ardilla", "arma",
    "armario", "arpa", "arquitecto", "array", "arrecife", "arreglar", "arriba", "arrogancia",
    "arroz", "arte", "arteria", "artista", "artículo", "ascensor", "asco", "aspecto",
    "astillero", "asunto", "atardecer", "atender", "atleta", "atún", "aumentar", "auricular",
    "aurora", "autobús", "autoestima", "autopista", "avanzar", "avenida", "avestruz", "aviación",
    "avión", "ayuda", "ayuntamiento", "azalea", "azul", "azúcar", "año", "bacalao",
    "bahía", "bajar", "bajo", "balcón", "ballena", "banco", "bar", "barco",
    "barranco", "barrio", "base", "bata", "batidora", "bañador", "baño", "begonia",
    "berenjena", "biblioteca", "bicicleta", "bien", "bikini", "bimestre", "bisonte", "bizcocho",
    "blanco", "bloque", "blusa", "boca", "bocadillo", "boina", "bolsillo", "bolso",
    "bolígrafo", "bombero", "bomberos", "bordado", "bordillo", "bosque", "bota", "botón",
    "brazo", "brillo", "broche", "brócoli", "bucle", "bueno", "bufanda", "buscador",
    "buscar", "búfalo", "búho", "caballo", "cabeza", "cabo", "cabra", "cacahuete",
    "caché", "cactus", "cada", "cadera", "caer", "cafetera", "cafetería", "café",
    "calabacín", "calamar", "calcetín", "calculadora", "calendario", "calidad", "callar", "calle",
    "calma", "calor", "cama", "cambiar", "camelia", "camello", "camino", "camisa",
    "camiseta", "camión", "campo", "canal", "canción", "cangrejo", "canguro", "cantar",
    "capital", "cara", "caracol", "carga", "cargar", "carpeta", "carrera", "carretera",
    "carril", "carta", "cartera", "cartílago", "casa", "cascada", "caso", "castaño",
    "castor", "catedral", "catálisis", "causa", "cazuela", "cañón", "cebolla", "cebra",
    "cedro", "ceja", "celda", "celos", "central", "centro", "cepillo", "cerca",
    "cerdo", "cerebro", "cereza", "cerezo", "cerrar", "certeza", "certificado", "cerveza",
    "champú", "chaqueta", "charla", "chimenea", "chimpancé", "chocolate", "cielo", "científico",
    "cierto", "ciervo", "cifrado", "cigüeña", "cilantro", "cine", "cinturón", "ciprés",
    "circuito", "ciruela", "citación", "ciudad", "ciudadano", "claridad", "claro", "clase",
    "clave", "clavel", "cliente", "clínica", "cobardía", "cobaya", "cobrar", "coche",
    "cocina", "codo", "colchón", "colibrí", "coliflor", "colina", "collar", "color",
    "columna", "combinar", "combustión", "comenzar", "comer", "comerciante", "compartir", "compasión",
    "comprador", "comprar", "comprender", "compuesto", "compás", "comunidad", "conciencia", "conclusión",
    "conejo", "confianza", "conflicto", "confusión", "congreso", "conocer", "conocimiento", "conseguir",
    "construir", "consulado", "consulta", "contacto", "contar", "continuar", "contraseña", "control",
    "cookie", "corazón", "corbata", "cordero", "correlación", "correos", "correr", "corriente",
    "cortar", "corteza", "cortina", "cosa", "costa", "costilla", "costumbre", "costura",
    "coyote", "crear", "crecer", "creer", "cremallera", "crepúsculo", "crisantemo", "crisis",
    "croissant", "cromosoma", "croqueta", "cruce", "cráneo", "cuaderno", "cuadro", "cuartel",
    "cubierto", "cuchara", "cuchillo", "cuello", "cuento", "cuero", "cuerpo", "cuervo",
    "cueva", "cuidado", "cuidar", "culpa", "cultura", "cumbre", "cumplir", "curiosidad",
    "cámara", "célula", "código", "dalia", "dar", "dato", "deber", "debug",
    "decepción", "decir", "decisión", "dedo", "defender", "dejar", "delantal", "delante",
    "delfín", "delta", "democracia", "demás", "densidad", "dentro", "depender", "deporte",
    "deportista", "depresión", "derecho", "desarrollo", "descanso", "desconfianza", "desear", "desierto",
    "desigualdad", "despliegue", "desprecio", "después", "desvío", "detener", "diafragma", "diagrama",
    "dibujo", "diccionario", "dictadura", "diente", "diferencia", "difícil", "dinero", "diputado",
    "dirección", "directo", "director", "disciplina", "diseño", "disfraz", "distancia", "diversidad",
    "división", "doble", "documentado", "dolor", "dominar", "dominio", "dormir", "dormitorio",
    "dromedario", "duda", "dueño", "durante", "dureza", "década", "día", "edad",
    "edificio", "editorial", "educación", "efecto", "egoísmo", "ejemplo", "ejercicio", "ejército",
    "elección", "electrón", "elefante", "elemento", "embajada", "emoción", "empanada", "empatía",
    "empezar", "empleo", "empresario", "emulsión", "encaje", "enciclopedia", "encina", "encontrar",
    "eneldo", "enemistad", "energía", "enfermero", "enlace", "enorme", "ensalada", "ensayo",
    "enseñar", "entrada", "entre", "entrevista", "entusiasmo", "envidia", "enzima", "equipo",
    "era", "error", "escalable", "escalera", "escarabajo", "escena", "escenario", "escepticismo",
    "escribir", "escritor", "escuchar", "escuela", "escultura", "escáner", "espacio", "espalda",
    "especie", "espectro", "espejo", "esperanza", "esperar", "espina", "espinaca", "espíritu",
    "esquema", "estable", "establecer", "estación", "estadio", "estado", "estadística", "estampado",
    "estantería", "estar", "estrecho", "estrella", "estructura", "estrés", "estuario", "estómago",
    "etapa", "eucalipto", "euforia", "evidencia", "evitar", "evolución", "exacto", "exclusión",
    "existir", "experiencia", "experimento", "explicar", "exposición", "exterior", "factor", "falda",
    "falta", "familia", "farmacia", "fase", "favor", "fecha", "ferry", "figura",
    "fila", "filo", "final", "fiordo", "firma", "fiscal", "flamenco", "flan",
    "flauta", "flor", "flujo", "fondo", "forma", "formato", "formulario", "fotografía",
    "fotón", "frecuencia", "frente", "fresa", "frialdad", "fruto", "fuego", "fuente",
    "fuerza", "función", "furgoneta", "futuro", "fábrica", "fábula", "fácil", "física",
    "gabardina", "gacela", "gafas", "galería", "galleta", "gallina", "gambas", "ganadero",
    "ganar", "garaje", "garbanzo", "garganta", "gas", "gasolinera", "gato", "gazpacho",
    "gen", "general", "generosidad", "gente", "geranio", "girasol", "glaciar", "gladiolo",
    "glóbulo", "gobernador", "gobierno", "golondrina", "goma", "gorila", "gorra", "gorrión",
    "gorro", "gramática", "grande", "gratitud", "gravedad", "grillo", "gruta", "gráfico",
    "guante", "guardar", "guardia", "guepardo", "guion", "guisante", "guitarra", "gusano",
    "género", "habitación", "habitual", "hablar", "hacer", "halcón", "hamburguesa", "hamster",
    "hardware", "harina", "helado", "helecho", "helicóptero", "herramienta", "hielo", "hiena",
    "higo", "higuera", "hinojo", "hipopótamo", "hipótesis", "historia", "hogar", "hoja",
    "hombre", "hombro", "honestidad", "hora", "horario", "hormiga", "horno", "hortensia",
    "hospital", "hostal", "hotel", "hueso", "huevo", "humano", "humedal", "humildad",
    "hígado", "icono", "idea", "idealismo", "identidad", "idioma", "iglesia", "igual",
    "igualdad", "imagen", "impacto", "impermeable", "importar", "impresora", "impuesto", "incluir",
    "inclusión", "indecisión", "indiferencia", "individuo", "industria", "información", "ingeniero", "inicio",
    "inmigrante", "instante", "instinto", "instrumento", "interfaz", "interior", "internet", "interés",
    "intestino", "intuición", "inversión", "investigador", "ira", "iris", "isla", "jabalí",
    "jabón", "jaguar", "jardín", "jazmín", "jersey", "jirafa", "joven", "judía",
    "juego", "juez", "justicia", "juzgado", "kiwi", "koala", "labio", "ladera",
    "lado", "lagarto", "lago", "lana", "langosta", "langostino", "largo", "laringe",
    "laurel", "lavadora", "lavanda", "lavavajillas", "lealtad", "leche", "lechuga", "leer",
    "lejos", "lengua", "lenteja", "leopardo", "ley", "leyenda", "león", "libertad",
    "libre", "librería", "libro", "libélula", "liebre", "lienzo", "ligamento", "ligero",
    "lila", "limonero", "limón", "lince", "lino", "llama", "llamar", "llanura",
    "llegar", "llevar", "lluvia", "lobo", "lograr", "lombriz", "longitud", "loro",
    "lugar", "luna", "lustro", "luz", "lámpara", "lápiz", "líder", "límite",
    "líquido", "madre", "madreselva", "madrugada", "maestro", "magnetismo", "manantial", "mandíbula",
    "manera", "mango", "mano", "manta", "mantel", "mantenible", "mantequilla", "manzana",
    "manzano", "mapa", "mar", "marco", "margarita", "marina", "mariposa", "masa",
    "material", "mayor", "maíz", "media", "medianoche", "medición", "medida", "mediodía",
    "mejillón", "mejor", "mejorar", "melancolía", "melocotón", "melodía", "melón", "mensaje",
    "menta", "mente", "mentira", "menú", "mercado", "merluza", "mermelada", "mes",
    "mesa", "meseta", "metro", "mezcla", "microondas", "micrófono", "miedo", "miel",
    "miembro", "milenio", "mineral", "ministro", "minuto", "mirar", "mismo", "mito",
    "mochila", "modelo", "modular", "molécula", "momento", "monarquía", "monedero", "mono",
    "montaña", "mosca", "mosquito", "mostrar", "motivación", "moto", "motor", "movimiento",
    "muelle", "muestra", "mujer", "mundo", "museo", "musgo", "mutación", "muñeca",
    "médico", "médula", "método", "módulo", "músculo", "música", "músico", "nacer",
    "nación", "nada", "nailon", "naranja", "naranjo", "narciso", "nardo", "nariz",
    "nata", "natillas", "natural", "navaja", "navegador", "necesitar", "nervio", "neutrón",
    "nevera", "niebla", "nieve", "nivel", "noche", "nogal", "nombre", "norma",
    "norte", "nostalgia", "nota", "noticia", "novela", "novelista", "nube", "nuez",
    "nunca", "nutria", "núcleo", "número", "objetivo", "objeto", "obra", "obrero",
    "observación", "ocaso", "océano", "odio", "oficina", "ofrecer", "ojo", "ojos",
    "olivo", "olla", "olmo", "onda", "opción", "oportunidad", "optimismo", "orden",
    "ordenador", "oreja", "organismo", "orgullo", "origen", "orquídea", "ortografía", "oscuro",
    "oso", "oveja", "oxidación", "paciencia", "padre", "paella", "palabra", "paleta",
    "palmera", "paloma", "pan", "panel", "pantalla", "pantalón", "pantano", "pantera",
    "parche", "pared", "parking", "parlamento", "parque", "participar", "partido", "pasar",
    "pasillo", "pasión", "pasta", "patata", "pato", "pausa", "paz", "país",
    "pañal", "pañuelo", "pecho", "pedir", "peine", "pelvis", "película", "pendiente",
    "pensar", "pensión", "península", "pepino", "pequeño", "pera", "peral", "perder",
    "perejil", "periodista", "periódico", "perro", "personal", "pertenencia", "período", "pescado",
    "pescador", "pesimismo", "petición", "pez", "piano", "pico", "pie", "piel",
    "pierna", "pijama", "pimiento", "pincel", "pingüino", "pino", "pintura", "piso",
    "pistacho", "pizza", "piña", "planta", "plantilla", "plasma", "plato", "playa",
    "plaza", "plazo", "plátano", "población", "pobreza", "poder", "poema", "poeta",
    "policía", "poliéster", "pollo", "política", "poner", "posible", "posición", "potencia",
    "pradera", "pragmatismo", "precio", "pregunta", "presente", "presidente", "presión", "primer",
    "principio", "prisión", "probabilidad", "proceso", "producir", "profesor", "programa", "propio",
    "proteína", "protocolo", "protón", "proyecto", "prueba", "práctica", "publicación", "publicar",
    "pueblo", "puente", "puerta", "puerto", "puesto", "pulmón", "pulpo", "pulsera",
    "puma", "punto", "pupila", "página", "páncreas", "páramo", "párpado", "pétalo",
    "quedar", "querer", "queso", "racismo", "radiación", "radio", "rama", "rana",
    "rata", "ratón", "rayo", "razón", "raíl", "raíz", "reacción", "real",
    "realismo", "recibir", "recordar", "recurso", "red", "reducción", "referencia", "refresco",
    "refrán", "refugiado", "región", "regla", "reino", "relación", "relato", "reloj",
    "rencor", "reportaje", "república", "resistencia", "respeto", "responder", "responsivo", "respuesta",
    "restaurante", "resultado", "retina", "reunión", "reutilizable", "revisión", "revista", "rey",
    "rico", "rinoceronte", "riqueza", "ritmo", "riñón", "roble", "robusto", "rocío",
    "rodilla", "rojo", "romanticismo", "romero", "ropa", "rosa", "rotonda", "ruta",
    "río", "sabana", "saber", "sal", "sala", "salmón", "salud", "sandalia",
    "sandía", "sangre", "sanidad", "sapo", "sardina", "sartén", "sauce", "saxofón",
    "secadora", "seda", "seguidor", "seguir", "segundo", "seguridad", "seguro", "selección",
    "selva", "semana", "semestre", "semilla", "semáforo", "senado", "senador", "sendero",
    "sensibilidad", "ser", "serenidad", "serie", "serpiente", "servicio", "servidor", "servilleta",
    "sesión", "sexismo", "señal", "señor", "siempre", "siglo", "siguiente", "silla",
    "sino", "sintaxis", "sistema", "sitio", "situación", "sobre", "social", "sociedad",
    "software", "sofá", "soja", "sol", "soledad", "solidaridad", "solo", "solución",
    "sombrero", "sonido", "sopa", "sorpresa", "subir", "subsidio", "sudadera", "suelo",
    "suerte", "sueño", "supermercado", "suponer", "suspensión", "sándwich", "síntesis", "sólido",
    "sótano", "tabla", "tacón", "tallo", "talón", "tambor", "tarea", "tarta",
    "taxi", "taza", "teatro", "techo", "teclado", "tejido", "tejón", "tela",
    "televisor", "teléfono", "telón", "temperatura", "temporada", "tendón", "tenedor", "tener",
    "teoría", "terminar", "ternera", "ternura", "terraza", "texto", "tiburón", "tiempo",
    "tienda", "tierra", "tigre", "tijeras", "tipo", "toalla", "tobillo", "todo",
    "token", "tolerancia", "tomar", "tomate", "tomillo", "torre", "tortilla", "tortuga",
    "tostadora", "total", "trabajador", "trabajar", "trabajo", "tradición", "traición", "traje",
    "transformar", "tranvía", "tren", "trimestre", "tristeza", "trompeta", "tronco", "trueno",
    "tráquea", "tucán", "tulipán", "tundra", "turno", "técnica", "tímpano", "título",
    "túnel", "unidad", "uniforme", "universidad", "universo", "urgente", "usar", "usuario",
    "uva", "uña", "vaca", "valentía", "valle", "valor", "vaquero", "variable",
    "vaso", "velocidad", "veloz", "vena", "vendedor", "venir", "ventaja", "ventana",
    "ver", "verdad", "verdadero", "vergüenza", "versión", "vestido", "vesícula", "viaje",
    "victoria", "vid", "vida", "viejo", "viento", "vino", "violeta", "violín",
    "visible", "vitamina", "vivienda", "vivir", "vocabulario", "volcán", "voltaje", "volumen",
    "voluntad", "voluntario", "volver", "votación", "voz", "vía", "web", "yogur",
    "zanahoria", "zapatilla", "zapato", "zona", "zorro", "zumo", "ácido", "águila",
    "álamo", "árbol", "área", "ático", "átomo", "época", "índice", "órgano",
    "único",
]

# ── UI primitivas ──────────────────────────────────────────────────
def _logo():
    console.clear()
    console.print()
    t = Text()
    t.append("  postear ", style=C_TITULO)
    t.append("24/7 ", style=C_AZUL)
    t.append("mm", style=C_NARANJA)
    t.append("  micro mail", style=C_DIM)
    console.print(t)
    console.print("  mensajes privados cifrados · se borra cada lunes", style=C_DIM)
    console.print()

def _linea(c="-"):
    console.print("  " + c * (ANCHO - 4), style=C_BORDE)

def _ok(msg):
    t = Text()
    t.append("  ✓ ", style=C_OK)
    t.append(msg, style="green")
    console.print(t)

def _err(msg):
    t = Text()
    t.append("  ✗ ", style=C_ERR)
    t.append(msg, style="red")
    console.print(t)

def _dim(msg):
    console.print(f"  {msg}", style=C_DIM)

def _status(msg):
    console.print(f"  … {msg}", style=C_DIM, end="\r")

def _clr():
    console.print(" " * ANCHO, end="\r")

def _input(prompt):
    console.print(f"  {prompt}", style=C_DIM, end="")
    return input(" ").strip()

# ── Crypto ─────────────────────────────────────────────────────────

def _b64url_enc(data):
    if isinstance(data, memoryview):
        data = bytes(data)
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def _b64url_dec(s):
    s = s.replace('-', '+').replace('_', '/')
    pad = 4 - len(s) % 4
    if pad != 4: s += '=' * pad
    return base64.b64decode(s)

def _derivar_escalar(semillas):
    nfc = unicodedata.normalize('NFC', semillas.strip())
    return hashlib.pbkdf2_hmac(
        'sha256',
        nfc.encode('utf-8'),
        b'poste.ar/v2/ecdh-derivacion',
        310000,
        dklen=32
    )

def _escalar_a_privada(escalar):
    n = int.from_bytes(escalar, 'big')
    return derive_private_key(n, SECP256R1(), default_backend())

def derivar_par(semillas):
    escalar      = _derivar_escalar(semillas)
    clave_priv   = _escalar_a_privada(escalar)
    pub          = clave_priv.public_key().public_numbers()
    jwk = {
        "kty": "EC", "crv": "P-256",
        "x": _b64url_enc(pub.x.to_bytes(32, 'big')),
        "y": _b64url_enc(pub.y.to_bytes(32, 'big')),
        "ext": True, "key_ops": []
    }
    return clave_priv, json.dumps(jwk)

def _verificar_semillas(semillas, clave_publica_str):
    _, jwk_str   = derivar_par(semillas)
    local        = json.loads(jwk_str)
    servidor     = json.loads(clave_publica_str)
    return local.get("x") == servidor.get("x") and local.get("y") == servidor.get("y")

def _jwk_a_pub_objeto(jwk_str):
    jwk = json.loads(jwk_str) if isinstance(jwk_str, str) else jwk_str
    from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers
    x = int.from_bytes(_b64url_dec(jwk["x"]), 'big')
    y = int.from_bytes(_b64url_dec(jwk["y"]), 'big')
    return EllipticCurvePublicNumbers(x, y, SECP256R1()).public_key(default_backend())

def _derivar_clave_aes(secreto_ecdh):
    """Web Crypto deriveKey con ECDH usa el secreto ECDH raw directamente como clave AES-256."""
    return secreto_ecdh

def cifrar_mensaje(texto, jwk_dest_str):
    pub_dest    = _jwk_a_pub_objeto(jwk_dest_str)
    par_efimero = derive_private_key(
        int.from_bytes(os.urandom(32), 'big') % (2**256 - 1) + 1,
        SECP256R1(), default_backend()
    )
    secreto = par_efimero.exchange(ECDH(), pub_dest)
    clave   = _derivar_clave_aes(secreto)
    iv      = os.urandom(12)
    ct      = AESGCM(clave).encrypt(iv, texto.encode('utf-8'), None)
    pub_ef  = par_efimero.public_key().public_numbers()
    paquete = {
        "v": 1,
        "eph": {
            "kty": "EC", "crv": "P-256",
            "x": _b64url_enc(pub_ef.x.to_bytes(32, 'big')),
            "y": _b64url_enc(pub_ef.y.to_bytes(32, 'big')),
        },
        "iv": _b64url_enc(iv),
        "ct": _b64url_enc(ct)
    }
    return _b64url_enc(json.dumps(paquete).encode())

def descifrar_mensaje(blob, clave_priv):
    try:
        paquete   = json.loads(_b64url_dec(blob).decode())
        if paquete.get("v") != 1: return "[versión desconocida]"
        pub_ef    = _jwk_a_pub_objeto(paquete["eph"])
        secreto   = clave_priv.exchange(ECDH(), pub_ef)
        clave     = _derivar_clave_aes(secreto)
        iv        = _b64url_dec(paquete["iv"])
        ct        = _b64url_dec(paquete["ct"])
        return AESGCM(clave).decrypt(bytes(iv), bytes(ct), None).decode('utf-8')
    except Exception:
        return "[no se pudo descifrar]"

# ── Sesión local ───────────────────────────────────────────────────
_SESION_PATH = pathlib.Path.home() / ".postear_micro_sesion.json"
_sesion = {"nick": None, "clave_priv": None, "jwk_pub": None}

def _sesion_activa():
    return _sesion["nick"] is not None

def _cargar_sesiones():
    try: return json.loads(_SESION_PATH.read_text())
    except Exception: return []

def _guardar_sesion(nick, semillas):
    sesiones = [s for s in _cargar_sesiones() if s.get("nick") != nick]
    sesiones.insert(0, {"nick": nick, "semillas": semillas})
    try: _SESION_PATH.write_text(json.dumps(sesiones))
    except Exception: pass

def _eliminar_sesion(nick):
    sesiones = [s for s in _cargar_sesiones() if s.get("nick") != nick]
    try: _SESION_PATH.write_text(json.dumps(sesiones))
    except Exception: pass

def _generar_12_semillas():
    pool = PALABRAS.copy()
    sel  = []
    for _ in range(12):
        i = random.randint(0, len(pool) - 1)
        sel.append(pool.pop(i))
    return " ".join(sel)

# ── API ────────────────────────────────────────────────────────────
def _get(path):
    try:
        r = requests.get(f"{API}{path}", timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _err("sin conexión a poste.ar")
    except Exception as e:
        _err(str(e))
    return None

def _post(path, data):
    try:
        r = requests.post(f"{API}{path}", json=data, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _err("sin conexión a poste.ar")
    except Exception as e:
        _err(str(e))
    return None

def _delete(path, data):
    try:
        r = requests.delete(f"{API}{path}", json=data, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        _err(str(e))
    return None

# ── Login ──────────────────────────────────────────────────────────
def login():
    while True:
        _logo()
        sesiones = _cargar_sesiones()

        _linea()
        if sesiones:
            for i, s in enumerate(sesiones[:5]):
                console.print(f"  [{i+1}] {s['nick']}", style="cyan")
        console.print("  [N] nuevo usuario", style="cyan")
        console.print("  [E] entrar con semillas", style="cyan")
        console.print("  [0] salir", style="cyan")
        _linea()
        op = _input(">").lower()

        if op == "0": return
        elif op == "n":
            _login_nuevo()
            if _sesion_activa(): return
        elif op == "e":
            _login_existente()
            if _sesion_activa(): return
        elif op.isdigit() and 1 <= int(op) <= min(len(sesiones), 5):
            s = sesiones[int(op) - 1]
            _login_rapido(s["nick"], s["semillas"])
            if _sesion_activa(): return

def _login_nuevo():
    _logo()
    _dim("── nuevo usuario ──\n")
    nick = _input("nick >").lower()
    if not nick or not re.match(r'^[a-z0-9.]{2,30}$', nick):
        _err("nick inválido — solo letras minúsculas, números y punto (2-30 caracteres)")
        input(); return

    _status("verificando disponibilidad…")
    res = _get(f"/api/nick/{nick}"); _clr()
    if not res or not res.get("disponible"):
        _err(f"el nick '{nick}' ya está en uso"); input(); return
    _ok("nick disponible")

    semillas = _generar_12_semillas()
    console.print("\n  tus 12 palabras semilla (tu contraseña — guardalas):\n")
    console.print(f"  {semillas}\n", style="bold yellow")
    console.print("  ⚠  si las perdés, perdés tu identidad para siempre\n", style="bold red")
    input("  enter cuando las hayas guardado… ")

    _status("generando claves…")
    clave_priv, jwk_pub = derivar_par(semillas); _clr()

    _status("registrando…")
    res = _post("/api/registrar", {"nick": nick, "clave_publica": jwk_pub}); _clr()
    if not res: _err("error al registrar"); input(); return

    _ok(f"bienvenido, {nick}")
    _sesion["nick"]      = nick
    _sesion["clave_priv"] = clave_priv
    _sesion["jwk_pub"]   = jwk_pub

    if _input("¿guardar sesión? [s=sí · enter=no] >").lower() == "s":
        _guardar_sesion(nick, semillas); _ok("sesión guardada")
    console.print()

def _login_existente():
    _logo()
    _dim("── entrar con usuario existente ──\n")
    nick = _input("nick >").lower()
    if not nick: return

    _status("buscando usuario…")
    usuario = _get(f"/api/usuario/{nick}"); _clr()
    if not usuario: _err(f"usuario '{nick}' no encontrado"); input(); return

    _dim("ingresá tus 12 palabras semilla:\n")
    semillas = _input(">")
    if not semillas: return

    _status("verificando…")
    ok = _verificar_semillas(semillas, usuario["clave_publica"]); _clr()
    if not ok: _err("las semillas no corresponden a este nick"); input(); return

    clave_priv, jwk_pub = derivar_par(semillas)
    _ok(f"bienvenido, {nick}")
    _sesion["nick"]       = nick
    _sesion["clave_priv"] = clave_priv
    _sesion["jwk_pub"]    = jwk_pub

    if _input("¿guardar sesión? [s=sí · enter=no] >").lower() == "s":
        _guardar_sesion(nick, semillas); _ok("sesión guardada")
    console.print()

def _login_rapido(nick, semillas):
    _status(f"entrando como {nick}…")
    usuario = _get(f"/api/usuario/{nick}"); _clr()
    if not usuario: _err(f"usuario '{nick}' no encontrado"); input(); return
    if not _verificar_semillas(semillas, usuario["clave_publica"]):
        _err("semillas guardadas no coinciden — entrá manualmente"); input(); return
    clave_priv, jwk_pub = derivar_par(semillas)
    _ok(f"bienvenido, {nick}")
    _sesion["nick"]       = nick
    _sesion["clave_priv"] = clave_priv
    _sesion["jwk_pub"]    = jwk_pub

def cerrar_sesion():
    nick = _sesion["nick"]
    _sesion["nick"] = _sesion["clave_priv"] = _sesion["jwk_pub"] = None
    if _input(f"¿eliminar sesión de {nick}? [s=sí · enter=no] >").lower() == "s":
        _eliminar_sesion(nick); _ok("sesión eliminada")
    input()

# ── Inbox ──────────────────────────────────────────────────────────
def _formatear_fecha(fecha):
    return (fecha or "")[:16]

def _renderizar_mensajes(mensajes, modo):
    if not mensajes:
        _dim("sin mensajes.")
        console.print()
        return

    ancho_interior = ANCHO - 4
    ancho_texto    = ancho_interior - 5
    nick           = _sesion["nick"]
    clave_priv     = _sesion["clave_priv"]

    for m in mensajes:
        etiqueta = m.get("etiqueta", "")
        partes   = etiqueta.split("@") if "@" in etiqueta else ["?", " ?"]
        remitente = partes[0].strip()
        dest      = partes[1].strip() if len(partes) > 1 else "?"
        fecha     = _formatear_fecha(m.get("fecha", ""))
        es_enviado = remitente == nick

        # Cabecera con colores: usuario logueado=azul, otro=naranja
        linea_top = "+" + "-" * ancho_interior + "+"
        console.print(f"  {linea_top}", style=C_FECHA)

        t = Text()
        t.append("  |  ")
        if es_enviado:
            t.append(f"{nick}@", style=C_AZUL)
            t.append(" >> ", style=C_DIM)
            t.append(f"{dest}@", style=C_NARANJA)
        else:
            t.append(f"{remitente}@", style=C_NARANJA)
            t.append(" >> ", style=C_DIM)
            t.append(f"{nick}@", style=C_AZUL)
        t.append(f"  · {fecha}", style=C_DIM)
        console.print(t)

        # Descifrar
        blob = m.get("contenido_cifrado_propio") if es_enviado else m.get("contenido_cifrado")
        if blob:
            texto = descifrar_mensaje(blob, clave_priv)
        else:
            texto = "[mensaje borrado]"

        # Word wrap
        palabras_texto = texto.split()
        linea_actual = ""
        for palabra in palabras_texto:
            while len(palabra) > ancho_texto:
                espacio = ancho_texto - len(linea_actual) - (1 if linea_actual else 0)
                if espacio > 4:
                    trozo = palabra[:espacio - 1]
                    console.print(f"  |  {(linea_actual + ' ' + trozo).strip()}-")
                    palabra = palabra[espacio - 1:]
                    linea_actual = ""
                else:
                    if linea_actual: console.print(f"  |  {linea_actual}")
                    linea_actual = ""
            if linea_actual and len(linea_actual) + 1 + len(palabra) > ancho_texto:
                console.print(f"  |  {linea_actual}")
                linea_actual = palabra
            else:
                linea_actual = (linea_actual + " " + palabra).strip() if linea_actual else palabra
        if linea_actual:
            console.print(f"  |  {linea_actual}")

        console.print(f"  +" + "-" * ancho_interior + "+", style=C_BORDE)
        t = Text()
        t.append(f"  id:{m.get('id')}  ", style=C_DIM)
        t.append("[b] borrar", style=C_DIM)
        if not es_enviado:
            t.append("  [r] responder", style=C_DIM)
        console.print(t)
        console.print()

def ver_inbox(modo="recibidos"):
    _logo()
    nick = _sesion["nick"]
    _status("cargando mensajes…")
    todos = _get(f"/micro/api/mm/inbox/{nick}"); _clr()
    if todos is None: input(); return

    if modo == "recibidos":
        mensajes = [m for m in todos if m.get("tipo") == "mensaje"
                    and m.get("contenido_oculto") == nick]
    else:
        mensajes = [m for m in todos if m.get("tipo") == "mensaje"
                    and (m.get("etiqueta") or "").startswith(nick + "@")]

    t = Text()
    t.append(f"  {nick}@", style=C_AZUL)
    t.append(f"  —  {modo}  ({len(mensajes)})", style=C_DIM)
    console.print(t)
    console.print()

    _renderizar_mensajes(mensajes, modo)
    _linea()
    _dim("[b id] borrar  ·  [r nick] responder  ·  enter=volver")
    _dim("  ejemplo: b12 borra el mensaje id:12")
    _linea()

    op = _input(">").lower().strip()
    if op.startswith("b") and op[1:].isdigit():
        mid  = int(op[1:])
        msg  = next((m for m in mensajes if m.get("id") == mid), None)
        if msg:
            es_env = (msg.get("etiqueta","")).split("@")[0].strip() == nick
            tipo   = "propio" if es_env else "recibido"
            res    = _delete(f"/micro/api/mm/mensaje/{mid}", {"nick": nick, "tipo": tipo})
            if res: _ok("borrado")
            else: _err("error al borrar")
        else:
            _err(f"no se encontró el mensaje id:{mid}")
        input()
    elif op.startswith("r") and op[1:].isdigit():
        mid  = int(op[1:])
        msg  = next((m for m in mensajes if m.get("id") == mid), None)
        if msg:
            remitente = (msg.get("etiqueta","")).split("@")[0].strip()
            if remitente != nick:
                enviar_mensaje(destinatario_prefill=remitente)
        else:
            _err(f"no se encontró el mensaje id:{mid}")
            input()

# ── Enviar ─────────────────────────────────────────────────────────
def enviar_mensaje(destinatario_prefill=None):
    _logo()
    _dim("── enviar mensaje ──\n")
    nick = _sesion["nick"]

    if destinatario_prefill:
        dest = destinatario_prefill
        _dim(f"destinatario: {dest}@")
        console.print()
    else:
        dest = _input("destinatario (nick o trueque) >").lower().replace("@", "")
    if not dest: return

    _dim("mensaje (máx. 500 caracteres · enter en blanco cancela):\n")
    texto = _input(">")
    if not texto: _dim("cancelado."); input(); return
    if len(texto) > 500: _err(f"demasiado largo ({len(texto)}/500)"); input(); return

    # Trueque — aviso público sin cifrado
    if dest == "trueque":
        _status("publicando aviso…")
        res = _post("/micro/api/mm/enviar", {
            "remitente": nick,
            "destinatario": "trueque",
            "contenido_cifrado": "trueque",
            "contenido_plano": texto
        }); _clr()
        if res: _ok("aviso publicado en trueque")
        else: _err("error al publicar")
        input(); return

    if not re.match(r'^[a-z0-9.]{2,30}$', dest):
        _err("nick inválido"); input(); return

    # Obtener clave pública del destinatario
    _status("buscando destinatario…")
    usuario_dest = _get(f"/api/usuario/{dest}"); _clr()
    if not usuario_dest: _err(f"el usuario '{dest}' no existe"); input(); return

    # Obtener clave pública propia (para self-copy)
    usuario_propio = _get(f"/api/usuario/{nick}")
    if not usuario_propio: _err("error al obtener clave propia"); input(); return

    _status("cifrando…")
    try:
        cifrado       = cifrar_mensaje(texto, usuario_dest["clave_publica"])
        cifrado_propio = cifrar_mensaje(texto, usuario_propio["clave_publica"])
    except Exception as e:
        _clr(); _err(f"error al cifrar: {e}"); input(); return
    _clr()

    _status("enviando…")
    res = _post("/micro/api/mm/enviar", {
        "remitente": nick,
        "destinatario": dest,
        "contenido_cifrado": cifrado,
        "contenido_cifrado_propio": cifrado_propio
    }); _clr()

    if res: _ok("enviado ✓")
    else: _err("error al enviar")
    input()

# ── Menú principal ─────────────────────────────────────────────────
def menu():
    while True:
        _logo()

        if not _sesion_activa():
            _linea()
            console.print("  [1] entrar/registrarse", style="cyan")
            console.print("  [0] salir", style="cyan")
            _linea()
            op = _input(">").lower()
            if op == "0":
                console.print("\n  hasta la próxima.\n", style=C_DIM)
                sys.exit(0)
            elif op == "1":
                login()
            continue

        t = Text()
        t.append("  sesión: ", style=C_DIM)
        t.append(_sesion["nick"] + "@", style=C_AZUL)
        console.print(t)
        console.print()

        _linea()
        for op in ["[1] recibidos", "[2] enviados", "[3] escribir", "[4] salir sesión", "[0] salir"]:
            console.print(f"  {op}", style="cyan")
        _linea()

        op = _input(">").lower()

        if op == "0":
            console.print("\n  hasta la próxima.\n", style=C_DIM)
            sys.exit(0)
        elif op == "1": ver_inbox("recibidos")
        elif op == "2": ver_inbox("enviados")
        elif op == "3": enviar_mensaje()
        elif op == "4": cerrar_sesion()
        else: _dim("opción inválida"); input()

if __name__ == "__main__":
    try:
        # Soporte para --responder nick (lanzado desde postear.trueque.py)
        if len(sys.argv) == 3 and sys.argv[1] == "--responder":
            nick_dest = sys.argv[2]
            login()
            if _sesion_activa():
                enviar_mensaje(destinatario_prefill=nick_dest)
        else:
            menu()
    except KeyboardInterrupt:
        console.print("\n\n  hasta la próxima.\n", style=C_DIM)
        sys.exit(0)
