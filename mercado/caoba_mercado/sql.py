"""Escritura en Supabase mediante SQL idempotente.

Volver a ejecutar el mismo lote no duplica nada: las observaciones se identifican por serie, fecha
y versión; los documentos por fuente y huella; las subastas por documento y fila original.
Este camino sirve para la carga inicial desde el editor SQL; las tareas programadas usarán la
misma lógica a través de la API con la clave de servicio.
"""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from .nucleo import Lote

FUENTES = [  # codigo, nombre, tipo, url, frecuencia, activa
    ('bcrd_tipo_cambio', 'Banco Central de la República Dominicana · tasa de cambio de referencia', 'oficial',
     'https://www.bancentral.gov.do/SectorExterno/HistoricoTasas', 'diaria', True),
    ('bcrd_notas', 'Banco Central de la República Dominicana · subastas de Notas', 'oficial',
     'https://www.bancentral.gov.do/a/d/2711-notas-del-banco-central', 'por subasta', True),
    ('simv_fondos_cerrados', 'Superintendencia del Mercado de Valores · valor cuota de fondos cerrados y fideicomisos (datos de la BVRD)', 'oficial',
     'https://datos.gob.do/dataset/variacion-del-valor-cuota-de-los-instrumentos-de-renta-variable', 'mensual', True),
    ('bcrd_ipc', 'Banco Central de la República Dominicana · índice de precios al consumidor', 'oficial',
     'https://www.bancentral.gov.do/a/d/2534-precios', 'mensual', False),
    ('bcrd_tpm', 'Banco Central de la República Dominicana · tasa de política monetaria', 'oficial', None, 'mensual', False),
    ('sipen', 'Superintendencia de Pensiones · resúmenes estadísticos', 'oficial',
     'https://sipen.gob.do/estadisticas/resumenes-estadisticos', 'mensual', False),
    ('adosafi', 'ADOSAFI · boletín de fondos de inversión', 'privada', 'https://adosafi.org/boletines-informativos/', 'mensual', False),
    ('bvrd_emisiones', 'BVRD · emisiones vigentes', 'privada', 'https://bvrd.com.do/inversionistas/emisiones-vigentes/', 'semanal', False),
    ('manual', 'Carga manual desde el panel de administrador', 'manual', None, 'semanal', True),
]
INSTITUCIONES = [('bcrd', 'Banco Central de la República Dominicana', 'banco_central', None),
                 ('simv', 'Superintendencia del Mercado de Valores', 'gobierno', None),
                 ('sipen', 'Superintendencia de Pensiones', 'gobierno', None)]


