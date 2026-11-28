"""Conector: índice de precios al consumidor (BCRD), general y subyacente.

Archivos: ipc_base_2019-2020.xls (general, mensual desde 1984) e ipc_subyacente_base_2019-2020.xlsx
(subyacente, mensual desde 2000). Base: octubre 2019 – septiembre 2020 = 100.
Se guardan los valores publicados (índice y variaciones); no se recalcula nada.
Página de la fuente: https://www.bancentral.gov.do/a/d/2534-precios
"""
from __future__ import annotations

from pathlib import Path

from ..nucleo import Documento, Lote, Obs, Serie, fin_de_mes, mes, numero

FUENTE = 'bcrd_ipc'
URL = 'https://www.bancentral.gov.do/a/d/2534-precios'
BASE = 'https://cdn.bancentral.gov.do/documents/estadisticas/precios/documents/'
URL_GENERAL = BASE + 'ipc_base_2019-2020.xls'
URL_SUBYACENTE = BASE + 'ipc_subyacente_base_2019-2020.xlsx'
UNIDAD_INDICE = 'índice (oct 2019 – sep 2020 = 100)'

# medida: (columna del índice, columnas de variación mensual, acumulada, interanual)
VARIABLES = [('indice', 'Índice', UNIDAD_INDICE), ('var_mensual', 'variación mensual', '%'),
             ('var_acumulada', 'variación acumulada desde diciembre', '%'), ('var_interanual', 'variación interanual', '%')]


def series(tipo: str) -> list[Serie]:
    pref, nom = ('bcrd.ipc', 'IPC general') if tipo == 'general' else ('bcrd.ipc_sub', 'IPC subyacente')
    return [Serie(codigo=f'{pref}.{v}', nombre=f'{nom}, {n}' if v != 'indice' else f'{nom}, índice', categoria='inflacion',
                  variable=f'{pref.split(".")[1]}_{v}', unidad=u, frecuencia='mensual', agregacion='dato', fuente=FUENTE,
                  institucion='bcrd', url=URL) for v, n, u in VARIABLES]


def _filas(ruta: Path) -> list[list]:
    if ruta.suffix.lower() == '.xls':
        import xlrd
        hoja = xlrd.open_workbook(ruta).sheet_by_index(0)
        return [hoja.row_values(i) for i in range(hoja.nrows)]
    import openpyxl
    ws = openpyxl.load_workbook(ruta, data_only=True, read_only=True).worksheets[0]
    return [list(r) for r in ws.iter_rows(values_only=True)]


def leer(ruta: Path, captura: str, tipo: str, url_archivo: str | None = None) -> Lote:
    """tipo: 'general' (xls) o 'subyacente' (xlsx). Las columnas son las mismas: año, mes, índice, mensual, acumulada, interanual."""
    filas = _filas(ruta)
    titulo = ' '.join(str(c) for r in filas[:4] for c in r if c)
    esperado = 'Subyacente' if tipo == 'subyacente' else 'Serie Mensual'
    if 'Índice de Precios al Consumidor' not in titulo or esperado not in titulo or 'Octubre 2019 - Septiembre 2020=100' not in titulo:
        raise ValueError(f'El archivo cambió de formato o de base: «{titulo[:160]}»')
    url = url_archivo or (URL_SUBYACENTE if tipo == 'subyacente' else URL_GENERAL)
    lote = Lote(FUENTE, Documento(FUENTE, f'ipc_{tipo}', ruta.name, ruta, url, None, captura), series=series(tipo))
    pref = 'bcrd.ipc' if tipo == 'general' else 'bcrd.ipc_sub'
    anio = None
    for r in filas:
        a = r[0]
        if isinstance(a, str) and a.strip().isdigit():
            a = int(a.strip())
        if isinstance(a, (int, float)) and 1980 < a < 2100:
            anio = int(a)
        m = mes(r[1]) if len(r) > 1 else None
        if anio is None or m is None:
            continue
        f = fin_de_mes(anio, m)
        for (var, _, _), col in zip(VARIABLES, (2, 3, 4, 5)):
            v, txt = numero(r[col])
            if v is None:
                continue
            rev = None
            if var == 'indice' and v <= 0:
                rev = 'indice_no_positivo'
            elif var == 'var_mensual' and abs(v) > 15 and anio > 2005:
                rev = 'variacion_atipica'
            lote.obs.append(Obs(f'{pref}.{var}', f, v, txt, revisar=rev))
    if not lote.obs:
        raise ValueError('No se leyó ningún dato del IPC')
    lote.validar_basico()
    return lote
