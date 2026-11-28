"""Conector: variación del valor cuota de fondos de inversión cerrados y fideicomisos de oferta pública (SIMV).

Datos de la BVRD publicados por la SIMV; la SIMV aclara que no están auditados formalmente por ella.
Conjunto en datos.gob.do: variacion-del-valor-cuota-de-los-instrumentos-de-renta-variable
(archivo generado en https://deepblue.simv.gob.do/api/reports/bvrd-navs).
Frecuencia mensual; el dato del mes se guarda con el último día del mes.
Cada nombre distinto es un fondo distinto hasta que se confirme un cambio de nombre.
"""
from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import openpyxl

from ..nucleo import Documento, Lote, Obs, Pendiente, Serie, fin_de_mes, mes, numero, slug

FUENTE = 'simv_fondos_cerrados'
URL_ARCHIVO = 'https://deepblue.simv.gob.do/api/reports/bvrd-navs'
URL_DATOS = 'https://datos.gob.do/dataset/variacion-del-valor-cuota-de-los-instrumentos-de-renta-variable'
MONEDA = {'RD$': 'DOP', 'USD$': 'USD', 'US$': 'USD'}
TIPO = {'Cuotas de Participacion de Fondos Cerrados': 'cerrado', 'Valores de Fideicomiso': 'fideicomiso'}
SALTO = Decimal('0.15')


def codigo_fondo(nombre: str) -> str:
    """Código estable y legible; si el nombre es muy largo se acorta y se agrega una huella corta para que no choque."""
    c = slug(nombre, 400)
    if len(c) <= 80:
        return c
    import hashlib
    return c[:71].rstrip('_') + '_' + hashlib.sha1(nombre.encode()).hexdigest()[:8]


def leer(ruta: Path, captura: str) -> Lote:
    ws = openpyxl.load_workbook(ruta, data_only=True, read_only=True).worksheets[0]
    filas = list(ws.iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(filas) if r and r[0] == 'Año')
    if list(filas[hi][:6]) != ['Año', 'Mes', 'Emisor', 'Moneda', 'Valor Cuota', 'Tipo de Instrumento']:
        raise ValueError(f'El archivo cambió de formato: {filas[hi][:6]}')
    vigencia = next((str(r[0]) for r in filas[:hi] if r and r[0] and str(r[0]).startswith('Fecha Vigencia')), None)
    doc = Documento(FUENTE, 'valor_cuota_cerrados', ruta.name, ruta, URL_ARCHIVO, None, captura)
    lote = Lote(FUENTE, doc)
    fondos, por_fondo = {}, {}
    for i, r in enumerate(filas[hi + 1:], start=hi + 2):
        if not r or all(x in (None, '') for x in r[:6]):
            continue
        nombre = str(r[2]).strip()
        y, m = int(str(r[0]).strip()), mes(r[1])
        if m is None:
            raise ValueError(f'Fila {i}: mes ilegible {r[1]!r}')
        mon, tipo = MONEDA.get(str(r[3]).strip()), TIPO.get(str(r[5]).strip())
        if not mon or not tipo:
            raise ValueError(f'Fila {i}: moneda o tipo desconocido {r[3]!r} {r[5]!r}')
        v, _ = numero(r[4])
        if v is None or v <= 0:
            raise ValueError(f'Fila {i}: valor cuota inválido {r[4]!r}')
        codigo = codigo_fondo(nombre)
        f = fondos.setdefault(codigo, {'codigo': codigo, 'nombre': nombre, 'tipo': tipo, 'moneda': mon, 'serie': f'simv.vc.{codigo}'})
        if (f['nombre'], f['moneda'], f['tipo']) != (nombre, mon, tipo):
            raise ValueError(f'Dos fondos distintos producen el mismo código {codigo}: {f["nombre"]!r} y {nombre!r}')
        por_fondo.setdefault(codigo, []).append((fin_de_mes(y, m), v))
    ultimo = max(d for L in por_fondo.values() for d, _ in L)
    saltos = []
    for codigo, L in por_fondo.items():
        f = fondos[codigo]
        L.sort()
        f['activo'] = L[-1][0] == ultimo
        lote.series.append(Serie(f['serie'], f'Valor cuota · {f["nombre"]}', 'fondo_cerrado', 'valor_cuota',
                                 f'{f["moneda"]} por cuota', 'mensual', FUENTE, moneda=f['moneda'], agregacion='fin_de_periodo', url=URL_DATOS))
        prev = None
        for d, v in L:
            rev = None
            if prev and abs(v / prev[1] - 1) > SALTO:
                rev = f'variación de {float((v / prev[1] - 1) * 100):+.1f} % frente a {prev[0]:%Y-%m}'
                saltos.append(f'{f["nombre"]} {d:%Y-%m} ({float((v / prev[1] - 1) * 100):+.1f} %)')
            lote.obs.append(Obs(f['serie'], d, v, revisar=rev))
            prev = (d, v)
    doc.fecha_publicacion = None
    lote.extra = {'fondos': list(fondos.values())}
    if vigencia:
        lote.pendientes.append(Pendiente('encabezado', 'fecha_de_vigencia',
            f'El archivo dice «{vigencia}» pero trae datos hasta {ultimo:%Y-%m}.', 'Se usa la fecha de descarga como fecha de captura.'))
    if saltos:
        lote.pendientes.append(Pendiente(f'{len(saltos)} observaciones', 'variacion_extrema',
            'Variaciones mensuales de más de 15 %: ' + '; '.join(saltos) + '.', 'Revisar con la administradora o la SIMV; ningún valor se cambia.'))
    lote.validar_basico()
    return lote


