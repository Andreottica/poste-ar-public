#!/usr/bin/env python3
# public.py — cliente de consola para postear 24/7 públic
# uso:  python3 public.py
# deps: pip install requests rich

import sys, re
import requests
from rich.console import Console
from rich.text    import Text

API   = "https://poste.ar"
ANCHO = 66

console = Console(width=ANCHO)

# ── Colores ────────────────────────────────────────────────────────
C_DIM    = "dim"
C_OK     = "bold green"
C_ERR    = "bold red"
C_FECHA  = "bold cyan"
C_BORDE  = "dim white"
C_TITULO = "bold white"
C_AZUL   = "bold blue"
C_NARANJA = "bold yellow"

# ── UI primitivas ──────────────────────────────────────────────────
def _logo():
    console.clear()
    console.print()
    t = Text()
    t.append("  postear ", style=C_TITULO)
    t.append("24/7 ", style=C_AZUL)
    t.append("pp", style=C_NARANJA)
    t.append("  públic", style=C_DIM)
    console.print(t)
    console.print("  escribís y leés sin usuario", style=C_DIM)
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

# ── API ────────────────────────────────────────────────────────────
def _cargar_posts():
    try:
        r = requests.get(f"{API}/micro/api/posts", timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _err("sin conexión a poste.ar")
        return None
    except Exception:
        _err("error al cargar posts")
        return None

def _publicar(contenido):
    try:
        r = requests.post(
            f"{API}/micro/api/post",
            json={"contenido": contenido},
            timeout=10
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _err("sin conexión a poste.ar")
        return None
    except Exception as e:
        _err(f"error al publicar: {e}")
        return None

# ── Timeline ───────────────────────────────────────────────────────
def _limpiar(texto):
    # Eliminar tags HTML simples
    return re.sub(r"<[^>]+>", "", texto).strip()

def _renderizar_posts(posts, filtro=""):
    if filtro:
        posts = [p for p in posts if filtro.lower() in p.get("contenido","").lower()]

    if not posts:
        _dim("sin posts." if not filtro else "sin resultados.")
        console.print()
        return

    ancho_interior = ANCHO - 4
    ancho_texto    = ancho_interior - 5  # "|  " + texto + " "

    for p in reversed(posts):
        fecha     = (p.get("fecha") or "")[:16]
        contenido = _limpiar(p.get("contenido", ""))

        linea_top = "+-- " + fecha + " " + "-" * max(0, ancho_interior - len(fecha) - 4) + "+"
        console.print(f"  {linea_top}", style=C_FECHA)

        # Wrap que respeta URLs largas cortándolas con guión si no entran
        palabras = contenido.split()
        linea_actual = ""
        for palabra in palabras:
            # Si la palabra sola es más larga que el ancho, cortarla
            while len(palabra) > ancho_texto:
                espacio = ancho_texto - len(linea_actual) - (1 if linea_actual else 0)
                if espacio > 4:
                    trozo = palabra[:espacio - 1]
                    if linea_actual:
                        console.print(f"  |  {linea_actual} {trozo}-")
                    else:
                        console.print(f"  |  {trozo}-")
                    palabra = palabra[espacio - 1:]
                    linea_actual = ""
                else:
                    if linea_actual:
                        console.print(f"  |  {linea_actual}")
                    linea_actual = ""
            # Palabra normal
            if linea_actual and len(linea_actual) + 1 + len(palabra) > ancho_texto:
                console.print(f"  |  {linea_actual}")
                linea_actual = palabra
            else:
                linea_actual = (linea_actual + " " + palabra).strip() if linea_actual else palabra

        if linea_actual:
            console.print(f"  |  {linea_actual}")

        console.print(f"  +" + "-" * ancho_interior + "+", style=C_BORDE)
        console.print()

# ── Pantalla principal ─────────────────────────────────────────────
def timeline(posts=None, filtro=""):
    _logo()

    if posts is None:
        _status("cargando timeline…")
        posts = _cargar_posts()
        _clr()

    if posts is None:
        _linea()
        _dim("no se pudo conectar.")
        _linea()
    else:
        total = len(posts)
        if filtro:
            visibles = [p for p in posts if filtro.lower() in p.get("contenido","").lower()]
            _dim(f"{len(visibles)} de {total} posts · filtro: {filtro}")
        else:
            _dim(f"{total} post{'s' if total != 1 else ''} esta semana")
        console.print()
        _renderizar_posts(posts, filtro)
        _linea()

    opciones_pp = ["[1] postear", "[2] actualizar", "[3] buscar", "[0] salir"]
    for op in opciones_pp:
        console.print(f"  {op}", style="cyan")
    _linea()

    return posts

# ── Postear ────────────────────────────────────────────────────────
def postear():
    _logo()
    console.print("  ── nuevo post ──\n", style=C_DIM)
    console.print("  máx. 500 caracteres · enter en blanco para cancelar\n", style=C_DIM)

    _dim("pegá o escribí  ·  ok  ·  cancelar\n")
    lineas = []
    while True:
        linea = _input(">")
        if linea.lower() == "ok":
            break
        if linea.lower() == "cancelar":
            _dim("cancelado.")
            return None
        lineas.append(linea)

    texto = "\n".join(lineas).strip()
    if not texto:
        _dim("cancelado.")
        return None

    if len(texto) > 500:
        _err(f"demasiado largo ({len(texto)}/500)")
        input()
        return None

    _status("publicando…")
    res = _publicar(texto)
    _clr()

    if res:
        _ok("publicado")
    else:
        _err("error al publicar")

    input()
    return res

# ── Buscar ─────────────────────────────────────────────────────────
def buscar():
    _logo()
    console.print("  ── buscar ──\n", style=C_DIM)
    termino = _input("buscar >")
    return termino

# ── Loop principal ─────────────────────────────────────────────────
def menu():
    posts  = None
    filtro = ""

    while True:
        posts = timeline(posts, filtro)

        op = _input(">").lower()

        if op == "0":
            console.print("\n  hasta la próxima.\n", style=C_DIM)
            sys.exit(0)

        elif op == "1":
            postear()
            posts  = None
            filtro = ""

        elif op == "2":
            posts  = None
            filtro = ""

        elif op == "3":
            filtro = buscar()

        else:
            _dim("opción inválida")
            input()

if __name__ == "__main__":
    try:
        menu()
    except KeyboardInterrupt:
        console.print("\n\n  hasta la próxima.\n", style=C_DIM)
        sys.exit(0)
        
