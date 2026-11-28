"""Conector: histórico de resultados de subastas de Notas del Banco Central (BCRD).

Archivo: Historico_Subastas_Notas.xlsx, hoja «Detalle Notas».
Página: https://www.bancentral.gov.do/a/d/2711-notas-del-banco-central
Precios por 1 de valor nominal (0.98 = 98 %); cupón y rendimiento en fracción (0.1025 = 10.25 %).
Cada fila del archivo es una emisión (ISIN) dentro de una subasta. Se guarda tal cual, con su número
de fila, y se marcan las filas con datos dudosos; ningún valor se corrige solo.
"""
from __future__ import annotations

import datetime as dt
from decimal import Decimal
from pathlib import Path

import openpyxl

from ..nucleo import Documento, Lote, Pendiente, fecha, numero

FUENTE = 'bcrd_notas'
URL_PAGINA = 'https://www.bancentral.gov.do/a/d/2711-notas-del-banco-central'
URL_ARCHIVO = 'https://cdn.bancentral.gov.do/documents/instrumentos-de-inversion/instrumentos-operaciones-de-mercado-abierto/documents/Historico_Subastas_Notas.xlsx'
COLS = ['isin', 'plazo_anios', 'cupon', 'fecha_subasta', 'fecha_liquidacion', 'fecha_vencimiento', 'dias_al_vencimiento',
        'recibido_vn', 'recibido_precio_prom', 'adjudicado_vn', 'precio_corte', 'adjudicado_precio_prom', 'rendimiento_prom',
        'rechazado_precio_prom']