# Pares detectados en la revisión de la Fase 1 por nombre y por continuidad del valor cuota.
# Son hipótesis: no se unen series hasta que la SIMV o la administradora lo confirmen.
POSIBLES_RENOMBRES = [
    ('Fondo Nacional Pioneer United Renta Fija', 'Fondo de Inversion Cerrado Pioneer United Renta Fija'),
    ('Fondo Cerrado de Inversión de Renta Fija GAM', 'Fondo Cerrado de Inversión de Renta Fija Altio'),
    ('Fondo Cerrado de Desarrollo de Sociedades Gam Energia', 'Fondo Cerrado de Desarrollo Altio Energia'),
    ('Fondo Cerrado de Desarrollo de Sociedades GAM II', 'Fondo Cerrado de Desarrollo Altio II'),
    ('Fondo de Inversion Cerrado Inmobiliario GAM I', 'Fondo de Inversion Cerrado Inmobiliario ALTIO I'),
    ('Fondo de Inversión Cerrado Renta Fija GAM- United Capital', 'Fondo de Inversión Cerrado Renta Fija ALTIO-United Capital'),
    ('Fondo Cerrado de Inversión Inmobiliaria Universal I', 'Fondo de Inversión Cerrado Inmobiliario Universal I'),
    ('Fondo de Inversión Cerrado Libre para el Desarrollo de Infraestructura Dominicana I', 'Fondo de Inversión Cerrado Libre para el Desarrollo de Infraestructuras Dominicanas I'),
    ('Fondo Cerrado de Desarrollo de Sociedades Pioneer II', 'Fondo de Inversión Cerrado de Desarrollo de Sociedades Pioneer II'),
    ('Fondo Cerrado de Desarrollo de Sociedades con Impacto Social Pioneer', 'Fondo de Inversión Cerrado de Desarrollo con Impacto Social Pioneer'),
    ('Fondo de Inversion Cerrado de Desarrollo De Infraestructura Energeticas I', 'Fondo de Inversión Cerrado de Desarrollo de Infraestructuras Energéticas I'),
]


def posibles_cambios_de_nombre(lote: Lote) -> list[tuple[str, str, str]]:
    """Para cada par conocido: el mes en que se cruzan y si ese mes aparecen ambos nombres (con valores distintos)."""
    nombres = {f['nombre']: f for f in lote.extra['fondos']}
    obs = {}
    for o in lote.obs:
        obs.setdefault(o.serie, {})[o.fecha_ref] = o.valor
    out = []
    for a, b in POSIBLES_RENOMBRES:
        if a not in nombres or b not in nombres:
            continue
        A, B = obs[nombres[a]['serie']], obs[nombres[b]['serie']]
        comun = sorted(set(A) & set(B))
        if comun:
            d = comun[0]
            out.append((a, b, f'{d:%Y-%m}, mes en que aparecen ambos nombres con valores distintos ({A[d]} y {B[d]})'))
        else:
            out.append((a, b, f'{max(A):%Y-%m} a {min(B):%Y-%m}, sin mes en común'))
    return out