def q(v) -> str:
    """Literal SQL seguro para los tipos que usan los conectores."""
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, Decimal)):
        return str(v)
    if isinstance(v, float):
        return repr(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"


def base() -> str:
    out = ['-- Fuentes e instituciones (idempotente)']
    for c, n, t, u, f, a in FUENTES:
        out.append(f'insert into mercado.fuentes (codigo, nombre, tipo, url, frecuencia, activa) values ({q(c)}, {q(n)}, {q(t)}, {q(u)}, {q(f)}, {q(a)}) '
                   f'on conflict (codigo) do update set nombre = excluded.nombre, url = excluded.url, frecuencia = excluded.frecuencia;')
    for c, n, t, r in INSTITUCIONES:
        out.append(f'insert into mercado.instituciones (codigo, nombre, tipo, regulador) values ({q(c)}, {q(n)}, {q(t)}, {q(r)}) on conflict (codigo) do nothing;')
    return '\n'.join(out) + '\n'


def doc_id(lote: Lote) -> str:
    return f"(select id from mercado.documentos where fuente = {q(lote.fuente)} and sha256 = {q(lote.documento.sha256)})"


def cabecera(lote: Lote) -> str:
    d = lote.documento
    out = [f'-- {lote.fuente}: documento y series',
           f'insert into mercado.documentos (fuente, variable, nombre, url_origen, fecha_publicacion, fecha_captura, sha256, bytes) values '
           f'({q(d.fuente)}, {q(d.variable)}, {q(d.nombre)}, {q(d.url_origen)}, {q(d.fecha_publicacion)}, {q(d.fecha_captura)}, {q(d.sha256)}, {d.bytes}) '
           f'on conflict (fuente, sha256) do nothing;']
    if lote.series:
        vals = ',\n'.join(f'({q(s.codigo)}, {q(s.nombre)}, {q(s.categoria)}, {q(s.variable)}, {q(s.institucion)}, {q(s.moneda)}, {q(s.unidad)}, '
                          f'{q(s.tipo_tasa)}, {q(s.plazo_dias)}, {q(s.frecuencia)}, {q(s.agregacion)}, {q(s.fuente)}, {q(s.url)}, {q(s.notas)})' for s in lote.series)
        out.append('insert into mercado.series (codigo, nombre, categoria, variable, institucion, moneda, unidad, tipo_tasa, plazo_dias, frecuencia, agregacion, fuente, url, notas) values\n'
                   + vals + '\non conflict (codigo) do nothing;')
    return '\n'.join(out) + '\n'


def observaciones(lote: Lote, tam: int = 6000) -> list[str]:
    """Observaciones en bloques. Cada serie se nombra una vez por bloque y las filas usan su número."""
    bloques = []
    for k in range(0, len(lote.obs), tam):
        trozo = lote.obs[k:k + tam]
        codigos = sorted({o.serie for o in trozo})
        idx = {c: i for i, c in enumerate(codigos)}
        mapa = ', '.join(f'({i}, {q(c)})' for c, i in idx.items())
        filas = ',\n'.join(f'({idx[o.serie]},{q(o.fecha_ref)},{o.valor},{q(o.valor_texto)},{q(o.estado)},{q(o.revisar)})' for o in trozo)
        bloques.append(
            f'-- {lote.fuente}: observaciones {k + 1} a {k + len(trozo)} de {len(lote.obs)}\n'
            f'insert into mercado.observaciones (serie, fecha_ref, fecha_publicacion, fecha_captura, valor, valor_texto, estado, documento, revisar)\n'
            f'select m.codigo, v.f::date, null, {q(lote.documento.fecha_captura)}::timestamptz, v.val::numeric, v.txt, v.est, d.id, v.rev\n'
            f'from (values\n{filas}\n) v(k, f, val, txt, est, rev)\n'
            f'join (values {mapa}) m(k, codigo) on m.k = v.k\n'
            f'cross join {doc_id(lote)} d(id)\n'
            f'on conflict (serie, fecha_ref, version) do nothing;\n')
    return bloques


def notas(lote: Lote) -> str:
    out = ['-- Notas del BCRD y subastas']
    vals = ',\n'.join(f"({q(n['isin'])}, {q(n['cupon'])}, {q(n['vencimiento'])}, {q(n['plazo_anios_original'])}, {q(n['primera_subasta'])}, {q(n['estado'])})"
                      for n in lote.extra['notas'])
    out.append('insert into mercado.notas_bcrd (isin, cupon, vencimiento, plazo_anios_original, primera_subasta, estado) values\n' + vals +
               '\non conflict (isin) do update set estado = excluded.estado;')
    cols = ['isin', 'fila_original', 'plazo_anios', 'cupon', 'fecha_subasta', 'fecha_liquidacion', 'fecha_vencimiento', 'dias_al_vencimiento',
            'recibido_vn', 'recibido_precio_prom', 'adjudicado_vn', 'precio_corte', 'adjudicado_precio_prom', 'rendimiento_prom',
            'rechazado_precio_prom', 'estado', 'revisar']
    vals = ',\n'.join('(' + ', '.join(q(s[c]) for c in cols) + ')' for s in lote.extra['subastas'])
    tipos = {'fecha_subasta': 'date', 'fecha_liquidacion': 'date', 'fecha_vencimiento': 'date', 'fila_original': 'int', 'dias_al_vencimiento': 'int'}
    sel = ', '.join(f'v.{c}::{tipos[c]}' if c in tipos else (f'v.{c}' if c in ('isin', 'estado', 'revisar') else f'v.{c}::numeric') for c in cols)
    out.append(f'insert into mercado.subastas_notas ({", ".join(cols)}, documento, fecha_captura)\n'
               f'select {sel}, d.id, {q(lote.documento.fecha_captura)}::timestamptz\nfrom (values\n{vals}\n) v({", ".join(cols)})\n'
               f'cross join {doc_id(lote)} d(id)\non conflict (fila_original, documento) do nothing;')
    return '\n'.join(out) + '\n'


def fondos(lote: Lote) -> str:
    vals = ',\n'.join(f"({q(f['codigo'])}, {q(f['nombre'])}, {q(f['tipo'])}, {q(f['moneda'])}, {q(f['serie'])}, {q(f['activo'])})" for f in lote.extra['fondos'])
    return ('-- Fondos cerrados y fideicomisos\ninsert into mercado.fondos (codigo, nombre, tipo, moneda, serie, activo) values\n' + vals +
            '\non conflict (codigo) do update set activo = excluded.activo;\n')


def cierre(lote: Lote, mensaje: str) -> str:
    """Pendientes (sin repetir), estado de la fuente y registro de la ejecución."""
    out = [f'-- {lote.fuente}: pendientes, estado y ejecución']
    for p in lote.pendientes:
        out.append(f'insert into mercado.pendientes (fuente, documento, referencia, regla, detalle, propuesta) select {q(lote.fuente)}, d.id, {q(p.referencia)}, {q(p.regla)}, {q(p.detalle)}, {q(p.propuesta)} '
                   f'from {doc_id(lote)} d(id) where not exists (select 1 from mercado.pendientes x where x.fuente = {q(lote.fuente)} and x.referencia = {q(p.referencia)} and x.regla = {q(p.regla)});')
    ultima = max((o.fecha_ref for o in lote.obs), default=None)
    if lote.fuente == 'bcrd_notas':
        ultima = max(s['fecha_subasta'] for s in lote.extra['subastas'])
    out.append(f"insert into mercado.estado_fuente (fuente, ultima_consulta, ultima_publicacion, ultima_observacion, ultimo_sha256, estado) values "
               f"({q(lote.fuente)}, {q(lote.documento.fecha_captura)}, {q(lote.documento.fecha_publicacion)}, {q(ultima)}, {q(lote.documento.sha256)}, 'al_dia') "
               f"on conflict (fuente) do update set ultima_consulta = excluded.ultima_consulta, ultima_publicacion = excluded.ultima_publicacion, "
               f"ultima_observacion = excluded.ultima_observacion, ultimo_sha256 = excluded.ultimo_sha256, estado = excluded.estado;")
    n = len(lote.extra['subastas']) if lote.fuente == 'bcrd_notas' else len(lote.obs)
    out.append(f"insert into mercado.ejecuciones (fuente, inicio, fin, estado, nuevos, rechazados, origen, mensaje) "
               f"select {q(lote.fuente)}, {q(lote.documento.fecha_captura)}, now(), 'exito', {n}, 0, 'carga_inicial', {q(mensaje)} "
               f"where not exists (select 1 from mercado.ejecuciones x where x.fuente = {q(lote.fuente)} and x.origen = 'carga_inicial');")
    return '\n'.join(out) + '\n'
