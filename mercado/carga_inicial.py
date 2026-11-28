"""Carga inicial de los históricos que entregó Dylan el 27 nov 2026.

Uso: python3 carga_inicial.py <carpeta con los 3 archivos> <carpeta de salida>
Genera: SQL por bloques (para el editor de Supabase), un informe de validación y sumas de control.
No modifica los archivos originales.
"""
import datetime as dt
import json
import sys
from decimal import Decimal
from pathlib import Path

from caoba_mercado import sql
from caoba_mercado.conectores import bcrd_notas, bcrd_tipo_cambio, simv_fondos_cerrados

CAPTURA = '2026-11-27T21:28:00-04:00'  # cuando Dylan entregó los archivos (hora de Santo Domingo)
HOY = dt.date(2026, 11, 27)


def buscar(carpeta: Path, parte: str) -> Path:
    L = [p for p in carpeta.iterdir() if parte in p.name]
    if len(L) != 1:
        raise SystemExit(f'Se esperaba un archivo con «{parte}» en {carpeta}, hay {len(L)}')
    return L[0]


def main(origen: Path, salida: Path):
    salida.mkdir(parents=True, exist_ok=True)
    lotes = [
        bcrd_tipo_cambio.leer(buscar(origen, 'TASA_DOLAR_REFERENCIA_MC'), CAPTURA),
        bcrd_notas.leer(buscar(origen, 'Historico_Subastas_Notas'), CAPTURA, HOY),
        simv_fondos_cerrados.leer(buscar(origen, 'Valor-Cuota-de-Fondos'), CAPTURA),
    ]
    renombres = simv_fondos_cerrados.posibles_cambios_de_nombre(lotes[2])
    from caoba_mercado.nucleo import Pendiente
    for a, b, m in renombres:
        lotes[2].pendientes.append(Pendiente(f'{a} → {b}', 'posible_cambio_de_nombre',
            f'«{a}» deja de reportar cuando empieza «{b}»: {m}.',
            'Confirmar con la SIMV; mientras tanto se muestran como fondos separados.'))
    partes = [sql.base()]
    for L in lotes:
        partes.append(sql.cabecera(L))
    bloques = []
    for L in lotes:
        bloques += sql.observaciones(L)
    extra = sql.notas(lotes[1]) + sql.fondos(lotes[2])
    cierre = ''.join(sql.cierre(L, 'Carga inicial desde el archivo entregado por Dylan el 27 nov 2026') for L in lotes)
    archivos = [('01_base.sql', ''.join(partes) + extra)]
    for i, b in enumerate(bloques, start=2):
        archivos.append((f'{i:02d}_observaciones.sql', b))
    archivos.append((f'{len(archivos) + 1:02d}_cierre.sql', cierre))
    for n, t in archivos:
        (salida / n).write_text(t, encoding='utf-8')
    # Sumas de control para comprobar la carga contra los originales
    control = {}
    for L in lotes:
        por = {}
        for o in L.obs:
            c = por.setdefault(o.serie, {'n': 0, 'suma': Decimal(0), 'min': o.fecha_ref, 'max': o.fecha_ref})
            c['n'] += 1; c['suma'] += o.valor; c['min'] = min(c['min'], o.fecha_ref); c['max'] = max(c['max'], o.fecha_ref)
        control[L.fuente] = {'resumen': L.resumen(), 'documento': {'nombre': L.documento.nombre, 'sha256': L.documento.sha256, 'bytes': L.documento.bytes},
                             'series': {k: {**v, 'suma': str(v['suma']), 'min': str(v['min']), 'max': str(v['max'])} for k, v in por.items()}}
        if L.fuente == 'bcrd_notas':
            S = L.extra['subastas']
            control[L.fuente]['subastas'] = {'n': len(S), 'adjudicado_vn': str(sum((s['adjudicado_vn'] or 0) for s in S)),
                                             'recibido_vn': str(sum((s['recibido_vn'] or 0) for s in S)), 'isin': len(L.extra['notas'])}
    (salida / 'control.json').write_text(json.dumps(control, ensure_ascii=False, indent=1), encoding='utf-8')
    informe = ['# Carga inicial · informe de validación', '']
    for L in lotes:
        informe += [f'## {L.fuente}', '', '```', json.dumps(L.resumen(), ensure_ascii=False), '```', '']
        for p in L.pendientes:
            informe.append(f'- **{p.regla}** · {p.referencia}: {p.detalle} → {p.propuesta or ""}')
        informe.append('')
    (salida / 'informe.md').write_text('\n'.join(informe), encoding='utf-8')
    for n, t in archivos:
        print(f'{n}: {len(t.encode()) / 1024:.0f} KB')
    for L in lotes:
        print(L.resumen())


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
