"""Compara lo cargado en la base con los archivos originales.

1) Sumas de control del lector (control.json) contra la base, serie por serie.
2) Lectura independiente de los Excel, sin usar los conectores, contra la base.
Uso: python3 comprobar_carga.py control.json <carpeta originales> <archivo con filas «serie|n|suma|min|max» exportado de la base>
"""
import json, sys, datetime as dt
from decimal import Decimal
from pathlib import Path
import openpyxl

control = json.loads(Path(sys.argv[1]).read_text())
orig = Path(sys.argv[2])
base = {}
for l in Path(sys.argv[3]).read_text().splitlines():
    s, n, suma, a, b = l.split('|')
    base[s] = (int(n), Decimal(suma), a, b)
fallas = 0
for fuente, c in control.items():
    for s, v in c['series'].items():
        got = base.get(s)
        exp = (v['n'], Decimal(v['suma']), v['min'], v['max'])
        if got != exp:
            fallas += 1
            print('DIFERENCIA', s, exp, got)
print('series comparadas contra el lector:', sum(len(c['series']) for c in control.values()), '· diferencias:', fallas)
# Lectura independiente
f = next(p for p in orig.iterdir() if 'TASA_DOLAR' in p.name)
ws = openpyxl.load_workbook(f, data_only=True)['Diaria']
c = v = n = 0
for r in ws.iter_rows(min_row=4, values_only=True):
    if r[0]:
        n += 1; c += Decimal(repr(r[3])); v += Decimal(repr(r[4]))
for s, (e_n, e_sum) in {'bcrd.usd_dop.compra.diaria': (n, c), 'bcrd.usd_dop.venta.diaria': (n, v)}.items():
    ok = base[s][0] == e_n and base[s][1] == e_sum
    fallas += 0 if ok else 1
    print('independiente', s, 'filas', e_n, 'suma', e_sum, 'OK' if ok else f'DIFERENTE {base[s]}')
f = next(p for p in orig.iterdir() if 'Valor-Cuota' in p.name)
ws = openpyxl.load_workbook(f, data_only=True).worksheets[0]
n = 0; tot = Decimal(0)
for r in ws.iter_rows(min_row=10, values_only=True):
    if r[0] and r[4] is not None:
        n += 1; tot += Decimal(repr(r[4])) if isinstance(r[4], float) else Decimal(r[4])
bn = sum(v[0] for k, v in base.items() if k.startswith('simv.vc.')); bs = sum(v[1] for k, v in base.items() if k.startswith('simv.vc.'))
ok = (bn, bs) == (n, tot); fallas += 0 if ok else 1
print('independiente fondos: filas', n, 'suma', tot, 'OK' if ok else f'DIFERENTE {bn} {bs}')
sys.exit(1 if fallas else 0)
