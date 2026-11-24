# Caoba · guía del proyecto

App de organización financiera e inversión. Una sola base de código produce la **web** (PWA en GitHub Pages) y la **app Android** (Capacitor) con widgets nativos.

## Dónde está cada cosa

| Carpeta | Qué contiene |
|---|---|
| `src/shell.html` | Esqueleto de la página |
| `src/css/` | Estilos. `000-tokens.css` es el único lugar con colores, letras y radios |
| `src/js/` | La app, en módulos que se unen en orden (00 → 99). `99-arranque.js` va siempre al final |
| `src/fonts/` | Plus Jakarta Sans (licencia OFL), incluida dentro de la app |
| `tools/build.py` | Construye la web en la raíz. Con `--native` también arma `www/` para Android |
| `android/` | Proyecto Android (Capacitor 8). Widgets en `app/src/main/java/com/caobafinanzas/app/widgets/` |
| `supabase/migrations/` | Tablas de mercado, administradores y estadísticas, con sus reglas de seguridad |
| `.github/workflows/android.yml` | Compila el APK en cada cambio y lo publica como versión de prueba |
| `bienvenida/` | Página de descarga |

## Construir

```bash
python3 tools/build.py            # web: index.html, sw.js, manifest, íconos
npm ci && python3 tools/build.py --native && npx cap sync android   # app Android
```

El APK se compila en GitHub Actions. Descarga de prueba:
https://github.com/DylanVargas02/invierterd/releases/download/android-prueba/caoba-prueba.apk

## Datos y privacidad

- Los datos viven en el teléfono (`localStorage`, clave `alcancia.v1`) y, con cuenta, en Supabase (`app_state`, una fila por usuario; cada quien solo ve la suya).
- Perfiles financieros: el perfil activo vive en el mismo objeto; los demás en `profiles.store`.
- Respaldo: Ajustes → Guardar / Restaurar un respaldo (archivo JSON). Sirve para pasar datos de la web a la app sin cuenta.
- Widgets: la app entrega un resumen (formato v1, solo totales, nombres de inversiones y tasas). Android lo guarda cifrado con una clave del Keystore. No incluye movimientos, notas, números de cuenta ni datos de acceso. Se vacía al cerrar sesión o borrar datos.
- La app Android no participa en las copias de seguridad automáticas de Google.
- Estadísticas: solo con permiso; eventos anónimos (`usage_events`) que solo el administrador puede leer.

## Mercado

- Las tasas reales se cargan desde Ajustes → Administración (solo cuentas en la tabla `admins`).
- Cada dato lleva fuente, fecha y estado (real, por verificar, simulado). La base de datos no permite editar ni borrar; una corrección es un dato nuevo que reemplaza al anterior.
- Las pestañas «Productos» y «Cambio» son un prototipo con datos simulados y lo indican.

## Publicar en Play Store (pendiente)

1. Crear la cuenta de Google Play Console (US$25, pago único).
2. Crear una clave de firma y guardarla fuera del repositorio. Agregarla como secretos de GitHub para compilar el paquete firmado (`bundleRelease`).
3. Completar la ficha, la política de privacidad y el formulario de seguridad de datos.

## iOS (pendiente)

Necesita una Mac con Xcode y la cuenta de Apple Developer (US$99 al año). El complemento `CaobaWidgets` y el formato del resumen ya están preparados: en iOS se guardarán en un App Group para WidgetKit.
