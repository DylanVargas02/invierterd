"""Núcleo común de los conectores de Caoba Mercado.

Cada conector lee su fuente y devuelve un Lote: series, observaciones, filas propias de su fuente
y pendientes de revisión. El núcleo no sabe de ninguna fuente en particular; solo normaliza,
valida y escribe. Nunca cambia un valor original: lo que no pasa una regla se guarda marcado
(`revisar`) o se manda a `pendientes`, y queda a decisión del administrador.
"""
from __future__ import annotations

import calendar
import datetime as dt
import hashlib
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

ZONA = 'America/Santo_Domingo'

MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'set': 9,
         'oct': 10, 'nov': 11, 'dic': 12, 'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
         'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
         # Etiquetas en inglés que aparecen en archivos oficiales (p. ej. «Aug» en el BCRD)
         'jan': 1, 'apr': 4, 'aug': 8, 'dec': 12}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def mes(texto) -> int | None:
    """Número de mes a partir de «Ene», «Jul » (con espacio), «Aug», «SEPTIEMBRE»…"""
    if texto is None:
        return None
    t = unicodedata.normalize('NFKD', str(texto)).encode('ascii', 'ignore').decode().strip().lower()
    return MESES.get(t) or MESES.get(t[:3])


def fin_de_mes(y: int, m: int) -> dt.date:
    return dt.date(y, m, calendar.monthrange(y, m)[1])


def fecha(valor) -> tuple[dt.date | None, str | None]:
    """Fecha desde una celda: datetime/date o texto dd/mm/aaaa. Devuelve (fecha, texto original si era texto)."""
    if valor is None or valor == '':
        return None, None
    if isinstance(valor, dt.datetime):
        return valor.date(), None
    if isinstance(valor, dt.date):
        return valor, None
    s = str(valor).strip()
    for f in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return dt.datetime.strptime(s, f).date(), s
        except ValueError:
            pass
    return None, s


def numero(valor) -> tuple[Decimal | None, str | None]:
    """Número desde una celda. Acepta texto con coma de miles («1,456»). Devuelve (número, texto original si era texto)."""
    if valor is None or valor == '':
        return None, None
    if isinstance(valor, bool):
        return None, str(valor)
    if isinstance(valor, (int, float)):
        return Decimal(repr(valor)) if isinstance(valor, float) else Decimal(valor), None
    s = str(valor).strip()
    if re.fullmatch(r'-?\d{1,3}(,\d{3})+(\.\d+)?|-?\d+(\.\d+)?', s):
        return Decimal(s.replace(',', '')), s
    return None, s


def slug(texto: str, largo: int = 70) -> str:
    t = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode().lower()
    t = re.sub(r'[^a-z0-9]+', '_', t).strip('_')
    return t[:largo].rstrip('_')


@dataclass
class Serie:
    codigo: str
    nombre: str
    categoria: str
    variable: str
    unidad: str
    frecuencia: str
    fuente: str
    institucion: str | None = None
    moneda: str | None = None
    tipo_tasa: str | None = None
    plazo_dias: int | None = None
    agregacion: str | None = 'dato'
    url: str | None = None
    notas: str | None = None


@dataclass
class Obs:
    serie: str
    fecha_ref: dt.date
    valor: Decimal
    valor_texto: str | None = None
    estado: str = 'oficial'
    fecha_publicacion: dt.date | None = None
    revisar: str | None = None


@dataclass
class Pendiente:
    referencia: str
    regla: str
    detalle: str
    propuesta: str | None = None


@dataclass
class Documento:
    fuente: str
    variable: str
    nombre: str
    ruta: Path
    url_origen: str | None
    fecha_publicacion: dt.date | None
    fecha_captura: str  # ISO con zona horaria
    sha256: str = ''
    bytes: int = 0

    def __post_init__(self):
        self.sha256 = sha256(self.ruta)
        self.bytes = self.ruta.stat().st_size


@dataclass
class Lote:
    fuente: str
    documento: Documento
    series: list[Serie] = field(default_factory=list)
    obs: list[Obs] = field(default_factory=list)
    pendientes: list[Pendiente] = field(default_factory=list)
    extra: dict = field(default_factory=dict)  # tablas propias de la fuente (notas, subastas, fondos)

    def resumen(self) -> dict:
        return {'fuente': self.fuente, 'series': len(self.series), 'observaciones': len(self.obs),
                'marcadas_para_revisar': sum(1 for o in self.obs if o.revisar),
                'pendientes': len(self.pendientes), **{k: len(v) for k, v in self.extra.items()}}

    def validar_basico(self):
        """Reglas comunes: sin duplicados por serie y fecha, toda observación con serie conocida."""
        codigos = {s.codigo for s in self.series}
        vistos = set()
        for o in self.obs:
            if o.serie not in codigos:
                raise ValueError(f'Observación de una serie no declarada: {o.serie}')
            k = (o.serie, o.fecha_ref)
            if k in vistos:
                raise ValueError(f'Observación duplicada: {k}')
            vistos.add(k)