def leer(ruta: Path, captura: str, hoy: dt.date) -> Lote:
    wb = openpyxl.load_workbook(ruta, data_only=True)
    ws = wb['Detalle Notas']
    enc = [str(c.value or '').replace('\n', ' ').strip() for c in ws[7][1:15]]
    if not (enc[0].startswith('Código ISIN') and enc[3] == 'Fecha Subasta' and enc[12].startswith('Tasas de Rendimiento')):
        raise ValueError(f'El archivo cambió de formato: encabezado {enc}')
    doc = Documento(FUENTE, 'subastas_notas', ruta.name, ruta, URL_ARCHIVO, None, captura)
    lote = Lote(FUENTE, doc)
    subastas, texto_fecha, texto_num, dias_dif = [], 0, 0, []
    for i, row in enumerate(ws.iter_rows(min_row=8, values_only=True), start=8):
        v = row[1:15]
        if all(x in (None, '') for x in v):
            continue
        s = {'fila_original': i}
        rev = []
        s['isin'] = (str(v[0]).strip() or None) if v[0] else None
        for k, idx in (('fecha_subasta', 3), ('fecha_liquidacion', 4), ('fecha_vencimiento', 5)):
            f, txt = fecha(v[idx])
            if txt and f is None:
                raise ValueError(f'Fila {i}: fecha ilegible {txt!r}')
            texto_fecha += 1 if txt else 0
            s[k] = f
        desierta = any(isinstance(x, str) and 'desierta' in x.lower() for x in v)
        for k, idx in (('plazo_anios', 1), ('cupon', 2), ('dias_al_vencimiento', 6), ('recibido_vn', 7), ('recibido_precio_prom', 8),
                       ('adjudicado_vn', 9), ('precio_corte', 10), ('adjudicado_precio_prom', 11), ('rendimiento_prom', 12),
                       ('rechazado_precio_prom', 13)):
            n, txt = numero(v[idx])
            if txt and n is not None:
                texto_num += 1
            s[k] = n
        s['dias_al_vencimiento'] = int(s['dias_al_vencimiento']) if s['dias_al_vencimiento'] is not None else None
        s['estado'] = 'desierta' if desierta else ('adjudicada' if s['adjudicado_vn'] else 'sin_adjudicacion')
        # Reglas de revisión
        fs, fl, fv = s['fecha_subasta'], s['fecha_liquidacion'], s['fecha_vencimiento']
        if fs and fl and fl < fs:
            alt = None
            try:
                alt = dt.date(fl.year, fl.day, fl.month)
            except ValueError:
                pass
            ok = alt and fv and s['dias_al_vencimiento'] and abs((fv - alt).days - s['dias_al_vencimiento']) <= 1
            rev.append(f'liquidación {fl} antes de la subasta {fs}' + (f'; los días al vencimiento cuadran con {alt} (día y mes invertidos)' if ok else ''))
        elif fl and fv and s['dias_al_vencimiento'] is not None and abs((fv - fl).days - s['dias_al_vencimiento']) > 1:
            dias_dif.append(i)
            rev.append(f'días al vencimiento publicados {s["dias_al_vencimiento"]}; según las fechas {(fv - fl).days}')
        for k in ('recibido_precio_prom', 'precio_corte', 'adjudicado_precio_prom', 'rechazado_precio_prom'):
            x = s[k]
            if x is not None and x > 10:
                rev.append(f'{k} en base 100 ({x})')
            elif x is not None and x < Decimal('0.5'):
                rev.append(f'{k} = {x}: parece una tasa, no un precio')
        r = s['rendimiento_prom']
        if r is not None and r < Decimal('0.01'):
            rev.append(f'rendimiento {r} (cien veces menor que el resto)')
        if s['estado'] == 'sin_adjudicacion' and s['recibido_vn']:
            rev.append('ofertas recibidas sin adjudicación ni etiqueta «Desierta»')
        s['revisar'] = '; '.join(rev) or None
        subastas.append(s)
    # Notas: una por ISIN, con su cupón y vencimiento (comprobado: cada ISIN tiene un único par)
    notas = {}
    for s in sorted(subastas, key=lambda x: (x['fecha_subasta'], x['fila_original'])):
        if not s['isin']:
            continue
        n = notas.get(s['isin'])
        if n is None:
            notas[s['isin']] = {'isin': s['isin'], 'cupon': s['cupon'], 'vencimiento': s['fecha_vencimiento'],
                                'plazo_anios_original': s['plazo_anios'], 'primera_subasta': s['fecha_subasta'],
                                'estado': 'vigente' if s['fecha_vencimiento'] >= hoy else 'vencida'}
        elif (n['cupon'], n['vencimiento']) != (s['cupon'], s['fecha_vencimiento']):
            raise ValueError(f'El ISIN {s["isin"]} aparece con cupón o vencimiento distintos')
    vistos = set()
    for s in subastas:
        k = (s['isin'], s['fecha_subasta'])
        if s['isin'] and k in vistos:
            raise ValueError(f'ISIN repetido en la misma subasta: {k}')
        vistos.add(k)
    doc.fecha_publicacion = max(s['fecha_subasta'] for s in subastas)
    lote.extra = {'notas': list(notas.values()), 'subastas': subastas}
    marcadas = [s for s in subastas if s['revisar']]
    for s in marcadas:
        lote.pendientes.append(Pendiente(f'fila {s["fila_original"]} · {s["isin"] or "sin ISIN"} · subasta {s["fecha_subasta"]}', 'subasta_dudosa', s['revisar'],
                                         'Confirmar con el resultado publicado de esa subasta antes de corregir.'))
    if texto_fecha or texto_num:
        lote.pendientes.append(Pendiente('archivo completo', 'formato_de_celdas',
            f'{texto_fecha} fechas guardadas como texto y {texto_num} números como texto; se convirtieron al leer.', 'Ninguna.'))
    sin_isin = [s['fila_original'] for s in subastas if not s['isin']]
    if sin_isin:
        lote.pendientes.append(Pendiente(f'filas {sin_isin}', 'sin_isin', 'Subastas declaradas desiertas sin código ISIN.', 'Se guardan sin ISIN.'))
    return lote
