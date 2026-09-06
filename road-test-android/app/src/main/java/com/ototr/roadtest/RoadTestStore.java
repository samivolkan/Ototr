package com.ototr.roadtest;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class RoadTestStore {
    static boolean running;
    static long startTimeMs;
    static long endTimeMs;
    static double totalDistanceM;
    static double movingDistanceM;
    static long movingTimeMs;
    static double currentSpeedKmh;
    static double maxSpeedKmh;
    static float lastAccuracyM;
    static String weather = "İlk GPS konumu bekleniyor";
    static String plate = "";
    static String workOrder = "";
    static String lastSavedPath = "";

    private static final ArrayList<GeoPoint> points = new ArrayList<>();
    private static final ArrayList<EventRecord> events = new ArrayList<>();

    static synchronized void reset(String p, String w) {
        running = true;
        startTimeMs = System.currentTimeMillis();
        endTimeMs = 0;
        totalDistanceM = 0;
        movingDistanceM = 0;
        movingTimeMs = 0;
        currentSpeedKmh = 0;
        maxSpeedKmh = 0;
        lastAccuracyM = 0;
        weather = "Hava verisi bekleniyor";
        plate = p == null ? "" : p;
        workOrder = w == null ? "" : w;
        lastSavedPath = "";
        points.clear();
        events.clear();
    }

    static synchronized void addPoint(GeoPoint p) {
        points.add(p);
        if (points.size() > 15000) points.remove(0);
    }

    static synchronized void addEvent(EventRecord e) {
        events.add(e);
    }

    static synchronized List<GeoPoint> copyPoints() {
        return new ArrayList<>(points);
    }

    static synchronized List<EventRecord> copyEvents() {
        return new ArrayList<>(events);
    }

    static long elapsedMs() {
        if (startTimeMs == 0) return 0;
        long end = running ? System.currentTimeMillis() : (endTimeMs > 0 ? endTimeMs : System.currentTimeMillis());
        return Math.max(0, end - startTimeMs);
    }

    static double averageMovingSpeedKmh() {
        if (movingTimeMs <= 0) return 0;
        return movingDistanceM / (movingTimeMs / 1000.0) * 3.6;
    }

    static double averageOverallSpeedKmh() {
        long elapsed = elapsedMs();
        if (elapsed <= 0) return 0;
        return totalDistanceM / (elapsed / 1000.0) * 3.6;
    }

    static String summary() {
        return "OtoTR YOL TESTİ\n" +
                "Plaka: " + (plate.isEmpty() ? "—" : plate) + "\n" +
                "İş Emri: " + (workOrder.isEmpty() ? "—" : workOrder) + "\n" +
                String.format(Locale.US, "Mesafe: %.2f km\n", totalDistanceM / 1000.0) +
                String.format(Locale.US, "Ort. hareket hızı: %.1f km/h\n", averageMovingSpeedKmh()) +
                String.format(Locale.US, "Maks. hız: %.1f km/h\n", maxSpeedKmh) +
                "Hava: " + weather + "\n" +
                "İşaretlenen bulgu: " + copyEvents().size();
    }

    static final class GeoPoint {
        final long timeMs;
        final double lat;
        final double lon;
        final double speedKmh;
        final float accuracyM;

        GeoPoint(long timeMs, double lat, double lon, double speedKmh, float accuracyM) {
            this.timeMs = timeMs;
            this.lat = lat;
            this.lon = lon;
            this.speedKmh = speedKmh;
            this.accuracyM = accuracyM;
        }
    }

    static final class EventRecord {
        final long timeMs;
        final String type;
        final double speedKmh;
        final double lat;
        final double lon;

        EventRecord(long timeMs, String type, double speedKmh, double lat, double lon) {
            this.timeMs = timeMs;
            this.type = type;
            this.speedKmh = speedKmh;
            this.lat = lat;
            this.lon = lon;
        }
    }
}
