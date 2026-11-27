package com.caobafinanzas.app.widgets;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Puente entre la app web y los widgets. La app le entrega un resumen ya calculado (formato v1);
 * aquí se guarda cifrado y se redibujan los widgets. La misma interfaz servirá para iOS (App Group + WidgetKit).
 */
@CapacitorPlugin(name = "CaobaWidgets")
public class CaobaWidgetsPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String snap = call.getString("snapshot");
        if (snap == null || snap.length() > 200_000) {
            call.reject("Resumen inválido");
            return;
        }
        try {
            SecureStore.save(getContext(), snap);
            WidgetRender.refreshAll(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo guardar el resumen", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        SecureStore.clear(getContext());
        WidgetRender.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("supported", true);
        r.put("count", WidgetRender.countWidgets(getContext()));
        call.resolve(r);
    }

    /** Comparte un archivo de texto (el respaldo de datos) con la hoja de compartir de Android. */
    @PluginMethod
    public void shareFile(PluginCall call) {
        String text = call.getString("text");
        String b64 = call.getString("base64");
        String name = call.getString("name", "caoba-respaldo.json");
        String mime = call.getString("mime", "application/json");
        if ((text == null && b64 == null) || !name.matches("[a-zA-Z0-9._-]{1,80}")) {
            call.reject("Archivo inválido");
            return;
        }
        try {
            File dir = new File(getContext().getCacheDir(), "respaldos");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("sin carpeta");
            File f = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(b64 != null ? android.util.Base64.decode(b64, android.util.Base64.DEFAULT) : text.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, "Guardar o enviar el archivo");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo compartir el respaldo", e);
        }
    }
}
