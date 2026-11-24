package com.caobafinanzas.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;

/** Widget nativo de Caoba. Android lo redibuja cada 30 minutos y la app lo actualiza al guardar cambios. */
public class CashFlowWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        for (int id : ids) WidgetRender.update(ctx, m, id, WidgetRender.FLOW);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle opts) {
        WidgetRender.update(ctx, m, id, WidgetRender.FLOW);
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(WidgetRender.CFG, Context.MODE_PRIVATE).edit();
        for (int id : ids) e.remove("w" + id + "_cur").remove("w" + id + "_hide").remove("w" + id + "_sel");
        e.apply();
    }
}
