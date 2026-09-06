package com.ototr.roadtest;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class TrackingService extends Service implements LocationListener {
    static final String ACTION_START = "com.ototr.roadtest.START";
    static final String ACTION_STOP = "com.ototr.roadtest.STOP";
    static final String ACTION_MARK_EVENT = "com.ototr.roadtest.EVENT";
    static final String ACTION_UPDATE = "com.ototr.roadtest.UPDATE";
    static final String ACTION_FINISHED = "com.ototr.roadtest.FINISHED";
    static final String EXTRA_PLATE = "plate";
    static final String EXTRA_WORK_ORDER = "work_order";
    static final String EXTRA_EVENT_TYPE = "event_type";
    static final String EXTRA_SUMMARY = "summary";

    private static final String CHANNEL = "ototr_road_test";
    private static final int NOTIFICATION_ID = 7711;

    private LocationManager locationManager;
    private Location lastAccepted;
    private long lastGpsWallMs;
    private long lastNotificationMs;
    private boolean weatherRequested;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_START.equals(action)) {
            startRoadTest(intent.getStringExtra(EXTRA_PLATE), intent.getStringExtra(EXTRA_WORK_ORDER));
        } else if (ACTION_STOP.equals(action)) {
            finishRoadTest();
        } else if (ACTION_MARK_EVENT.equals(action)) {
            markEvent(intent.getStringExtra(EXTRA_EVENT_TYPE));
        }
        return START_NOT_STICKY;
    }

    private void startRoadTest(String plate, String workOrder) {
        if (RoadTestStore.running) {
            broadcast(ACTION_UPDATE, null);
            return;
        }
        RoadTestStore.reset(plate, workOrder);
        lastAccepted = null;
        lastGpsWallMs = 0;
        weatherRequested = false;
        startForegroundNow();
        requestLocationUpdates();
        broadcast(ACTION_UPDATE, null);
    }

    private void startForegroundNow() {
        Notification n = buildNotification("Yol testi başlatıldı");
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
    }

    private void requestLocationUpdates() {
        boolean coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!coarse && !fine) return;
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 1f, this);
            }
        } catch (Exception ignored) {
        }
        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 1500L, 2f, this);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (!RoadTestStore.running || location == null) return;
        if (location.hasAccuracy() && location.getAccuracy() > 80f) return;

        long now = System.currentTimeMillis();
        if (LocationManager.GPS_PROVIDER.equals(location.getProvider())) {
            lastGpsWallMs = now;
        } else if (now - lastGpsWallMs < 5000) {
            return;
        }

        double segmentM = 0;
        double dtSec = 0;
        if (lastAccepted != null) {
            segmentM = lastAccepted.distanceTo(location);
            if (location.getElapsedRealtimeNanos() > lastAccepted.getElapsedRealtimeNanos()) {
                dtSec = (location.getElapsedRealtimeNanos() - lastAccepted.getElapsedRealtimeNanos()) / 1_000_000_000.0;
            }
            if (dtSec > 0 && segmentM / dtSec > 80.0) return;
        }

        double speedKmh;
        if (location.hasSpeed()) speedKmh = Math.max(0, location.getSpeed() * 3.6);
        else speedKmh = dtSec > 0 ? segmentM / dtSec * 3.6 : 0;

        if (lastAccepted != null && dtSec >= 0.2) {
            RoadTestStore.totalDistanceM += segmentM;
            if (speedKmh > 3.0) {
                RoadTestStore.movingDistanceM += segmentM;
                RoadTestStore.movingTimeMs += Math.round(dtSec * 1000.0);
            }
        }

        RoadTestStore.currentSpeedKmh = speedKmh;
        RoadTestStore.maxSpeedKmh = Math.max(RoadTestStore.maxSpeedKmh, speedKmh);
        RoadTestStore.lastAccuracyM = location.hasAccuracy() ? location.getAccuracy() : 0;
        RoadTestStore.addPoint(new RoadTestStore.GeoPoint(
                location.getTime(), location.getLatitude(), location.getLongitude(), speedKmh,
                location.hasAccuracy() ? location.getAccuracy() : 0));
        lastAccepted = new Location(location);

        if (!weatherRequested) {
            weatherRequested = true;
            fetchWeather(location.getLatitude(), location.getLongitude());
        }

        if (now - lastNotificationMs > 5000) {
            lastNotificationMs = now;
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.notify(NOTIFICATION_ID, buildNotification(String.format(Locale.US,
                    "%.2f km • %.0f km/h", RoadTestStore.totalDistanceM / 1000.0, speedKmh)));
        }
        broadcast(ACTION_UPDATE, null);
    }

    private void markEvent(String type) {
        if (!RoadTestStore.running) return;
        if (type == null || type.trim().isEmpty()) type = "Bulgu";
        double lat = lastAccepted == null ? 0 : lastAccepted.getLatitude();
        double lon = lastAccepted == null ? 0 : lastAccepted.getLongitude();
        RoadTestStore.addEvent(new RoadTestStore.EventRecord(
                System.currentTimeMillis(), type, RoadTestStore.currentSpeedKmh, lat, lon));
        broadcast(ACTION_UPDATE, null);
    }

    private void finishRoadTest() {
        if (!RoadTestStore.running) return;
        RoadTestStore.running = false;
        RoadTestStore.endTimeMs = System.currentTimeMillis();
        RoadTestStore.currentSpeedKmh = 0;
        try {
            locationManager.removeUpdates(this);
        } catch (Exception ignored) {
        }
        saveJson();
        String summary = RoadTestStore.summary();
        broadcast(ACTION_FINISHED, summary);
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf();
    }

    private void saveJson() {
        try {
            JSONObject root = new JSONObject();
            root.put("format", "OtoTR Road Test v1");
            root.put("plate", RoadTestStore.plate);
            root.put("work_order", RoadTestStore.workOrder);
            root.put("start_time_ms", RoadTestStore.startTimeMs);
            root.put("end_time_ms", RoadTestStore.endTimeMs);
            root.put("distance_m", RoadTestStore.totalDistanceM);
            root.put("average_moving_speed_kmh", RoadTestStore.averageMovingSpeedKmh());
            root.put("average_overall_speed_kmh", RoadTestStore.averageOverallSpeedKmh());
            root.put("max_speed_kmh", RoadTestStore.maxSpeedKmh);
            root.put("weather", RoadTestStore.weather);
            root.put("weather_source", "Open-Meteo");

            JSONArray route = new JSONArray();
            List<RoadTestStore.GeoPoint> points = RoadTestStore.copyPoints();
            for (RoadTestStore.GeoPoint p : points) {
                JSONObject o = new JSONObject();
                o.put("time_ms", p.timeMs);
                o.put("lat", p.lat);
                o.put("lon", p.lon);
                o.put("speed_kmh", p.speedKmh);
                o.put("accuracy_m", p.accuracyM);
                route.put(o);
            }
            root.put("route", route);

            JSONArray events = new JSONArray();
            for (RoadTestStore.EventRecord e : RoadTestStore.copyEvents()) {
                JSONObject o = new JSONObject();
                o.put("time_ms", e.timeMs);
                o.put("type", e.type);
                o.put("speed_kmh", e.speedKmh);
                o.put("lat", e.lat);
                o.put("lon", e.lon);
                events.put(o);
            }
            root.put("events", events);

            String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date(RoadTestStore.startTimeMs));
            String safePlate = RoadTestStore.plate.replaceAll("[^A-Za-z0-9]", "");
            File file = new File(getFilesDir(), "roadtest_" + ts + (safePlate.isEmpty() ? "" : "_" + safePlate) + ".json");
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(root.toString(2).getBytes(StandardCharsets.UTF_8));
            }
            RoadTestStore.lastSavedPath = file.getAbsolutePath();
        } catch (Exception ignored) {
        }
    }

    private void fetchWeather(double lat, double lon) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                String endpoint = "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
                        "&longitude=" + lon +
                        "&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto";
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestMethod("GET");
                try (BufferedReader r = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                    JSONObject current = new JSONObject(sb.toString()).getJSONObject("current");
                    double temp = current.optDouble("temperature_2m", Double.NaN);
                    double rain = current.optDouble("precipitation", 0);
                    double wind = current.optDouble("wind_speed_10m", 0);
                    int code = current.optInt("weather_code", -1);
                    RoadTestStore.weather = String.format(Locale.US, "%.1f°C • %s • Yağış %.1f mm • Rüzgar %.0f km/h",
                            temp, weatherCode(code), rain, wind);
                    broadcast(ACTION_UPDATE, null);
                }
            } catch (Exception e) {
                RoadTestStore.weather = "Hava verisi alınamadı";
                broadcast(ACTION_UPDATE, null);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "ototr-weather").start();
    }

    private static String weatherCode(int code) {
        if (code == 0) return "Açık";
        if (code >= 1 && code <= 3) return "Bulutlu";
        if (code == 45 || code == 48) return "Sisli";
        if (code >= 51 && code <= 57) return "Çiseleme";
        if (code >= 61 && code <= 67) return "Yağmur";
        if (code >= 71 && code <= 77) return "Kar";
        if (code >= 80 && code <= 82) return "Sağanak";
        if (code >= 95) return "Fırtına";
        return "Bilinmiyor";
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "OtoTR Yol Testi", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Aktif yol testi GPS kaydı");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        return b.setContentTitle("OtoTR Yol Testi")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }

    private void broadcast(String action, String summary) {
        Intent i = new Intent(action);
        i.setPackage(getPackageName());
        if (summary != null) i.putExtra(EXTRA_SUMMARY, summary);
        sendBroadcast(i);
    }

    @Override
    public void onProviderEnabled(String provider) {
    }

    @Override
    public void onProviderDisabled(String provider) {
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        try {
            locationManager.removeUpdates(this);
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }
}
