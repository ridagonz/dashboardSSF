#!/usr/bin/env python3
"""
ETL Tablero General de Canales Digitales - Supersubsidio.

Lee los export nativos de cada canal desde etl/fuentes/ y produce
src/data/seed.json con el modelo normalizado que consume el tablero.

Requiere xlrd (para los .xls de LinkedIn):
    pip3 install --target ./pylibs xlrd
    PYTHONPATH=./pylibs python3 etl/build_seed.py
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "etl", "fuentes")
OUT = os.path.join(BASE, "src", "data", "seed.json")

# Fin de la ventana de datos: se usa para inferir el año en fechas sin año.
REF_END = datetime(2026, 8, 6)

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


def num(v):
    """Convierte a número tolerando '', '--', '1.234' y '1,234'."""
    if v is None:
        return 0
    s = str(v).strip().replace("%", "")
    if s in ("", "--", "-", "n/a", "N/A"):
        return 0
    try:
        return float(s)
    except ValueError:
        pass
    s2 = s.replace(".", "").replace(",", ".")
    try:
        return float(s2)
    except ValueError:
        return 0


def i(v):
    return int(round(num(v)))


def iso(dt):
    return dt.strftime("%Y-%m-%d")


def parse_es(texto, ref_end=REF_END):
    """'6 de agosto' -> ISO. Infiere el año: si el mes es posterior al de
    ref_end, la fecha pertenece al año anterior."""
    if not texto:
        return None
    m = re.match(r"\s*(\d{1,2})\s+de\s+([a-záéíóú]+)", str(texto).strip(), re.I)
    if not m:
        return None
    dia, mes_txt = int(m.group(1)), m.group(2).lower()
    mes = MESES.get(mes_txt)
    if not mes:
        return None
    anio = ref_end.year if mes <= ref_end.month else ref_end.year - 1
    try:
        return iso(datetime(anio, mes, dia))
    except ValueError:
        return None


def parse_x(texto):
    """'Thu, Aug 6, 2026' -> ISO."""
    try:
        return iso(datetime.strptime(str(texto).strip(), "%a, %b %d, %Y"))
    except ValueError:
        return None


def parse_us(texto):
    """'08/03/2026' o '03/25/2026 08:08' -> ISO (MM/DD/YYYY)."""
    s = str(texto).strip()
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y"):
        try:
            return iso(datetime.strptime(s, fmt))
        except ValueError:
            continue
    return None


def leer_csv(nombre):
    ruta = os.path.join(SRC, nombre)
    if not os.path.exists(ruta):
        print(f"  ! falta {nombre}", file=sys.stderr)
        return []
    with open(ruta, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def leer_json(nombre):
    ruta = os.path.join(SRC, nombre)
    if not os.path.exists(ruta):
        print(f"  ! falta {nombre}", file=sys.stderr)
        return {}
    with open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------------------
# X (Twitter)
# --------------------------------------------------------------------------
def build_x():
    daily_map = {}
    for nombre in ("x_overview.csv", "x_overview_agosto.csv"):
      for r in leer_csv(nombre):
        f = parse_x(r.get("Date"))
        if not f:
            continue
        daily_map[f] = {
            "fecha": f,
            "impresiones": i(r.get("Impresiones")),
            "interacciones": i(r.get("Interacciones")),
            "meGusta": i(r.get("Me gusta")),
            "comentarios": i(r.get("Respuestas")),
            "compartidos": i(r.get("Reposts")),
            "guardados": i(r.get("Guardados")),
            "seguidoresNuevos": i(r.get("Nuevos seguidores")) - i(r.get("Dejar de seguir")),
            "seguidoresAltas": i(r.get("Nuevos seguidores")),
            "seguidoresBajas": i(r.get("Dejar de seguir")),
            "visitasPerfil": i(r.get("Visitas del perfil")),
            "publicaciones": i(r.get("Crear post")),
        }
    daily = sorted(daily_map.values(), key=lambda x: x["fecha"])

    posts_map = {}
    for nombre in ("x_content.csv", "x_content_agosto.csv"):
      for r in leer_csv(nombre):
        f = parse_x(r.get("Fecha"))
        if not f:
            continue
        post = {
            "fecha": f,
            "texto": (r.get("Texto del post") or "").strip(),
            "enlace": r.get("Postear enlace") or "",
            "impresiones": i(r.get("Impresiones")),
            "interacciones": i(r.get("Interacciones")),
            "meGusta": i(r.get("Me gusta")),
            "comentarios": i(r.get("Respuestas")),
            "compartidos": i(r.get("Reposts")),
            "clicsEnlace": i(r.get("Clics en URL")),
        }
        posts_map[post["enlace"] or f'{f}|{post["texto"][:60]}'] = post
    posts = list(posts_map.values())
    posts.sort(key=lambda x: -x["impresiones"])
    return {"daily": daily, "posts": posts}


# --------------------------------------------------------------------------
# Facebook (export de Meta Business Suite)
# --------------------------------------------------------------------------
def build_facebook():
    posts = []
    for r in leer_csv("facebook_content.csv"):
        f = parse_us(r.get("Hora de publicación"))
        if not f:
            continue
        posts.append({
            "fecha": f,
            "texto": (r.get("Título") or "").strip(),
            "enlace": r.get("Enlace permanente") or "",
            "tipo": r.get("Tipo de publicación") or "Otro",
            "impresiones": i(r.get("Impresiones")),
            "interacciones": i(r.get("Interacciones")),
            "meGusta": i(r.get("Reacciones")),
            "comentarios": i(r.get("Comentarios")),
            "compartidos": i(r.get("Veces que se compartió")),
            "guardados": i(r.get("Veces que se guardó")),
            "visualizaciones": i(r.get("Visualizaciones")),
            "alcance": i(r.get("Espectadores")),
            "seguidoresNuevos": i(r.get("Seguimientos netos")),
        })

    # Serie diaria: métricas acumuladas del post atribuidas a su fecha de publicación.
    agg = defaultdict(lambda: defaultdict(int))
    for p in posts:
        d = agg[p["fecha"]]
        for k in ("impresiones", "interacciones", "meGusta", "comentarios",
                  "compartidos", "guardados", "visualizaciones", "alcance",
                  "seguidoresNuevos"):
            d[k] += p[k]
        d["publicaciones"] += 1
    daily = [dict(fecha=f, **v) for f, v in sorted(agg.items())]

    tipos = defaultdict(lambda: {"publicaciones": 0, "impresiones": 0, "interacciones": 0})
    for p in posts:
        t = tipos[p["tipo"]]
        t["publicaciones"] += 1
        t["impresiones"] += p["impresiones"]
        t["interacciones"] += p["interacciones"]
    mix = [{"nombre": k, **v} for k, v in sorted(tipos.items(), key=lambda x: -x[1]["impresiones"])]

    posts.sort(key=lambda x: -x["impresiones"])
    return {"daily": daily, "posts": posts, "mixContenido": mix}


# --------------------------------------------------------------------------
# LinkedIn (.xls BIFF de LinkedIn Page Analytics)
# --------------------------------------------------------------------------
def hojas(nombre):
    import xlrd
    ruta = os.path.join(SRC, nombre)
    if not os.path.exists(ruta):
        print(f"  ! falta {nombre}", file=sys.stderr)
        return {}
    wb = xlrd.open_workbook(ruta)
    return {sh.name: [[sh.cell_value(r, c) for c in range(sh.ncols)]
                      for r in range(sh.nrows)] for sh in wb.sheets()}


def tabla(filas, fila_encabezado):
    """Convierte una matriz en lista de dicts usando la fila indicada como encabezado."""
    if len(filas) <= fila_encabezado:
        return []
    cols = [str(c).strip() for c in filas[fila_encabezado]]
    out = []
    for fila in filas[fila_encabezado + 1:]:
        if not any(str(c).strip() for c in fila):
            continue
        out.append(dict(zip(cols, fila)))
    return out


def demografia(filas, etiqueta):
    out = []
    for r in tabla(filas, 0):
        nombre = str(r.get(etiqueta, "")).strip()
        if not nombre:
            continue
        out.append({"nombre": nombre, "valor": i(r.get("Total de seguidores"))})
    return sorted(out, key=lambda x: -x["valor"])


def build_linkedin():
    hcs = [hojas(nombre) for nombre in ("linkedin_content.xls", "linkedin_content_agosto.xls")]
    hfs = [hojas(nombre) for nombre in ("linkedin_followers.xls", "linkedin_followers_agosto.xls")]
    hv = hojas("linkedin_visitors_agosto.xls")

    daily_map = {}
    for hc in hcs:
        for r in tabla(hc.get("Indicadores", []), 1):
            f = parse_us(r.get("Fecha"))
            if not f:
                continue
            daily_map[f] = {
                "fecha": f,
                "impresiones": i(r.get("Impresiones (totales)")),
                "alcance": i(r.get("Impresiones únicas (orgánicas)")),
                "clics": i(r.get("Clics (totales)")),
                "meGusta": i(r.get("Reacciones (total)")),
                "comentarios": i(r.get("Comentarios (totales)")),
                "compartidos": i(r.get("Veces compartido (total)")),
                "tasaInteraccion": round(num(r.get("Tasa de interacción (total)")) * 100, 3),
            }
    for d in daily_map.values():
        d["interacciones"] = d["meGusta"] + d["comentarios"] + d["compartidos"] + d["clics"]

    # Seguidores diarios desde el segundo libro.
    for hf in hfs:
        for r in tabla(hf.get("Nuevos seguidores", []), 0):
            f = parse_us(r.get("Fecha"))
            if not f:
                continue
            d = daily_map.setdefault(f, {"fecha": f, "impresiones": 0, "alcance": 0,
                                         "clics": 0, "meGusta": 0, "comentarios": 0,
                                         "compartidos": 0, "tasaInteraccion": 0,
                                         "interacciones": 0})
            d["seguidoresNuevos"] = i(r.get("Total de seguidores"))
            d["seguidoresOrganicos"] = i(r.get("Seguidores generales"))
            d["seguidoresPatrocinados"] = i(r.get("Seguidores patrocinados"))
    for d in daily_map.values():
        d.setdefault("seguidoresNuevos", 0)

    daily = sorted(daily_map.values(), key=lambda x: x["fecha"])

    posts_map = {}
    for hc in hcs:
      for r in tabla(hc.get("Todas las publicaciones", []), 1):
        f = parse_us(r.get("Fecha de creación"))
        if not f:
            continue
        post = {
            "fecha": f,
            "texto": str(r.get("Título de la publicación") or "").strip(),
            "enlace": str(r.get("Enlace de la publicación") or ""),
            "tipo": str(r.get("Tipo de contenido") or "Texto/Imagen").strip() or "Texto/Imagen",
            "impresiones": i(r.get("Impresiones")),
            "visualizaciones": i(r.get("Visualizaciones")),
            "clics": i(r.get("Clics")),
            "meGusta": i(r.get("Recomendaciones")),
            "comentarios": i(r.get("Comentarios")),
            "compartidos": i(r.get("Veces compartido")),
            "tasaInteraccion": round(num(r.get("Tasa de interacción")) * 100, 2),
        }
        posts_map[post["enlace"] or f'{f}|{post["texto"][:60]}'] = post
    posts = list(posts_map.values())
    for p in posts:
        p["interacciones"] = p["meGusta"] + p["comentarios"] + p["compartidos"] + p["clics"]
    posts.sort(key=lambda x: -x["impresiones"])

    hf = hfs[-1]
    for r in tabla(hv.get("Datos de visitantes", []), 0):
        f = parse_us(r.get("Fecha"))
        if f in daily_map:
            daily_map[f]["visitasPerfil"] = i(r.get("Visualizaciones de la página general (total)"))
    total_seguidores = sum(x["valor"] for x in demografia(hf.get("Ubicación", []), "Ubicación"))

    return {
        "daily": daily,
        "posts": posts,
        "audiencia": {
            "totalUbicaciones": total_seguidores,
            "ubicacion": demografia(hf.get("Ubicación", []), "Ubicación")[:12],
            "funcionLaboral": demografia(hf.get("Función laboral", []), "Función laboral")[:10],
            "nivel": demografia(hf.get("Nivel de responsabilidad", []), "Nivel de responsabilidad"),
            "sector": demografia(hf.get("Sector", []), "Sector")[:10],
            "tamanoEmpresa": demografia(hf.get("Tamaño de la empresa", []), "Tamaño de la empresa"),
        },
    }


# --------------------------------------------------------------------------
# TikTok
# --------------------------------------------------------------------------
def build_tiktok():
    hist = {}
    for r in leer_csv("tiktok_follower_history.csv"):
        f = parse_es(r.get("Date"))
        if f:
            hist[f] = {
                "total": i(r.get("Followers")),
                "delta": i(r.get("Difference in followers from previous day")),
            }

    daily = []
    for r in leer_csv("tiktok_overview.csv"):
        f = parse_es(r.get("Date"))
        if not f:
            continue
        h = hist.get(f, {})
        me_gusta = i(r.get("Likes"))
        comentarios = i(r.get("Comments"))
        compartidos = i(r.get("Shares"))
        daily.append({
            "fecha": f,
            "visualizaciones": i(r.get("Video Views")),
            "impresiones": i(r.get("Video Views")),
            "visitasPerfil": i(r.get("Profile Views")),
            "meGusta": me_gusta,
            "comentarios": comentarios,
            "compartidos": compartidos,
            "interacciones": me_gusta + comentarios + compartidos,
            "seguidoresNuevos": h.get("delta", 0),
            "seguidoresTotal": h.get("total", 0),
        })
    daily.sort(key=lambda x: x["fecha"])

    posts = []
    for r in leer_csv("tiktok_content.csv"):
        f = parse_es(r.get("Post time"))
        if not f:
            continue
        me_gusta = i(r.get("Total likes"))
        comentarios = i(r.get("Total comments"))
        compartidos = i(r.get("Total shares"))
        posts.append({
            "fecha": f,
            "texto": (r.get("Video title") or "").strip(),
            "enlace": r.get("Video link") or "",
            "tipo": "Video",
            "visualizaciones": i(r.get("Total views")),
            "impresiones": i(r.get("Total views")),
            "meGusta": me_gusta,
            "comentarios": comentarios,
            "compartidos": compartidos,
            "interacciones": me_gusta + comentarios + compartidos,
        })
    posts.sort(key=lambda x: -x["visualizaciones"])

    # Actividad por hora: promedio de seguidores activos (se ignoran horas sin dato).
    por_hora = defaultdict(list)
    for r in leer_csv("tiktok_follower_activity.csv"):
        v = i(r.get("Active followers"))
        if v > 0:
            por_hora[i(r.get("Hour"))].append(v)
    actividad = [{"hora": h, "valor": int(sum(v) / len(v))}
                 for h, v in sorted(por_hora.items()) if v]

    genero = [{"nombre": {"Male": "Hombres", "Female": "Mujeres"}.get(r.get("Gender"), "Otro"),
               "valor": round(num(r.get("Distribution")) * 100, 1)}
              for r in leer_csv("tiktok_follower_gender.csv")]
    genero = [g for g in genero if g["valor"] > 0]

    paises = {"CO": "Colombia", "US": "Estados Unidos", "AR": "Argentina",
              "EC": "Ecuador", "ES": "España", "CL": "Chile", "BR": "Brasil",
              "MX": "México", "BD": "Bangladés", "VE": "Venezuela",
              "PE": "Perú", "Others": "Otros"}
    territorios = [{"nombre": paises.get(r.get("Top territories"), r.get("Top territories")),
                    "valor": round(num(r.get("Distribution")) * 100, 1)}
                   for r in leer_csv("tiktok_follower_territories.csv")]
    territorios.sort(key=lambda x: -x["valor"])

    return {
        "daily": daily,
        "posts": posts,
        # Datos de perfil tomados del panel de TikTok Analytics (screenshot 06/08/2026).
        "perfil": {
            "usuario": "supersubsidio",
            "meGustaAcumulados": 117000,
            "siguiendo": 32,
        },
        "audiencia": {
            "seguidoresTotal": daily[-1]["seguidoresTotal"] if daily else 0,
            "actividadPorHora": actividad,
            "genero": genero,
            "territorios": territorios,
        },
    }


# --------------------------------------------------------------------------
# Instagram — captura manual de los insights de cada publicación.
# --------------------------------------------------------------------------
def build_instagram():
    fuente = leer_json("instagram_julio_2026.json")
    posts = fuente.get("publicaciones", [])
    if not posts:
        return {
            "modo": "manual", "sinDatos": True,
            "periodo": {"desde": None, "hasta": None},
            "perfil": {"usuario": "supersubsidio", "seguidores": 0,
                       "meGustaAcumulados": 0, "siguiendo": 0},
            "resumen": {
                "visualizaciones": 0, "visualizacionesVar": 0,
                "alcance": 0, "alcanceVar": 0,
                "interacciones": 0, "interaccionesVar": 0,
                "visitasPerfil": 0, "visitasPerfilVar": 0,
                "meGusta": 0, "comentarios": 0, "compartidos": 0,
                "guardados": 0, "seguidoresNuevos": 0,
            },
            "porFormato": [], "origenAudiencia": [],
            "publicaciones": [], "historias": [],
        }

    campos_suma = ("visualizaciones", "espectadores", "interacciones", "meGusta",
                   "comentarios", "compartidos", "guardados", "cuentasInteractuaron")
    totales = {campo: sum(i(p.get(campo)) for p in posts) for campo in campos_suma}

    formatos = defaultdict(lambda: {"publicaciones": 0, "visualizaciones": 0})
    seguidores_ponderados = 0.0
    for p in posts:
        formato = formatos[p.get("tipo") or "Otro"]
        formato["publicaciones"] += 1
        formato["visualizaciones"] += i(p.get("visualizaciones"))
        seguidores_ponderados += (
            i(p.get("visualizaciones")) * num(p.get("audienciaSeguidoresPct")) / 100
        )

    visualizaciones = totales["visualizaciones"]
    pct_seguidores = round(
        seguidores_ponderados / visualizaciones * 100, 1
    ) if visualizaciones else 0
    por_formato = [
        {
            "nombre": nombre,
            "publicaciones": valores["publicaciones"],
            "porcentaje": round(valores["visualizaciones"] / visualizaciones * 100, 1),
            "visualizaciones": valores["visualizaciones"],
        }
        for nombre, valores in sorted(
            formatos.items(), key=lambda x: -x[1]["visualizaciones"]
        )
    ]

    return {
        "modo": "manual",
        "sinDatos": False,
        "periodo": fuente.get("periodo", {"desde": "2026-07-01", "hasta": "2026-07-31"}),
        "perfil": {"usuario": "supersubsidio", "seguidores": 0,
                   "meGustaAcumulados": 0, "siguiendo": 0},
        "resumen": {
            "visualizaciones": visualizaciones, "visualizacionesVar": 0,
            "alcance": totales["espectadores"], "alcanceVar": 0,
            "interacciones": totales["interacciones"], "interaccionesVar": 0,
            "visitasPerfil": 0, "visitasPerfilVar": 0,
            "meGusta": totales["meGusta"],
            "comentarios": totales["comentarios"],
            "compartidos": totales["compartidos"],
            "guardados": totales["guardados"],
            "seguidoresNuevos": 0,
        },
        "porFormato": por_formato,
        "origenAudiencia": [
            {"nombre": "Seguidores", "porcentaje": pct_seguidores},
            {"nombre": "No seguidores", "porcentaje": round(100 - pct_seguidores, 1)},
        ],
        "publicaciones": sorted(
            posts, key=lambda p: (-i(p.get("visualizaciones")), p.get("fecha", ""))
        ),
        "historias": [],
    }


# --------------------------------------------------------------------------
# SEO — Semrush Monthly (www.ssf.gov.co), informe generado en septiembre 2026
# --------------------------------------------------------------------------
def build_seo():
    return {
        "modo": "manual",
        "dominio": "www.ssf.gov.co",
        "periodo": {"etiqueta": "Julio 2026", "generado": "2026-09-02"},
        "trafico": {
            "visitas": 33600, "visitasVar": 12.76,
            "visitantesUnicos": 26300, "visitantesUnicosVar": 23.93,
            "paginasPorVisita": 3.77, "paginasPorVisitaVar": 73.08,
            "duracionMediaSeg": 468, "duracionMediaVar": 48.57,
            "porcentajeRebote": 38.11, "porcentajeReboteVar": -39.51,
        },
        "canales": [
            {"nombre": "Tráfico orgánico", "valor": 20818, "porcentaje": 63},
            {"nombre": "Directo", "valor": 10378, "porcentaje": 31},
            {"nombre": "De referencia", "valor": 1813, "porcentaje": 5},
            {"nombre": "Tráfico social orgánico", "valor": 59, "porcentaje": 0},
            {"nombre": "Tráfico de pago", "valor": 0, "porcentaje": 0},
            {"nombre": "Email", "valor": 0, "porcentaje": 0},
        ],
        "paises": [
            {"nombre": "Colombia", "porcentaje": 80.31, "visitas": 27000, "escritorio": 50.19, "movil": 49.81},
            {"nombre": "Bangladés", "porcentaje": 15.43, "visitas": 5200, "escritorio": 100.0, "movil": 0},
            {"nombre": "Estados Unidos", "porcentaje": 1.68, "visitas": 565, "escritorio": 100.0, "movil": 0},
            {"nombre": "España", "porcentaje": 1.03, "visitas": 348, "escritorio": 100.0, "movil": 0},
            {"nombre": "Brasil", "porcentaje": 0.54, "visitas": 180, "escritorio": 100.0, "movil": 0},
        ],
        "marca": {"conMarca": 0.0, "sinMarca": 100.0},
        "backlinks": {
            "total": 21200, "dominiosReferencia": 846, "ipsReferencia": 1000,
            "tipos": [
                {"nombre": "Imagen", "valor": 13600, "porcentaje": 70.95},
                {"nombre": "Texto", "valor": 5600, "porcentaje": 29.05},
                {"nombre": "Formulario", "valor": 0, "porcentaje": 0},
                {"nombre": "Marco", "valor": 0, "porcentaje": 0},
            ],
        },
    }


def main():
    print("Construyendo seed.json ...")
    data = {
        "generado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "entidad": "Superintendencia del Subsidio Familiar",
        "redes": {
            "x": build_x(),
            "facebook": build_facebook(),
            "instagram": build_instagram(),
            "linkedin": build_linkedin(),
            "tiktok": build_tiktok(),
        },
        "seo": build_seo(),
    }

    for nombre, red in data["redes"].items():
        if "daily" in red:
            d = red["daily"]
            rango = f"{d[0]['fecha']} → {d[-1]['fecha']}" if d else "sin datos"
            print(f"  {nombre:10} {len(d):>4} días  {len(red.get('posts', [])):>4} posts   {rango}")
        else:
            print(f"  {nombre:10} (manual, desde screenshots)")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"OK -> {OUT}  ({os.path.getsize(OUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
