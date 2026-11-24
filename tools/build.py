"""Construye Caoba desde src/: la PWA publicada en la raíz del repositorio y, con --native, la carpeta www/ de la app Android.
Uso: python3 tools/build.py            (web)
     python3 tools/build.py --native   (web + www/ para Capacitor)"""
import re, json, pathlib, zipfile, hashlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from assemble import assemble

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = assemble()
pathlib.Path('/home/claude/alcancia.html').write_text(SRC, encoding='utf-8') if pathlib.Path('/home/claude').exists() else None

body = SRC.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
title_m = re.search(r'<title>.*?</title>\n?', body)
body = body[:title_m.start()] + body[title_m.end():]
version = hashlib.sha1(SRC.encode()).hexdigest()[:8]

head = f'''<!doctype html>
<html lang="es-DO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Caoba</title>
<meta name="description" content="Caoba: donde tus ahorros perduran y crecen. Organiza tus finanzas y compara tasas en República Dominicana.">
<meta name="theme-color" content="#F7F1EA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17100C" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Caoba">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font-size:14px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
</head>
<body>
'''
tail = f'''
<script>
if('serviceWorker' in navigator){{const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{{if(had&&window.__swUpdated)window.__swUpdated()}});window.addEventListener('load',()=>{{navigator.serviceWorker.register('sw.js').catch(()=>{{}})}})}}
</script>
</body>
</html>
'''
(ROOT / 'index.html').write_text(head + body + tail, encoding='utf-8')

manifest = {
  "name": "Caoba · finanzas e inversión",
  "short_name": "Caoba",
  "description": "Donde tus ahorros perduran y crecen. Organiza tus finanzas y compara tasas en RD.",
  "lang": "es-DO",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F1EA",
  "theme_color": "#F7F1EA",
  "categories": ["finance"],
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
(ROOT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

sw = f'''/* Caoba · funciona sin conexión. Nunca guarda en caché nada de Google ni del correo. */
const CACHE='caoba-{version}';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))}});
self.addEventListener('fetch',e=>{{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||/googleapis\\.com$|google\\.com$|gstatic\\.com$/.test(u.hostname)&&!/fonts\\./.test(u.hostname))return;
  if(e.request.mode==='navigate'){{const sp=new URL(self.registration.scope).pathname;if(u.pathname!==sp&&u.pathname!==sp+'index.html'){{e.respondWith(fetch(e.request).then(r=>{{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}}).catch(()=>caches.match(e.request)));return}}
    e.respondWith(fetch(e.request).then(r=>{{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return r}}).catch(()=>caches.match('./index.html')));return}}
  if(u.origin===location.origin||u.hostname==='cdnjs.cloudflare.com'||/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname)){{
    e.respondWith(caches.match(e.request).then(hit=>{{const net=fetch(e.request).then(r=>{{if(r.ok||r.type==='opaque'){{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}}return r}}).catch(()=>hit);return hit||net}}));
  }}
}});
'''
(ROOT / 'sw.js').write_text(sw, encoding='utf-8')

files = ['index.html', 'manifest.webmanifest', 'sw.js', 'LEEME.md'] + [f'icons/{p.name}' for p in sorted((ROOT / 'icons').glob('*.png'))]
with zipfile.ZipFile(ROOT / 'tools' / 'Caoba-app.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        if (ROOT / f).exists():
            z.write(ROOT / f, f'Caoba/{f}')
print('versión', version, '·', len(files), 'archivos')
