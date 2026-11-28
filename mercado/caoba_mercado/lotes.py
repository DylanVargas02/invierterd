"""Lotes: lo que una corrida encontró de nuevo en una fuente, en un JSON que Supabase aplica.

Una corrida descarga cada archivo, calcula su huella y, si cambió, lo lee con su conector y lo compara
con la instantánea anterior (mercado/datos/*.csv). El lote lleva solo lo nuevo o cambiado. La base
vuelve a comprobar todo al aplicarlo (nunca duplica ni sobrescribe: un valor distinto entra como
versión nueva y queda para revisar), así que la instantánea es solo un atajo para no mandar de más.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
from dataclasses import asdict
from decimal import Decimal
from pathlib import Path

from .nucleo import Lote


def _txt(v) -> str:
    if v is None:
        return ''
    if isinstance(v, Decimal):
        return format(v.normalize(), 'f')
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    return str(v)


def _json(v):
    if isinstance(v, Decimal):
        return _txt(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    raise TypeError(type(v))


def filas_de(lote: Lote) -> dict[tuple[str, str], str]:
    """Contenido comparable del lote: {(tipo, clave): valor}."""
    out = {}
    for o in lote.obs:
        out[('obs', f'{o.serie}|{o.fecha_ref.isoformat()}')] = _txt(o.valor)
    for s in lote.extra.get('subastas', []):
        k = f'{s["isin"] or "-"}|{_txt(s["fecha_subasta"])}|{_txt(s["plazo_anios"])}'
        out[('sub', k)] = json.dumps({c: v for c, v in s.items() if c != 'fila_original'}, default=_json, sort_keys=True, ensure_ascii=False)
    for n in lote.extra.get('notas', []):
        out[('nota', n['isin'])] = json.dumps(n, default=_json, sort_keys=True, ensure_ascii=False)
    return out


def leer_instantanea(ruta: Path) -> dict[tuple[str, str], str]:
    if not ruta.exists():
        return {}
    with open(ruta, newline='', encoding='utf-8') as f:
        return {(r[0], r[1]): r[2] for r in csv.reader(f)}


def escribir_instantanea(ruta: Path, filas: dict[tuple[str, str], str]):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        for (t, k), v in sorted(filas.items()):
            w.writerow([t, k, v])


def armar(lote: Lote, anterior: dict, corrida: str) -> tuple[dict, dict]:
    """Devuelve (lote en JSON, filas actuales). Solo entra lo que no estaba o cambió."""
    actual = filas_de(lote)
    nuevas = {k for k in actual if k not in anterior}
    cambiadas = {k for k in actual if k in anterior and anterior[k] != actual[k]}
    desaparecidas = [k for k in anterior if k not in actual]
    obs = []
    for o in lote.obs:
        k = ('obs', f'{o.serie}|{o.fecha_ref.isoformat()}')
        if k in nuevas or k in cambiadas:
            obs.append([o.serie, o.fecha_ref.isoformat(), _txt(o.valor), o.valor_texto, o.estado, o.revisar])
    subastas = []
    for s in lote.extra.get('subastas', []):
        k = ('sub', f'{s["isin"] or "-"}|{_txt(s["fecha_subasta"])}|{_txt(s["plazo_anios"])}')
        if k in nuevas or k in cambiadas:
            subastas.append(json.loads(json.dumps(s, default=_json)))
    notas = [json.loads(json.dumps(n, default=_json)) for n in lote.extra.get('notas', []) if ('nota', n['isin']) in nuevas | cambiadas]
    usadas = {o[0] for o in obs}
    d = lote.documento
    out = {
        'formato': 1,
        'corrida': corrida,
        'fuente': lote.fuente,
        'documento': {'variable': d.variable, 'nombre': d.nombre, 'url_origen': d.url_origen,
                      'fecha_publicacion': d.fecha_publicacion.isoformat() if d.fecha_publicacion else None,
                      'fecha_captura': d.fecha_captura, 'sha256': d.sha256, 'bytes': d.bytes},
        'series': [asdict(s) for s in lote.series if s.codigo in usadas],
        'obs': obs,
        'subastas': subastas,
        'notas': notas,
        'pendientes': [asdict(p) for p in lote.pendientes],
        'resumen': {'nuevas': len(nuevas), 'cambiadas': len(cambiadas), 'desaparecidas': len(desaparecidas),
                    'ultima_observacion': max((o.fecha_ref for o in lote.obs), default=None).isoformat() if lote.obs else
                    (max(s['fecha_subasta'] for s in lote.extra['subastas']).isoformat() if lote.extra.get('subastas') else None)},
    }
    return out, actual


def guardar(lote_json: dict, carpeta: Path, nombre: str) -> tuple[Path, str]:
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / f'{nombre}.json'
    texto = json.dumps(lote_json, ensure_ascii=False, separators=(',', ':'))
    ruta.write_text(texto, encoding='utf-8')
    return ruta, hashlib.sha256(texto.encode('utf-8')).hexdigest()
