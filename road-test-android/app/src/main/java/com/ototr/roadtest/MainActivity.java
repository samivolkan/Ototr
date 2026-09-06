package com.ototr.roadtest;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int REQ = 41;
    private static final int RED = Color.rgb(215, 25, 32);
    private static final int DARK = Color.rgb(20, 20, 20);
    private static final int GREY = Color.rgb(92, 92, 92);

    private EditText plate;
    private EditText workOrder;
    private TextView status;
    private TextView duration;
    private TextView distance;
    private TextView currentSpeed;
    private TextView avgSpeed;
    private TextView maxSpeed;
    private TextView gps;
    private TextView weather;
    private TextView eventLog;
    private TextView saved;
    private Button start;
    private Button stop;
    private RouteView route;
    private boolean pendingStart;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            refresh();
            handler.postDelayed(this, 750);
        }
    };

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            refresh();
            if (TrackingService.ACTION_FINISHED.equals(intent.getAction())) {
                String summary = intent.getStringExtra(TrackingService.EXTRA_SUMMARY);
                showFinished(summary == null ? RoadTestStore.summary() : summary);
            }
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(DARK);
        getWindow().setNavigationBarColor(DARK);
        setContentView(buildScreen());
        refresh();
    }

    @Override protected void onStart() {
        super.onStart();
        IntentFilter f = new IntentFilter();
        f.addAction(TrackingService.ACTION_UPDATE);
        f.addAction(TrackingService.ACTION_FINISHED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(receiver, f);
        handler.post(ticker);
    }

    @Override protected void onStop() {
        handler.removeCallbacks(ticker);
        try { unregisterReceiver(receiver); } catch (Exception ignored) {}
        super.onStop();
    }

    private View buildScreen() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(244, 244, 244));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(28));
        scroll.addView(root);

        TextView logo = new TextView(this);
        SpannableString s = new SpannableString("OtoTR");
        s.setSpan(new ForegroundColorSpan(RED), 3, 5, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        logo.setText(s);
        logo.setTextColor(DARK);
        logo.setTextSize(34);
        logo.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(logo);
        root.addView(text("YOL TESTİ KANIT KAYDI", 13, GREY, true));

        status = text("TEST HAZIR", 11, Color.WHITE, true);
        status.setGravity(Gravity.CENTER);
        status.setPadding(dp(12), dp(8), dp(12), dp(8));
        status.setBackground(round(DARK, 18));
        margin(root, status, 0, 10, 0, 12);

        LinearLayout vehicle = card();
        vehicle.addView(text("ARAÇ / İŞ EMRİ", 11, GREY, true));
        plate = input("Plaka (örn. 16 ABC 123)");
        workOrder = input("İş Emri No");
        vehicle.addView(plate);
        vehicle.addView(workOrder);
        margin(root, vehicle, 0, 0, 0, 12);

        route = new RouteView(this);
        route.setBackground(round(Color.rgb(28, 28, 28), 16));
        root.addView(route, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(250)));
        margin(root, text("GPS ROTA İZİ • Başlangıç beyaz, son konum kırmızı", 10, GREY, false), 0, 5, 0, 12);

        LinearLayout stats1 = new LinearLayout(this);
        stats1.setOrientation(LinearLayout.HORIZONTAL);
        duration = stat(stats1, "00:00", "SÜRE");
        distance = stat(stats1, "0.00 km", "MESAFE");
        currentSpeed = stat(stats1, "0", "ANLIK km/h");
        root.addView(stats1);

        LinearLayout stats2 = new LinearLayout(this);
        stats2.setOrientation(LinearLayout.HORIZONTAL);
        avgSpeed = stat(stats2, "0", "ORT. km/h");
        maxSpeed = stat(stats2, "0", "MAKS. km/h");
        gps = stat(stats2, "—", "GPS");
        margin(root, stats2, 0, 6, 0, 12);

        weather = text("Hava: İlk GPS konumu bekleniyor", 13, DARK, true);
        weather.setPadding(dp(12), dp(12), dp(12), dp(12));
        weather.setBackground(round(Color.WHITE, 14));
        margin(root, weather, 0, 0, 0, 12);

        root.addView(text("TEST SIRASINDA BULGU İŞARETLE", 11, GREY, true));
        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        String[] names = {"Fren", "Direksiyon", "Süspansiyon", "Şanzıman", "Motor", "Titreşim", "Ses", "Normal"};
        for (String name : names) {
            Button b = button(name, Color.WHITE, DARK);
            b.setAllCaps(false);
            b.setOnClickListener(v -> mark(name));
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = dp(50);
            lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            lp.setMargins(dp(3), dp(3), dp(3), dp(3));
            grid.addView(b, lp);
        }
        margin(root, grid, 0, 5, 0, 8);

        eventLog = text("Henüz bulgu işaretlenmedi.", 11, GREY, false);
        eventLog.setPadding(dp(12), dp(10), dp(12), dp(10));
        eventLog.setBackground(round(Color.WHITE, 14));
        margin(root, eventLog, 0, 0, 0, 12);

        start = button("YOL TESTİNİ BAŞLAT", RED, Color.WHITE);
        start.setOnClickListener(v -> requestStart());
        root.addView(start, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58)));

        stop = button("TESTİ BİTİR VE KAYDET", DARK, Color.WHITE);
        stop.setOnClickListener(v -> confirmStop());
        margin(root, stop, 0, 8, 0, 8);

        Button share = button("SON TEST ÖZETİNİ PAYLAŞ", Color.rgb(90, 90, 90), Color.WHITE);
        share.setOnClickListener(v -> shareSummary());
        margin(root, share, 0, 0, 0, 8);

        saved = text("Ham kayıt test bitiminde JSON olarak cihazda saklanır.", 10, GREY, false);
        saved.setGravity(Gravity.CENTER);
        root.addView(saved);
        TextView footer = text("OtoTR • Tarafsız Rapor, Gerçek Güvence.", 10, GREY, false);
        footer.setGravity(Gravity.CENTER);
        margin(root, footer, 0, 16, 0, 0);
        return scroll;
    }

    private void requestStart() {
        if (RoadTestStore.running) {
            Toast.makeText(this, "Yol testi zaten devam ediyor.", Toast.LENGTH_SHORT).show();
            return;
        }
        pendingStart = true;
        ArrayList<String> req = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            req.add(Manifest.permission.ACCESS_FINE_LOCATION);
            req.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            req.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (req.isEmpty()) launchService();
        else requestPermissions(req.toArray(new String[0]), REQ);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ || !pendingStart) return;
        pendingStart = false;
        boolean ok = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (ok) launchService();
        else new AlertDialog.Builder(this).setTitle("Konum izni gerekli")
                .setMessage("Rota, hız ve mesafe kaydı için konum izni gereklidir.")
                .setPositiveButton("Tamam", null).show();
    }

    private void launchService() {
        LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        boolean enabled = false;
        try {
            enabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception ignored) {}
        if (!enabled) {
            new AlertDialog.Builder(this).setTitle("Konum kapalı")
                    .setMessage("GPS/konum hizmetini açıp tekrar deneyin.")
                    .setPositiveButton("Konumu Aç", (d, w) -> startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)))
                    .setNegativeButton("İptal", null).show();
            return;
        }
        Intent i = new Intent(this, TrackingService.class);
        i.setAction(TrackingService.ACTION_START);
        i.putExtra(TrackingService.EXTRA_PLATE, plate.getText().toString().trim());
        i.putExtra(TrackingService.EXTRA_WORK_ORDER, workOrder.getText().toString().trim());
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
    }

    private void confirmStop() {
        if (!RoadTestStore.running) return;
        new AlertDialog.Builder(this).setTitle("Yol testini bitir?")
                .setMessage("Rota, hız, hava ve bulgu kayıtları kaydedilecek.")
                .setNegativeButton("Devam Et", null)
                .setPositiveButton("Bitir ve Kaydet", (d, w) -> {
                    Intent i = new Intent(this, TrackingService.class);
                    i.setAction(TrackingService.ACTION_STOP);
                    startService(i);
                }).show();
    }

    private void mark(String name) {
        if (!RoadTestStore.running) {
            Toast.makeText(this, "Önce yol testini başlatın.", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent i = new Intent(this, TrackingService.class);
        i.setAction(TrackingService.ACTION_MARK_EVENT);
        i.putExtra(TrackingService.EXTRA_EVENT_TYPE, name);
        startService(i);
        Toast.makeText(this, name + " işaretlendi", Toast.LENGTH_SHORT).show();
    }

    private void refresh() {
        duration.setText(formatDuration(RoadTestStore.elapsedMs()));
        distance.setText(String.format(Locale.US, "%.2f km", RoadTestStore.totalDistanceM / 1000.0));
        currentSpeed.setText(String.format(Locale.US, "%.0f", RoadTestStore.currentSpeedKmh));
        avgSpeed.setText(String.format(Locale.US, "%.0f", RoadTestStore.averageMovingSpeedKmh()));
        maxSpeed.setText(String.format(Locale.US, "%.0f", RoadTestStore.maxSpeedKmh));
        gps.setText(RoadTestStore.lastAccuracyM > 0 ? String.format(Locale.US, "±%.0f m", RoadTestStore.lastAccuracyM) : "—");
        weather.setText("Hava: " + RoadTestStore.weather);
        route.setPoints(RoadTestStore.copyPoints());

        boolean active = RoadTestStore.running;
        status.setText(active ? "● TEST DEVAM EDİYOR" : (RoadTestStore.endTimeMs > 0 ? "✓ SON TEST KAYDEDİLDİ" : "TEST HAZIR"));
        status.setBackground(round(active ? RED : DARK, 18));
        start.setEnabled(!active);
        start.setAlpha(active ? 0.45f : 1f);
        stop.setEnabled(active);
        stop.setAlpha(active ? 1f : 0.45f);
        plate.setEnabled(!active);
        workOrder.setEnabled(!active);

        List<RoadTestStore.EventRecord> events = RoadTestStore.copyEvents();
        if (events.isEmpty()) eventLog.setText("Henüz bulgu işaretlenmedi.");
        else {
            SimpleDateFormat tf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            StringBuilder out = new StringBuilder();
            for (int i = Math.max(0, events.size() - 6); i < events.size(); i++) {
                RoadTestStore.EventRecord e = events.get(i);
                if (out.length() > 0) out.append('\n');
                out.append("• ").append(tf.format(new Date(e.timeMs))).append("  ")
                        .append(e.type).append("  • ")
                        .append(String.format(Locale.US, "%.0f km/h", e.speedKmh));
            }
            eventLog.setText(out.toString());
        }
        if (RoadTestStore.lastSavedPath != null && !RoadTestStore.lastSavedPath.isEmpty()) {
            saved.setText("Kayıt: " + RoadTestStore.lastSavedPath.substring(RoadTestStore.lastSavedPath.lastIndexOf('/') + 1));
        }
    }

    private void showFinished(String summary) {
        new AlertDialog.Builder(this).setTitle("Yol testi kaydedildi")
                .setMessage(summary).setPositiveButton("Tamam", null)
                .setNeutralButton("Paylaş", (d, w) -> shareSummary()).show();
    }

    private void shareSummary() {
        if (RoadTestStore.startTimeMs == 0) {
            Toast.makeText(this, "Henüz yol testi kaydı yok.", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_SUBJECT, "OtoTR Yol Testi Özeti");
        i.putExtra(Intent.EXTRA_TEXT, RoadTestStore.summary());
        startActivity(Intent.createChooser(i, "Yol testi özetini paylaş"));
    }

    private TextView stat(LinearLayout row, String value, String label) {
        LinearLayout box = card();
        box.setGravity(Gravity.CENTER);
        TextView v = text(value, 19, DARK, true);
        v.setGravity(Gravity.CENTER);
        TextView l = text(label, 9, GREY, true);
        l.setGravity(Gravity.CENTER);
        box.addView(v);
        box.addView(l);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, dp(76), 1f);
        p.setMargins(dp(3), dp(3), dp(3), dp(3));
        row.addView(box, p);
        return v;
    }

    private LinearLayout card() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(12), dp(10), dp(12), dp(10));
        l.setBackground(round(Color.WHITE, 14));
        return l;
    }

    private EditText input(String hint) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setSingleLine(true);
        e.setTextColor(DARK);
        e.setHintTextColor(Color.rgb(150, 150, 150));
        e.setTextSize(15);
        return e;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private Button button(String value, int bg, int fg) {
        Button b = new Button(this);
        b.setText(value);
        b.setTextColor(fg);
        b.setTextSize(13);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setBackground(round(bg, 14));
        return b;
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radius));
        return g;
    }

    private void margin(LinearLayout parent, View v, int l, int t, int r, int b) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        p.setMargins(dp(l), dp(t), dp(r), dp(b));
        parent.addView(v, p);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private static String formatDuration(long ms) {
        long s = Math.max(0, ms / 1000);
        long h = s / 3600;
        long m = (s % 3600) / 60;
        long sec = s % 60;
        return h > 0 ? String.format(Locale.US, "%02d:%02d:%02d", h, m, sec) : String.format(Locale.US, "%02d:%02d", m, sec);
    }
}
