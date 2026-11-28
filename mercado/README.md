# Caoba Mercado · recolección de datos

Conectores en Python que leen fuentes oficiales de la República Dominicana y guardan los datos en el esquema
`mercado` de Supabase. Diseño completo: documento «Caoba Mercado · Fase 1: auditoría y diseño».

- `caoba_mercado/nucleo.py`: normalización, validación y modelo común (series, observaciones, pendientes).
- `caoba_mercado/conectores/`: un módulo por fuente (`bcrd_tipo_cambio`, `bcrd_notas`, `simv_fondos_cerrados`).
- `caoba_mercado/sql.py`: escritura idempotente (volver a cargar no duplica).
- `carga_inicial.py`: carga de los históricos entregados el 27 nov 2026 → `carga_inicial/` (SQL, informe y sumas de control).
- `pruebas/comprobar_carga.py`: compara la base con los archivos originales.
- Migración del esquema: `supabase/migrations/20261128_mercado_fase2.sql`.

Reglas: nunca se sobrescribe un dato (versiones nuevas), nada se corrige solo (va a `pendientes`), y la app solo lee vistas públicas.
Las tareas programadas (GitHub Actions) se activan cuando estén autorizados el repositorio privado, Google Drive y la clave de servicio.
