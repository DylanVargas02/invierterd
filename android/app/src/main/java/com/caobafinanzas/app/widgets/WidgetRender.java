package com.caobafinanzas.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import com.caobafinanzas.app.MainActivity;
import com.caobafinanzas.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Dibuja los cuatro widgets a partir del resumen cifrado. No escribe nunca en los datos de la app. */
public final class WidgetRender {
    public static final String NET = "net", FLOW = "flow", INV = "inv", MKT = "mkt";
    static final String CFG = "caoba_widget_cfg";
    private static final Locale ES = new Locale("es", "DO");
    private static final int[] ROWS = {R.id.w_r1, R.id.w_r2, R.id.w_r3, R.id.w_r4};
    private static final int[] ROWS_L = {R.id.w_r1l, R.id.w_r2l, R.id.w_r3l, R.id.w_r4l};
    private static final int[] ROWS_V = {R.id.w_r1v, R.id.w_r2v, R.id.w_r3v, R.id.w_r4v};

    private WidgetRender() {}

    static Class<?> providerFor(String kind) {
        switch (kind) {
            case FLOW: return CashFlowWidget.class;
            case INV: return InvestmentsWidget.class;
            case MKT: return MarketWidget.class;
            default: return NetWorthWidget.class;
        }
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        for (String k : new String[]{NET, FLOW, INV, MKT}) {
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, providerFor(k)));
            for (int id : ids) update(ctx, m, id, k);
        }
    }

    public static int countWidgets(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int n = 0;
        for (String k : new String[]{NET, FLOW, INV, MKT}) n += m.getAppWidgetIds(new ComponentName(ctx, providerFor(k))).length;
        return n;
    }

    static JSONObject snapshot(Context ctx) {
        String s = SecureStore.load(ctx);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (Exception e) { return null; }
    }

    /* ---------- formato ---------- */
    static String money(double v, String cur) {
        DecimalFormat f = new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.US));
        String p = "USD".equals(cur) ? "US$" : "RD$";
        return (v < 0 ? "−" : "") + p + f.format(Math.abs(Math.round(v)));
    }
    static String pct(double r) { return new DecimalFormat("0.00", DecimalFormatSymbols.getInstance(Locale.US)).format(r) + " %"; }
    static double pick(JSONObject o, String cur) { return o == null ? 0 : o.optDouble("USD".equals(cur) ? "u" : "d", 0); }
    static String day(long ms) { return new SimpleDateFormat("d MMM", ES).format(new Date(ms)); }

    /* ---------- dibujo ---------- */
    public static void update(Context ctx, AppWidgetManager m, int id, String kind) {
        SharedPreferences cfg = ctx.getSharedPreferences(CFG, Context.MODE_PRIVATE);
        JSONObject snap = snapshot(ctx);
        String cur = cfg.getString("w" + id + "_cur", "");
        if (cur.isEmpty()) cur = snap != null ? snap.optString("base", "DOP") : "DOP";
        boolean hide = cfg.getBoolean("w" + id + "_hide", false) || (snap != null && snap.optBoolean("hideAll", false));
        String sel = cfg.getString("w" + id + "_sel", "");

        Bundle o = m.getAppWidgetOptions(id);
        int h = o != null ? o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110) : 110;
        boolean compact = h < 100, big = h >= 170;

        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_card);
        for (int i = 0; i < 4; i++) v.setViewVisibility(ROWS[i], View.GONE);
        v.setViewVisibility(R.id.w_bar, View.GONE);
        v.setViewVisibility(R.id.w_sub, View.VISIBLE);
        v.setTextViewTextSize(R.id.w_value, TypedValue.COMPLEX_UNIT_SP, compact ? 22 : 28);

        String section;
        JSONObject fin = snap != null ? snap.optJSONObject("fin") : null;
        long ts = snap != null ? snap.optLong("ts", System.currentTimeMillis()) : System.currentTimeMillis();
        double secs = Math.max(0, (System.currentTimeMillis() - ts) / 1000.0);
        String mask = "••••";

        switch (kind) {
            case FLOW: {
                section = "movimientos";
                if (fin == null) { empty(v, ctx.getString(R.string.w_flow_title)); break; }
                JSONObject f = fin.optJSONObject("flow");
                double in = pick(f.optJSONObject("inc"), cur), out = pick(f.optJSONObject("exp"), cur);
                v.setTextViewText(R.id.w_label, cap(f.optString("label", "Este mes")) + " · " + sym(cur));
                v.setTextViewText(R.id.w_value, hide ? mask : money(in - out, cur));
                v.setTextViewText(R.id.w_sub, hide ? "Balance del mes" : "Ingresos " + money(in, cur) + "  ·  Gastos " + money(out, cur));
                if (!compact && in > 0) {
                    v.setViewVisibility(R.id.w_bar, View.VISIBLE);
                    v.setProgressBar(R.id.w_bar, 100, (int) Math.min(100, Math.round(out / in * 100)), false);
                }
                v.setTextViewText(R.id.w_foot, in > 0 && !hide ? "Has usado el " + Math.round(out / Math.max(in, 1) * 100) + " % de tus ingresos" : "Toca para ver tus movimientos");
                break;
            }
            case INV: {
                section = "inversion";
                if (fin == null) { empty(v, ctx.getString(R.string.w_inv_title)); break; }
                JSONObject in = fin.optJSONObject("inv");
                double total = pick(in.optJSONObject("total"), cur) + pick(in.optJSONObject("ps"), cur) * secs;
                v.setTextViewText(R.id.w_label, "Tus inversiones · " + sym(cur));
                v.setTextViewText(R.id.w_value, hide ? mask : money(total, cur));
                v.setTextViewText(R.id.w_sub, hide ? "Ganancia oculta" : "Ganancia " + money(pick(in.optJSONObject("gain"), cur) + pick(in.optJSONObject("ps"), cur) * secs, cur) + " · +" + money(pick(in.optJSONObject("ps"), cur) * 86400, cur) + " al día");
                JSONObject next = in.optJSONObject("next");
                v.setTextViewText(R.id.w_foot, next != null ? "Próximo vencimiento: " + next.optString("name") + " · " + day(next.optLong("date")) : "Sin vencimientos próximos");
                if (big) {
                    List<JSONObject> items = chosen(in.optJSONArray("items"), sel, 3);
                    for (int i = 0; i < items.size(); i++) {
                        JSONObject it = items.get(i);
                        row(v, i, it.optString("name"), hide ? mask : money(pick(it.optJSONObject("v"), cur), cur) + (it.optDouble("rate", 0) > 0 ? "  " + pct(it.optDouble("rate")) : ""));
                    }
                }
                break;
            }
            case MKT: {
                section = "mercado";
                JSONObject mk = snap != null ? snap.optJSONObject("mkt") : null;
                JSONArray rows = mk != null ? mk.optJSONArray("rows") : null;
                v.setTextViewText(R.id.w_label, ctx.getString(R.string.w_mkt_title));
                if (rows == null || rows.length() == 0) {
                    v.setTextViewText(R.id.w_value, "Sin datos");
                    v.setTextViewText(R.id.w_sub, "Aún no hay tasas verificadas");
                    v.setTextViewText(R.id.w_foot, "Toca para abrir Mercado");
                    break;
                }
                List<JSONObject> L = chosen(rows, sel, compact ? 1 : big ? 4 : 2);
                JSONObject first = L.get(0);
                v.setTextViewText(R.id.w_value, rateTxt(first));
                v.setTextViewText(R.id.w_sub, first.optString("inst") + " · " + first.optString("label"));
                for (int i = 1; i < L.size(); i++) {
                    JSONObject r = L.get(i);
                    row(v, i - 1, r.optString("inst") + " · " + r.optString("label"), rateTxt(r));
                }
                long newest = 0; boolean allReal = true;
                for (JSONObject r : L) { newest = Math.max(newest, r.optLong("date")); if (!"real".equals(r.optString("st"))) allReal = false; }
                v.setTextViewText(R.id.w_foot, (allReal ? "Dato real" : "Incluye datos por verificar") + " · " + day(newest));
                break;
            }
            default: {
                section = "resumen";
                if (fin == null) { empty(v, ctx.getString(R.string.w_net_title)); break; }
                double net = pick(fin.optJSONObject("net"), cur) + pick(fin.optJSONObject("ps"), cur) * secs;
                v.setTextViewText(R.id.w_label, "Patrimonio neto · " + sym(cur));
                v.setTextViewText(R.id.w_value, hide ? mask : money(net, cur));
                v.setTextViewText(R.id.w_sub, hide ? "Montos ocultos" : "Tienes " + money(pick(fin.optJSONObject("assets"), cur), cur) + "  ·  Debes " + money(pick(fin.optJSONObject("debt"), cur), cur));
                String prof = snap.optString("prof", "");
                v.setTextViewText(R.id.w_foot, (prof.isEmpty() ? "" : prof + " · ") + "Actualizado " + new SimpleDateFormat("h:mm a", ES).format(new Date()));
            }
        }
        if (compact) { v.setViewVisibility(R.id.w_sub, View.GONE); }

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("caoba://abrir?seccion=" + section), ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.w_root, pi);
        m.updateAppWidget(id, v);
    }

    private static void empty(RemoteViews v, String title) {
        v.setTextViewText(R.id.w_label, title);
        v.setTextViewText(R.id.w_value, "Abre Caoba");
        v.setTextViewText(R.id.w_sub, "para ver tus datos aquí");
        v.setTextViewText(R.id.w_foot, "Tus datos no salen del teléfono");
    }
    private static void row(RemoteViews v, int i, String l, String val) {
        if (i >= 4) return;
        v.setViewVisibility(ROWS[i], View.VISIBLE);
        v.setTextViewText(ROWS_L[i], l);
        v.setTextViewText(ROWS_V[i], val);
    }
    private static String sym(String cur) { return "USD".equals(cur) ? "US$" : "RD$"; }
    private static String cap(String s) { return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(ES) + s.substring(1); }
    private static String rateTxt(JSONObject r) {
        return r.optBoolean("fx") ? "RD$" + new DecimalFormat("0.00", DecimalFormatSymbols.getInstance(Locale.US)).format(r.optDouble("rate")) + " " + r.optString("rt") : pct(r.optDouble("rate"));
    }
    static List<JSONObject> chosen(JSONArray arr, String sel, int max) {
        List<JSONObject> out = new ArrayList<>();
        if (arr == null) return out;
        List<String> want = sel.isEmpty() ? new ArrayList<>() : Arrays.asList(sel.split(","));
        for (int i = 0; i < arr.length() && out.size() < max; i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o != null && (want.isEmpty() || want.contains(o.optString("id")))) out.add(o);
        }
        if (out.isEmpty()) for (int i = 0; i < arr.length() && out.size() < max; i++) out.add(arr.optJSONObject(i));
        return out;
    }
}
