# InvierteRD: instalar la app y conectar el correo

Esta carpeta es la app completa. Para tenerla en tu celular hay que publicarla una vez en un enlace propio (gratis) y luego agregarla a la pantalla de inicio. Funciona sin conexión y tus datos se guardan en tu teléfono.

## 1. Publicarla en un enlace propio (10 minutos, una sola vez)

**Opción A · Netlify (la más simple)**
1. Crea una cuenta gratis en netlify.com.
2. Entra a app.netlify.com/drop y arrastra la carpeta `InvierteRD` completa.
3. Netlify te da un enlace como `https://algo.netlify.app`. En «Site configuration» puedes cambiarle el nombre, por ejemplo `https://invierterd.netlify.app`.

**Opción B · GitHub Pages**
1. Crea un repositorio, sube el contenido de la carpeta y activa *Settings → Pages* sobre la rama principal.
2. El enlace será `https://tu-usuario.github.io/nombre-del-repositorio/`.

Para actualizar la app, vuelve a subir la carpeta nueva al mismo sitio. Tus datos no se pierden: viven en el teléfono, no en el sitio.

## 2. Instalarla en el celular

- **iPhone:** abre el enlace en Safari → botón Compartir → «Agregar a pantalla de inicio».
- **Android:** abre el enlace en Chrome → menú ⋮ → «Instalar app» (o «Agregar a pantalla principal»).

La primera vez que la abras aparece la guía «Dedica 5 minutos a contarnos de ti».

## 3. Conectar Gmail (solo lectura)

La app lee tu correo directamente desde tu teléfono con un permiso de Google de solo lectura. No hay servidor intermedio: los correos, los PDF y tu cédula nunca salen del dispositivo.

**Ya está configurado** en el proyecto de Google Cloud `InvierteRD` (ID de cliente incluido en la app, origen autorizado `https://dylanvargas02.github.io`, permiso `gmail.readonly`, app en modo **Prueba**).

1. En la app: *Ajustes → Correo y documentos → Conectar Gmail*.
2. Google mostrará «Google no verificó esta app». Es normal en modo prueba: toca *Avanzado → Ir a InvierteRD* y acepta.
3. Para que otra persona pueda conectar su Gmail, agrega su correo en Google Cloud → *Google Auth Platform → Público → Usuarios de prueba* (máximo 100).

Si algún día cambias el enlace de la app (por ejemplo, a un dominio propio), agrega el nuevo origen en *Google Auth Platform → Clientes → InvierteRD web → Orígenes autorizados de JavaScript*.

### PDF protegidos con la cédula
Escribe tu cédula en *Correo y documentos*. La app prueba con y sin guiones. Puedes elegir si la recuerda en el teléfono o si la pides cada vez. Nunca se envía a ningún lado.

### Avisos de tasa
En «Avísame si una colocación paga al menos (%)» pon tu tasa mínima. Cuando un acuerdo de tu puesto de bolsa la supere, la app lo marca.

### Ajustar el lector a tus bancos
Las búsquedas de Gmail se pueden editar en *Configuración avanzada*. Por ejemplo, para leer solo los avisos de tu banco: `from:(alertas@tubanco.com.do) newer_than:60d`. Si un aviso real no se reconoce, usa «Probar con un archivo o un texto» y comparte el texto **sin datos personales** para ajustar el lector.

## Límites de esta versión

- **Revisión del correo:** ocurre cuando tocas «Revisar correo ahora». Para que sea automática y en segundo plano hace falta un servidor (Gmail envía avisos a un servidor, no a una página web).
- **Modo prueba de Google:** sirve para ti y hasta 100 usuarios de prueba que agregues a mano. Para abrirla al público, Google exige verificar la app y, por usar un permiso de lectura de Gmail, una evaluación de seguridad anual de un tercero, que tiene costo.
- **Tus datos:** se guardan solo en el navegador de ese teléfono. Si borras los datos del navegador o cambias de teléfono, se pierden. Las cuentas de usuario y el respaldo en la nube son el siguiente paso.
- **App Store y Play Store:** esta misma app puede empaquetarse con Capacitor para publicarla en las tiendas, cuando haya servidor y cuentas.
