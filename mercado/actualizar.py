"""Corrida programada de Caoba Mercado (la ejecuta GitHub Actions; también sirve a mano).

Uso: python3 -I actualizar.py [--solo fuente,fuente] [--archivos carpeta]
  --archivos: usa archivos ya descargados (nombre = clave del documento + extensión) en vez de descargarlos.

Por cada documento de FUENTES: descarga con reintentos, calcula la huella; si no cambió, termina
«sin novedad». Si cambió, lo lee con su conector, arma el lote con lo nuevo y lo deja en
mercado/lotes/. Al final reescribe mercado/lotes/indice.json, que Supabase lee cada hora.
Los originales quedan en mercado/_originales/ (no se suben al repositorio; la tarea los guarda
como artefacto de la ejecución).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sys
import time
import traceback
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

from caoba_mercado import lotes  # noqa: E402
from caoba_mercado.conectores import bcrd_ipc, bcrd_notas, bcrd_tasas_bm, bcrd_tipo_cambio, bcrd_tpm  # noqa: E402
from caoba_mercado.nucleo import ZONA, sha256  # noqa: E402

TZ = ZoneInfo(ZONA)
UA = 'Mozilla/5.0 (compatible; CaobaMercado/1.0)'
GUARDAR_LOTES = 60  # cuántos lotes recientes lista el índice

# clave del documento: (fuente, url, extensión, función que lee)
FUENTES = {
    'bcrd_tipo_cambio': ('bcrd_tipo_cambio', 'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx', '.xlsx',
                         lambda r, c, u: bcrd_tipo_cambio.leer(r, c, u)),
    'bcrd_notas': ('bcrd_notas', bcrd_notas.URL_ARCHIVO, '.xlsx', lambda r, c, u: bcrd_notas.leer(r, c, dt.datetime.now(TZ).date())),
    'bcrd_tpm': ('bcrd_tpm', bcrd_tpm.URL_ARCHIVO, '.xlsx', lambda r, c, u: bcrd_tpm.leer(r, c, u)),
    'bcrd_ipc_general': ('bcrd_ipc', bcrd_ipc.URL_GENERAL, '.xls', lambda r, c, u: bcrd_ipc.leer(r, c, 'general', u)),
    'bcrd_ipc_subyacente': ('bcrd_ipc', bcrd_ipc.URL_SUBYACENTE, '.xlsx', lambda r, c, u: bcrd_ipc.leer(r, c, 'subyacente', u)),
    **{f'bcrd_tbm_{k}': ('bcrd_tasas_bm', bcrd_tasas_bm.url_de(k), Path(bcrd_tasas_bm.ARCHIVOS[k][0]).suffix,
                         (lambda k: lambda r, c, u: bcrd_tasas_bm.leer(r, c, k, u))(k)) for k in bcrd_tasas_bm.ARCHIVOS},
}


def ahora() -> str:
    return dt.datetime.now(TZ).isoformat(timespec='seconds')


def descargar(url: str, destino: Path, intentos: int = 3) -> None:
    ultimo = None
    for n in range(intentos):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                tipo = r.headers.get('Content-Type', '')
                datos = r.read()
            if 'text/html' in tipo or datos[:15].lower().startswith(b'<!doctype html'):
                raise RuntimeError('la fuente devolvió una página web en vez del archivo (posible verificación anti-bots o enlace cambiado)')
            if len(datos) < 1000:
                raise RuntimeError(f'archivo demasiado pequeño ({len(datos)} bytes)')
            destino.write_bytes(datos)
            return
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(5 * (n + 1))
    raise RuntimeError(f'no se pudo descargar tras {intentos} intentos: {ultimo}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', default='')
    ap.add_argument('--archivos', default='')
    ap.add_argument('--salida', default=str(AQUI))
    a = ap.parse_args()
    base = Path(a.salida)
    dir_lotes, dir_datos, dir_orig = base / 'lotes', base / 'datos', base / '_originales'
    for d in (dir_lotes, dir_datos, dir_orig):
        d.mkdir(parents=True, exist_ok=True)
    ruta_estado = dir_datos / 'estado.json'
    estado = json.loads(ruta_estado.read_text(encoding='utf-8')) if ruta_estado.exists() else {}
    ruta_indice = dir_lotes / 'indice.json'
    indice = json.loads(ruta_indice.read_text(encoding='utf-8')) if ruta_indice.exists() else {'formato': 1, 'lotes': [], 'corridas': []}
    inicio = ahora()
    corrida = dt.datetime.now(TZ).strftime('%Y%m%dT%H%M%S')
    solo = {s for s in a.solo.split(',') if s}
    resultados = []
    for clave, (fuente, url, ext, leer) in FUENTES.items():
        if solo and clave not in solo and fuente not in solo:
            continue
        e = estado.setdefault(clave, {'fuente': fuente, 'fallos_seguidos': 0})
        res = {'fuente': fuente, 'documento': clave, 'inicio': ahora()}
        try:
            ruta = dir_orig / f'{clave}{ext}'
            if a.archivos:
                shutil.copyfile(Path(a.archivos) / f'{clave}{ext}', ruta)
            else:
                descargar(url, ruta)
            huella = sha256(ruta)
            e['ultima_consulta'] = res['inicio']
            if huella == e.get('sha256'):
                res.update(estado='sin_novedad', mensaje='El archivo no cambió desde la última consulta.')
            else:
                lote = leer(ruta, res['inicio'], url)
                inst = dir_datos / f'{clave}.csv'
                lj, filas = lotes.armar(lote, lotes.leer_instantanea(inst), corrida)
                r = lj['resumen']
                if not (lj['obs'] or lj['subastas'] or lj['notas']):
                    res.update(estado='sin_novedad', mensaje=f'El archivo cambió pero sin datos nuevos ({r["desaparecidas"]} filas ya no aparecen).')
                else:
                    nombre = f'{corrida}_{clave}_{huella[:8]}'
                    ruta_lote, h = lotes.guardar(lj, dir_lotes, nombre)
                    indice['lotes'].append({'id': nombre, 'archivo': ruta_lote.name, 'sha256': h, 'fuente': fuente, 'documento': clave,
                                            'nuevas': r['nuevas'], 'cambiadas': r['cambiadas']})
                    res.update(estado='exito', lote=nombre, nuevos=r['nuevas'], modificados=r['cambiadas'],
                               mensaje=f'{r["nuevas"]} nuevos, {r["cambiadas"]} cambiados, {len(lj["pendientes"])} pendientes.')
                lotes.escribir_instantanea(inst, filas)
                e.update(sha256=huella, bytes=ruta.stat().st_size, ultima_observacion=r['ultima_observacion'])
            e['fallos_seguidos'] = 0
            e['estado'] = 'al_dia'
        except Exception as ex:  # noqa: BLE001
            e['fallos_seguidos'] = e.get('fallos_seguidos', 0) + 1
            e['estado'] = 'error'
            res.update(estado='fallo', mensaje=f'{type(ex).__name__}: {ex}'[:500])
            traceback.print_exc()
        e['mensaje'] = res['mensaje']
        res['fin'] = ahora()
        resultados.append(res)
        print(f'{clave}: {res["estado"]} · {res["mensaje"]}')
    # Índice: últimos lotes y últimas corridas. Supabase aplica lo que no tenga registrado.
    vigentes = indice['lotes'][-GUARDAR_LOTES:]
    for viejo in indice['lotes'][:-GUARDAR_LOTES]:
        (dir_lotes / viejo['archivo']).unlink(missing_ok=True)
    indice['lotes'] = vigentes
    indice['corridas'] = (indice.get('corridas', []) + [{'id': corrida, 'inicio': inicio, 'fin': ahora(), 'resultados': resultados}])[-30:]
    indice['estado'] = {k: v for k, v in estado.items()}
    indice['actualizado'] = ahora()
    ruta_indice.write_text(json.dumps(indice, ensure_ascii=False, indent=1), encoding='utf-8')
    ruta_estado.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding='utf-8')
    fallos = [r for r in resultados if r['estado'] == 'fallo']
    print(f'Corrida {corrida}: {len(resultados)} documentos, {len(fallos)} con fallo.')
    return 1 if fallos and len(fallos) == len(resultados) else 0


if __name__ == '__main__':
    sys.exit(main())
