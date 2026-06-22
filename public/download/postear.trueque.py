#!/usr/bin/env python3
# postear.trueque.py — cliente de consola para poste.ar 24/7 tt (trueque)
# uso:  python3 postear.trueque.py
# deps: pip install requests rich

import sys, re, os, subprocess

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
    t.append("tt", style=C_NARANJA)
    t.append("  trueque", style=C_DIM)
    console.print(t)
    console.print("  avisos de trueque · se borra cada lunes", style=C_DIM)
    console.print()

def _linea(c="-"):
    console.print("  " + c * (ANCHO - 4), style=C_BORDE)

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
def _cargar_avisos():
    try:
        r = requests.get(f"{API}/trueque/api/avisos", timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _err("sin conexión a poste.ar")
        return None
    except Exception:
        _err("error al cargar avisos")
        return None

# ── Renderizado ────────────────────────────────────────────────────
def _formatear_fecha(fecha):
    if not fecha:
        return ""
    return (fecha or "")[:16]

def _nick_de_etiqueta(etiqueta):
    if not etiqueta:
        return "?"
    return etiqueta.split("@")[0].strip()

def _renderizar_avisos(avisos, filtro=""):
    if filtro:
        avisos = [a for a in avisos
                  if filtro.lower() in (a.get("contenido_trueque") or "").lower()]

    if not avisos:
        _dim("sin avisos." if not filtro else "sin resultados.")
        console.print()
        return

    ancho_interior = ANCHO - 4
    ancho_texto    = ancho_interior - 5
    total          = len(avisos)

    for i, a in enumerate(avisos):
        nick   = _nick_de_etiqueta(a.get("etiqueta", ""))
        fecha  = _formatear_fecha(a.get("fecha", ""))
        texto  = (a.get("contenido_trueque") or "").strip()
        num    = total - i

        # Cabecera con número y nick
        cabecera = f"#{'0' if num < 10 else ''}{num}  "
        linea_top = "+-- " + cabecera + fecha + " " + "-" * max(0, ancho_interior - len(cabecera) - len(fecha) - 4) + "+"
        console.print(f"  {linea_top}", style=C_FECHA)

        # Nick clickeable (en consola, mostramos instrucción)
        t = Text()
        t.append("  |  ", style=C_BORDE)
        t.append(f"{nick}@", style=C_NARANJA)
        console.print(t)

        # Texto del aviso con word wrap
        palabras = texto.split()
        linea_actual = ""
        for palabra in palabras:
            while len(palabra) > ancho_texto:
                espacio = ancho_texto - len(linea_actual) - (1 if linea_actual else 0)
                if espacio > 4:
                    trozo = palabra[:espacio - 1]
                    console.print(f"  |  {(linea_actual + ' ' + trozo).strip()}-")
                    palabra = palabra[espacio - 1:]
                    linea_actual = ""
                else:
                    if linea_actual:
                        console.print(f"  |  {linea_actual}")
                    linea_actual = ""
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
def timeline(avisos=None, filtro=""):
    _logo()

    if avisos is None:
        _status("cargando avisos…")
        avisos = _cargar_avisos()
        _clr()

    if avisos is None:
        _linea()
        _dim("no se pudo conectar.")
        _linea()
    else:
        total = len(avisos)
        if filtro:
            visibles = [a for a in avisos
                        if filtro.lower() in (a.get("contenido_trueque") or "").lower()]
            _dim(f"{len(visibles)} de {total} avisos · filtro: {filtro}")
        else:
            _dim(f"{total} aviso{'s' if total != 1 else ''} esta semana")
        console.print()
        _renderizar_avisos(avisos, filtro)
        _linea()

    opciones_tt = ["[1] actualizar", "[2] buscar", "[0] salir"]
    for op in opciones_tt:
        console.print(f"  {op}", style="cyan")
    console.print("  \[r] usuario", style="cyan")
    _linea()

    return avisos

# ── Buscar ─────────────────────────────────────────────────────────
def buscar():
    _logo()
    console.print("  ── buscar ──\n", style=C_DIM)
    termino = _input("buscar >")
    return termino

# ── Loop principal ─────────────────────────────────────────────────
def menu():
    avisos = None
    filtro = ""

    while True:
        avisos = timeline(avisos, filtro)

        op = _input(">").lower()

        if op == "0":
            console.print("\n  hasta la próxima.\n", style=C_DIM)
            sys.exit(0)

        elif op == "1":
            avisos = None
            filtro = ""

        elif op == "2":
            filtro = buscar()

        elif op == "r" or op.startswith("r "):
            nick_dest = op[2:].strip() if op.startswith("r ") else _input("nick >").lower()
            if nick_dest:
                # Buscar micro en la misma carpeta que este script
                base = os.path.dirname(os.path.abspath(__file__))
                script = os.path.join(base, "postear.micro.py")
                if not os.path.exists(script):
                    # Intentar en el directorio actual
                    script = os.path.abspath("postear.micro.py")
                if os.path.exists(script):
                    subprocess.run([sys.executable, script, "--responder", nick_dest])
                else:
                    _err("postear.micro.py no encontrado")
                    _dim("asegurate de tener ambos scripts en la misma carpeta")
                    input()
            else:
                _dim("escribí: r nick")
                input()

        else:
            _dim("opción inválida")
            input()

if __name__ == "__main__":
    try:
        menu()
    except KeyboardInterrupt:
        console.print("\n\n  hasta la próxima.\n", style=C_DIM)
        sys.exit(0)
