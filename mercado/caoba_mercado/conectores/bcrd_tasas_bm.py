"""Conector: tasas de interés de los bancos múltiples (BCRD), promedio ponderado del sistema.

Archivos (2017 en adelante, % nominal anual):
- tbm_pasivad.xlsx: pasivas en pesos (certificados y depósitos a plazo por plazo, ahorros, interbancaria).
- tbm-pasivad-usd.xlsx: pasivas en dólares.
- tbm_activad.xlsx: activas en pesos (por plazo y por destino).

Cada archivo trae meses cerrados y, al final, los días hábiles del mes en curso. Se guardan los meses
cerrados (fecha = último día del mes) y los días (fecha = el día). Las filas marcadas como
promedio parcial («*2026 1/», «*Noviembre 2/») no se guardan porque cambian cada día.
No son tasas por entidad: son el promedio del sistema que calcula el BCRD.
Página de la fuente: https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import openpyxl

from ..nucleo import Documento, Lote, Obs, Serie, fin_de_mes, mes, numero

FUENTE = 'bcrd_tasas_bm'
URL = 'https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero'
BASE = 'https://cdn.bancentral.gov.do/documents/estadisticas/sector-monetario-y-financiero/documents/'

PLAZOS_P = [('0_30', '0 a 30 días', 30), ('31_60', '31 a 60 días', 60), ('61_90', '61 a 90 días', 90), ('91_180', '91 a 180 días', 180),
            ('181_360', '181 a 360 días', 360), ('361_720', '361 días a 2 años', 720), ('2a_5a', '2 a 5 años', 1800), ('mas_5a', 'Más de 5 años', None)]
PLAZOS_A = [('0_90', '0 a 90 días', 90), ('91_180', '91 a 180 días', 180), ('181_360', '181 a 360 días', 360),
            ('361_720', '361 días a 2 años', 720), ('2a_5a', '2 a 5 años', 1800), ('mas_5a', 'Más de 5 años', None)]

# archivo: hoja, encabezado esperado (fila 7, desde la columna B), columnas a guardar {índice: (sufijo, nombre, plazo)}
ARCHIVOS = {
    'pasiva_dop': ('tbm_pasivad.xlsx', 'Pasivas', 'DOP', [p[1] for p in PLAZOS_P] + ['Simple', 'Ponderado'],
                   {**{i + 1: (p[0], f'certificados y depósitos a plazo, {p[1]}', p[2]) for i, p in enumerate(PLAZOS_P)},
                    10: ('ponderado', 'certificados y depósitos a plazo, promedio ponderado', None),
                    11: ('ahorros', 'depósitos de ahorro', None), 14: ('interbancaria', 'interbancaria', None)}),
    'pasiva_usd': ('tbm-pasivad-usd.xlsx', 'Pasivas', 'USD', [p[1] for p in PLAZOS_P] + ['Simple', 'Ponderado'],
                   {**{i + 1: (p[0], f'certificados y depósitos a plazo, {p[1]}', p[2]) for i, p in enumerate(PLAZOS_P)},
                    10: ('ponderado', 'certificados y depósitos a plazo, promedio ponderado', None),
                    11: ('ahorros', 'depósitos de ahorro', None)}),
    'activa_dop': ('tbm_activad.xlsx', 'Activas', 'DOP', [p[1] for p in PLAZOS_A] + ['Simple', 'Ponderado', 'Comercio', 'Consumo y/o Personales', 'Hipotecarios y/o Desarrollo'],
                   {**{i + 1: (p[0], f'préstamos, {p[1]}', p[2]) for i, p in enumerate(PLAZOS_A)},
                    8: ('ponderado', 'préstamos, promedio ponderado', None), 9: ('comercio', 'préstamos comerciales', None),
                    10: ('consumo', 'préstamos de consumo y personales', None), 11: ('hipotecario', 'préstamos hipotecarios y de desarrollo', None)}),
}
FILA_ENCABEZADO = {'pasiva_dop': 7, 'pasiva_usd': 7, 'activa_dop': 6}


def url_de(clave: str) -> str:
    return BASE + ARCHIVOS[clave][0]


def series(clave: str) -> list[Serie]:
    _, _, moneda, _, cols = ARCHIVOS[clave]
    lado = 'pasiva' if clave.startswith('pasiva') else 'activa'
    out = []
    for suf, nom, plazo in cols.values():
        for frec in ('mensual', 'diaria'):
            out.append(Serie(codigo=f'bcrd.tbm.{clave}.{suf}.{frec[:3]}', nombre=f'Bancos múltiples, tasa {lado} en {moneda}: {nom} ({frec})',
                             categoria='tasa_mercado', variable=f'tbm_{clave}_{suf}', unidad='% nominal anual', frecuencia=frec,
                             agregacion='promedio', fuente=FUENTE, institucion='bcrd', moneda=moneda, tipo_tasa=lado,
                             plazo_dias=plazo, url=URL, notas='Promedio ponderado del sistema de bancos múltiples, no una entidad.'))
    return out


def leer(ruta: Path, captura: str, clave: str, url_archivo: str | None = None) -> Lote:
    nombre, hoja, _, esperado, cols = ARCHIVOS[clave]
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    if hoja not in wb.sheetnames:
        raise ValueError(f'El archivo cambió de formato: falta la hoja «{hoja}»')
    filas = [list(r) for r in wb[hoja].iter_rows(values_only=True)]
    enc = [re.sub(r'\s+', ' ', str(c or '')).strip() for c in filas[FILA_ENCABEZADO[clave] - 1][1:1 + len(esperado)]]
    if enc != esperado:
        raise ValueError(f'El archivo cambió de formato: encabezado {enc}')
    lote = Lote(FUENTE, Documento(FUENTE, f'tasas_{clave}', ruta.name, ruta, url_archivo or url_de(clave), None, captura), series=series(clave))
    anio = m_actual = None
    parcial = False
    for r in filas[FILA_ENCABEZADO[clave]:]:
        a = r[0]
        if a is None:
            continue
        s = str(a).strip()
        fecha = None
        if isinstance(a, (int, float)) and 1990 < a < 2100 or re.fullmatch(r'\*?\s*(19|20)\d{2}(\s+\d/)?', s):
            anio = int(re.search(r'(19|20)\d{2}', s).group())  # fila del año: promedio anual, no se guarda
            continue
        if isinstance(a, (int, float)) and 1 <= a <= 31:
            if anio is None or m_actual is None:
                continue
            try:
                fecha, frec = dt.date(anio, m_actual, int(a)), 'dia'
            except ValueError:
                continue
        else:
            m = mes(re.sub(r'[\d*/]', '', s).strip().split(' ')[0]) if s else None
            if m is None:
                continue
            y = re.search(r'(19|20)\d{2}', s)
            if y:
                anio = int(y.group())
            m_actual = m
            parcial = s.startswith('*') or '2/' in s
            if parcial:
                continue
            fecha, frec = fin_de_mes(anio, m), 'men'
        for col, (suf, _, _) in cols.items():
            v, txt = numero(r[col] if col < len(r) else None)
            if v is None:
                continue
            rev = 'fuera_de_rango' if not (0 <= v <= 60) else None
            lote.obs.append(Obs(f'bcrd.tbm.{clave}.{suf}.{frec}', fecha, v, txt, revisar=rev))
    if not lote.obs:
        raise ValueError('No se leyó ninguna tasa')
    lote.validar_basico()
    return lote
