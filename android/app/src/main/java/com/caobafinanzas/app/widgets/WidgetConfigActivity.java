package com.caobafinanzas.app.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Configuración de cada widget: moneda, ocultar montos y qué inversiones o tasas mostrar.
 * Se abre al agregar el widget y después manteniéndolo presionado (Android 12 o más nuevo).
 */
public class WidgetConfigActivity extends Activity {
    private int id = AppWidgetManager.INVALID_APPWIDGET_ID;
    private final List<CheckBox> picks = new ArrayList<>();

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setResult(RESULT_CANCELED);
        Bundle ex = getIntent().getExtras();
        if (ex != null) id = ex.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

        AppWidgetManager m = AppWidgetManager.getInstance(this);
        AppWidgetProviderInfo info = m.getAppWidgetInfo(id);
        String cls = info != null ? info.provider.getClassName() : "";
        String kind = cls.endsWith("CashFlowWidget") ? WidgetRender.FLOW : cls.endsWith("InvestmentsWidget") ? WidgetRender.INV : cls.endsWith("MarketWidget") ? WidgetRender.MKT : WidgetRender.NET;

        SharedPreferences cfg = getSharedPreferences(WidgetRender.CFG, MODE_PRIVATE);
        JSONObject snap = WidgetRender.snapshot(this);
        String base = snap != null ? snap.optString("base", "DOP") : "DOP";
        String cur0 = cfg.getString("w" + id + "_cur", base);
        List<String> sel0 = Arrays.asList(cfg.getString("w" + id + "_sel", "").split(","));

        int pad = dp(20);
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(pad, pad, pad, pad);
        col.setBackgroundColor(Color.parseColor("#F7F9F8"));

        col.addView(text("Configura tu widget", 22, true, "#123B5C"));
        col.addView(text("Elige qué ver. Puedes cambiarlo después manteniendo presionado el widget.", 15, false, "#55656F"));

        RadioGroup curG = null;
        if (!WidgetRender.MKT.equals(kind)) {
            col.addView(text("Moneda", 16, true, "#1E2A33"));
            curG = new RadioGroup(this);
            curG.setOrientation(RadioGroup.HORIZONTAL);
            RadioButton d = radio("RD$ pesos", 1), u = radio("US$ dólares", 2);
            curG.addView(d); curG.addView(u);
            curG.check("USD".equals(cur0) ? 2 : 1);
            col.addView(curG);
        }

        Switch hide = null;
        if (!WidgetRender.MKT.equals(kind)) {
            hide = new Switch(this);
            hide.setText("Ocultar montos (se muestran como ••••)");
            hide.setTextSize(16);
            hide.setTextColor(Color.parseColor("#1E2A33"));
            hide.setChecked(cfg.getBoolean("w" + id + "_hide", false));
            hide.setPadding(0, dp(16), 0, dp(8));
            col.addView(hide);
        }

        JSONArray items = null;
        if (snap != null && WidgetRender.INV.equals(kind) && snap.optJSONObject("fin") != null) items = snap.optJSONObject("fin").optJSONObject("inv").optJSONArray("items");
        if (snap != null && WidgetRender.MKT.equals(kind) && snap.optJSONObject("mkt") != null) items = snap.optJSONObject("mkt").optJSONArray("rows");
        if (items != null && items.length() > 0) {
            col.addView(text(WidgetRender.INV.equals(kind) ? "Inversiones a mostrar (hasta 3)" : "Tasas a mostrar (hasta 4)", 16, true, "#1E2A33"));
            for (int i = 0; i < items.length(); i++) {
                JSONObject o = items.optJSONObject(i);
                CheckBox c = new CheckBox(this);
                c.setText(WidgetRender.MKT.equals(kind) ? o.optString("inst") + " · " + o.optString("label") : o.optString("name"));
                c.setTag(o.optString("id"));
                c.setTextSize(15);
                c.setChecked(sel0.contains(o.optString("id")));
                picks.add(c);
                col.addView(c);
            }
            col.addView(text("Si no eliges ninguna, se muestran las primeras.", 13, false, "#55656F"));
        } else if (snap == null) {
            col.addView(text("Abre Caoba al menos una vez para que el widget tenga datos.", 14, false, "#55656F"));
        }

        Button save = new Button(this);
        save.setText("Guardar");
        save.setAllCaps(false);
        save.setTextSize(16);
        save.setTextColor(Color.WHITE);
        save.setBackgroundColor(Color.parseColor("#123B5C"));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        lp.topMargin = dp(20);
        col.addView(save, lp);

        final RadioGroup cg = curG;
        final Switch hs = hide;
        final String k = kind;
        save.setOnClickListener(x -> {
            SharedPreferences.Editor e = cfg.edit();
            if (cg != null) e.putString("w" + id + "_cur", cg.getCheckedRadioButtonId() == 2 ? "USD" : "DOP");
            if (hs != null) e.putBoolean("w" + id + "_hide", hs.isChecked());
            StringBuilder sb = new StringBuilder();
            int max = WidgetRender.INV.equals(k) ? 3 : 4, n = 0;
            for (CheckBox c : picks) if (c.isChecked() && n < max) { if (sb.length() > 0) sb.append(','); sb.append(c.getTag()); n++; }
            e.putString("w" + id + "_sel", sb.toString());
            e.apply();
            WidgetRender.update(this, m, id, k);
            Intent r = new Intent();
            r.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            setResult(RESULT_OK, r);
            finish();
        });

        ScrollView sv = new ScrollView(this);
        sv.setBackgroundColor(Color.parseColor("#F7F9F8"));
        sv.addView(col);
        setContentView(sv);
    }

    private TextView text(String s, int sp, boolean bold, String color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(Color.parseColor(color));
        if (bold) t.setTypeface(t.getTypeface(), android.graphics.Typeface.BOLD);
        t.setPadding(0, dp(12), 0, dp(4));
        return t;
    }

    private RadioButton radio(String s, int rid) {
        RadioButton r = new RadioButton(this);
        r.setId(rid);
        r.setText(s);
        r.setTextSize(15);
        r.setPadding(0, 0, dp(16), 0);
        return r;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
