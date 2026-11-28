"""Conector: tasa de cambio del dólar de referencia del mercado spot (BCRD).

Archivo: TASA_DOLAR_REFERENCIA_MC.xlsx, con 7 hojas (diaria, promedios y fin de período mensual,
trimestral y anual). Unidad: pesos dominicanos por dólar. Compra y venta son series distintas.
Página de la fuente: https://www.bancentral.gov.do/SectorExterno/HistoricoTasas

Convención de fechas: un dato diario usa su día; un dato de período usa el último día del período
(octubre de 2026 → 2026-10-31), y la serie dice si es promedio o fin de período.
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import openpyxl

from ..nucleo import Documento, Lote, Obs, Pendiente, Serie, fin_de_mes, mes, numero

FUENTE = 'bcrd_tipo_cambio'
URL = 'https://www.bancentral.gov.do/SectorExterno/HistoricoTasas'
TRIM = {'enero-marzo': 3, 'abril-junio': 6, 'julio-septiembre': 9, 'octubre-diciembre': 12}

HOJAS = {  # hoja: (sufijo de serie, frecuencia, agregación, columnas de período)
    'Diaria': ('diaria', 'diaria', 'dato', 'ymd'),
    'PromMensual': ('prom_mensual', 'mensual', 'promedio', 'ym'),
    'PromTrimestral': ('prom_trimestral', 'trimestral', 'promedio', 'yq'),
    'PromAnual': ('prom_anual', 'anual', 'promedio', 'y'),
    'FPMensual': ('fin_mensual', 'mensual', 'fin_de_periodo', 'ym'),
    'FPTrimestral': ('fin_trimestral', 'trimestral', 'fin_de_periodo', 'yq'),
    'FPAnual': ('fin_anual', 'anual', 'fin_de_periodo', 'y'),
}
NOMBRE_AGG = {'dato': '', 'promedio': ', promedio', 'fin_de_periodo': ', último día laborable'}


def series() -> list[Serie]:
    out = []
    for hoja, (suf, frec, agg, _) in HOJAS.items():
        for lado in ('compra', 'venta'):
            out.append(Serie(
                codigo=f'bcrd.usd_dop.{lado}.{suf}', nombre=f'Dólar, tasa de {lado} del mercado spot ({frec}{NOMBRE_AGG[agg]})',
                categoria='tipo_cambio', variable=f'usd_dop_{lado}', unidad='DOP por USD', frecuencia=frec,
                agregacion=agg, fuente=FUENTE, institucion='bcrd', moneda='USD', tipo_tasa=lado, url=URL))
    return out


def leer(ruta: Path, captura: str, url_archivo: str | None = None) -> Lote:
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    faltan = set(HOJAS) - set(wb.sheetnames)
    if faltan:
        raise ValueError(f'El archivo cambió de formato: faltan las hojas {sorted(faltan)}')
    doc = Documento(FUENTE, 'tipo_cambio_usd', ruta.name, ruta, url_archivo, None, captura)
    lote = Lote(FUENTE, doc, series=series())
    fines_de_semana, compra_mayor, etiquetas = [], [], []
    ultima = None
    for hoja, (suf, frec, agg, per) in HOJAS.items():
        ws = wb[hoja]
        encabezado = [str(c).strip() if c else '' for c in next(ws.iter_rows(min_row=3, max_row=3, values_only=True))]
        esperado = {'ymd': ['Año', 'Mes', 'Día', 'Compra', 'Venta'], 'ym': ['Año', 'Mes', 'Compra', 'Venta'],
                    'yq': ['Año', 'Trimestre', 'Compra', 'Venta'], 'y': ['Año', 'Compra', 'Venta']}[per]
        if encabezado[:len(esperado)] != esperado:
            raise ValueError(f'Hoja {hoja}: encabezado inesperado {encabezado[:len(esperado)]}')
        for i, r in enumerate(ws.iter_rows(min_row=4, values_only=True), start=4):
            if r[0] is None:
                continue
            y = int(r[0])
            if per == 'ymd':
                m = mes(r[1])
                f = dt.date(y, m, int(r[2]))
                c, v = r[3], r[4]
                if str(r[1]) != str(r[1]).strip():
                    etiquetas.append(f'{hoja} fila {i}')
            elif per == 'ym':
                m = mes(r[1])
                if m is None:
                    raise ValueError(f'Hoja {hoja} fila {i}: mes ilegible {r[1]!r}')
                f, c, v = fin_de_mes(y, m), r[2], r[3]
                if str(r[1]).strip() not in ('Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'):
                    etiquetas.append(f'{hoja} fila {i} ({str(r[1]).strip()!r})')
            elif per == 'yq':
                f, c, v = fin_de_mes(y, TRIM[str(r[1]).strip().lower()]), r[2], r[3]
            else:
                f, c, v = dt.date(y, 12, 31), r[1], r[2]
            nc, _ = numero(c)
            nv, _ = numero(v)
            if nc is None or nv is None:
                raise ValueError(f'Hoja {hoja} fila {i}: valor no numérico')
            rev = []
            if per == 'ymd' and f.weekday() >= 5:
                rev.append('dato en fin de semana')
                fines_de_semana.append(f)
            if nc > nv:
                rev.append('compra mayor que venta')
                compra_mayor.append(f'{hoja} {f}')
            nota = '; '.join(rev) or None
            lote.obs.append(Obs(f'bcrd.usd_dop.compra.{suf}', f, nc, revisar=nota))
            lote.obs.append(Obs(f'bcrd.usd_dop.venta.{suf}', f, nv, revisar=nota))
            if per == 'ymd':
                ultima = max(ultima or f, f)
    doc.fecha_publicacion = ultima
    if fines_de_semana:
        por_anio = {}
        for d in fines_de_semana:
            por_anio[d.year] = por_anio.get(d.year, 0) + 1
        lote.pendientes.append(Pendiente('Diaria', 'fecha_habil',
            f'{len(fines_de_semana)} observaciones en sábado o domingo ({", ".join(f"{k}: {v}" for k, v in sorted(por_anio.items()))}).',
            'Conservar y confirmar con el BCRD si son datos de días con operaciones especiales.'))
    if compra_mayor:
        lote.pendientes.append(Pendiente(', '.join(compra_mayor), 'compra_menor_que_venta',
            'La tasa de compra es mayor que la de venta.', 'Posible error de digitación; no se corrige sin confirmación.'))
    if etiquetas:
        lote.pendientes.append(Pendiente(f'{len(etiquetas)} celdas', 'etiqueta_de_mes',
            'Etiquetas de mes con espacio al final o en inglés; se leyeron bien y no afectan el valor. Ejemplos: ' + ', '.join(etiquetas[:3]) + '.',
            'Ninguna: se normaliza al leer.'))
    lote.validar_basico()
    return lote
