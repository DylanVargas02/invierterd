"""Conector: tasa de política monetaria y facilidades permanentes (BCRD).

Archivo: Serie_TPM.xlsx, hoja «Tasas». Una fila por mes desde 2004; el año aparece solo en enero.
El archivo expresa las tasas en fracción (0.055); aquí se guardan en % anual (5.50) para usar la
misma unidad que el resto de tasas. Cada mes usa el último día del mes como fecha de referencia.
Página de la fuente: https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero
"""
from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import openpyxl

from ..nucleo import Documento, Lote, Obs, Pendiente, Serie, fin_de_mes, mes, numero

FUENTE = 'bcrd_tpm'
URL = 'https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero'
URL_ARCHIVO = 'https://cdn.bancentral.gov.do/documents/estadisticas/sector-monetario-y-financiero/documents/Serie_TPM.xlsx'
NOTA = 'El archivo publica fracciones (0.055); se guardan en % anual (5.50).'

COLUMNAS = {  # índice de columna: (código, nombre)
    2: ('bcrd.tpm', 'Tasa de política monetaria'),
    3: ('bcrd.tpm.facilidad_deposito', 'Facilidad permanente de depósito'),
    4: ('bcrd.tpm.facilidad_prestamo', 'Facilidad permanente de préstamo'),
    5: ('bcrd.tpm.lombarda', 'Tasa lombarda (hasta enero de 2013)'),
}


def series() -> list[Serie]:
    return [Serie(codigo=c, nombre=n, categoria='tasa_politica', variable=c.split('.', 1)[1].replace('.', '_'), unidad='% anual',
                  frecuencia='mensual', agregacion='fin_de_periodo', fuente=FUENTE, institucion='bcrd', moneda='DOP',
                  url=URL, notas=NOTA) for c, n in COLUMNAS.values()]


def leer(ruta: Path, captura: str, url_archivo: str | None = URL_ARCHIVO) -> Lote:
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    if 'Tasas' not in wb.sheetnames:
        raise ValueError('El archivo cambió de formato: falta la hoja «Tasas»')
    filas = list(wb['Tasas'].iter_rows(values_only=True))
    enc = [str(c or '').strip() for c in filas[4]]
    if enc[:3] != ['Año', 'Mes', 'Tasa de Política Monetaria']:
        raise ValueError(f'El archivo cambió de formato: encabezado {enc[:4]}')
    lote = Lote(FUENTE, Documento(FUENTE, 'tpm', ruta.name, ruta, url_archivo, None, captura), series=series())
    anio, vistos = None, {}
    for i, r in enumerate(filas[6:], start=7):
        if isinstance(r[0], (int, float)) and 1990 < r[0] < 2100:
            anio = int(r[0])
        m = mes(r[1])
        if anio is None or m is None:
            continue
        f = fin_de_mes(anio, m)
        for col, (cod, _) in COLUMNAS.items():
            v, txt = numero(r[col] if col < len(r) else None)
            if v is None:
                continue
            pct = (v * 100).quantize(Decimal('0.0001')).normalize()
            if (cod, f) in vistos:  # el mismo mes dos veces: vale el último (vigente al cierre)
                lote.pendientes.append(Pendiente(f'{cod} {f}', 'mes_repetido', f'El mes aparece dos veces (filas {vistos[(cod, f)]} y {i}).',
                                                 'Se toma la última fila como vigente al cierre del mes.'))
                lote.obs = [o for o in lote.obs if not (o.serie == cod and o.fecha_ref == f)]
            vistos[(cod, f)] = i
            rev = 'fuera_de_rango' if not (0 <= pct <= 60) else None
            lote.obs.append(Obs(cod, f, pct, txt, revisar=rev))
    if not lote.obs:
        raise ValueError('No se leyó ninguna tasa')
    lote.validar_basico()
    return lote
