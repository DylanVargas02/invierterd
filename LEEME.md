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

## 4. Cuentas y respaldo en la nube (Supabase)

Cada persona entra con su correo (sin contraseña: recibe un código de 6 dígitos) y sus datos se guardan en su cuenta. La primera vez que alguien entra, lo que ya tenía en el teléfono se sube a su cuenta. Si dos teléfonos tienen cambios distintos, la app pregunta cuáles usar.

**Configuración actual** (proyecto Supabase `InvierteRD`, plan gratis):
- Tabla `app_state`: una fila por persona con todos sus datos. Seguridad por fila activada: cada quien solo puede leer y modificar lo suyo. Sin sesión no se puede leer ni escribir nada.
- Función `delete_my_account`: «Eliminar mi cuenta» en la app borra la cuenta y sus datos.
- URL del sitio y de redirección: `https://dylanvargas02.github.io/invierterd/`.
- Plantillas «Magic link or OTP» y «Confirm sign up» en español, con el código y un botón de respaldo.
- La app acepta el código, el enlace tocado en el navegador o el enlace pegado en «¿Te llegó un enlace en vez de un código?».

**Estado: solo el dueño del proyecto puede entrar.** Supabase, con su remitente por defecto, solo envía correos a los miembros del proyecto y unos 2 por hora. Los amigos pueden usar la app sin cuenta mientras tanto.

### Siguiente paso: abrir las cuentas a tus amigos
1. Activa la verificación en 2 pasos de tu Gmail y crea una **contraseña de aplicación** en `myaccount.google.com/apppasswords` (16 letras; no es tu contraseña normal de Gmail).
2. En Supabase → *Authentication → Emails → SMTP Settings*, activa «Enable custom SMTP» y llena:
   - Sender email y Username: `dylanvargas022003@gmail.com`
   - Sender name: `InvierteRD`
   - Host: `smtp.gmail.com` · Port: `465`
   - Password: la contraseña de aplicación del paso 1
3. Guarda. El límite sube a 30 correos por hora (ajustable en *Rate Limits*). Gmail permite unos 500 por día.
4. Prueba: en la app, *Tu cuenta* → escribe un correo que no sea del proyecto → debe llegar «Tu código de InvierteRD: 123456».

Si más adelante quieres un remitente propio (por ejemplo `hola@invierterd.com`), usa Brevo o Resend con un dominio verificado y cambia solo estos datos de SMTP.

**Ver o borrar cuentas:** Supabase → *Authentication → Users*. Los datos de cada persona están en *Table Editor → app_state*. Como dueño del proyecto puedes verlos; por eso la sección «Privacidad» de la app explica dónde se guardan.

## Límites de esta versión

- **Revisión del correo:** ocurre cuando tocas «Revisar correo ahora». Para que sea automática y en segundo plano hace falta un servidor (Gmail envía avisos a un servidor, no a una página web).
- **Modo prueba de Google:** sirve para ti y hasta 100 usuarios de prueba que agregues a mano. Para abrirla al público, Google exige verificar la app y, por usar un permiso de lectura de Gmail, una evaluación de seguridad anual de un tercero, que tiene costo.
- **Sin cuenta:** los datos viven solo en el navegador de ese teléfono. Con cuenta, además quedan en la nube y se ven en cualquier teléfono.
- **App Store y Play Store:** esta misma app puede empaquetarse con Capacitor para publicarla en las tiendas.
