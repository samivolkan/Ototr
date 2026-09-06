package com.ototr.roadtest;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;
import android.view.View;

import java.util.ArrayList;
import java.util.List;

final class RouteView extends View {
    private static final int RED = Color.rgb(215, 25, 32);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pathPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pointPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private List<RoadTestStore.GeoPoint> points = new ArrayList<>();

    RouteView(Context context) {
        super(context);
        gridPaint.setColor(Color.rgb(55, 55, 55));
        gridPaint.setStrokeWidth(1f);
        pathPaint.setColor(RED);
        pathPaint.setStyle(Paint.Style.STROKE);
        pathPaint.setStrokeWidth(7f);
        pathPaint.setStrokeCap(Paint.Cap.ROUND);
        pathPaint.setStrokeJoin(Paint.Join.ROUND);
        pointPaint.setStyle(Paint.Style.FILL);
        textPaint.setColor(Color.rgb(185, 185, 185));
        textPaint.setTextSize(28f);
        textPaint.setTypeface(Typeface.DEFAULT_BOLD);
    }

    void setPoints(List<RoadTestStore.GeoPoint> value) {
        points = value == null ? new ArrayList<>() : value;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();

        int gridX = Math.max(60, w / 6);
        int gridY = Math.max(60, h / 5);
        for (int x = 0; x < w; x += gridX) canvas.drawLine(x, 0, x, h, gridPaint);
        for (int y = 0; y < h; y += gridY) canvas.drawLine(0, y, w, y, gridPaint);

        if (points.size() < 2) {
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("GPS ROTA BEKLENİYOR", w / 2f, h / 2f, textPaint);
            return;
        }

        double meanLat = 0;
        for (RoadTestStore.GeoPoint p : points) meanLat += p.lat;
        meanLat /= points.size();
        double cos = Math.cos(Math.toRadians(meanLat));

        double minX = Double.MAX_VALUE;
        double maxX = -Double.MAX_VALUE;
        double minY = Double.MAX_VALUE;
        double maxY = -Double.MAX_VALUE;
        for (RoadTestStore.GeoPoint p : points) {
            double x = p.lon * cos;
            double y = p.lat;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        double spanX = Math.max(0.00001, maxX - minX);
        double spanY = Math.max(0.00001, maxY - minY);
        float margin = 34f;
        float drawW = Math.max(1f, w - margin * 2);
        float drawH = Math.max(1f, h - margin * 2);
        float scale = (float) Math.min(drawW / spanX, drawH / spanY);
        float usedW = (float) (spanX * scale);
        float usedH = (float) (spanY * scale);
        float offsetX = (w - usedW) / 2f;
        float offsetY = (h - usedH) / 2f;

        Path path = new Path();
        for (int i = 0; i < points.size(); i++) {
            RoadTestStore.GeoPoint p = points.get(i);
            float px = offsetX + (float) ((p.lon * cos - minX) * scale);
            float py = offsetY + usedH - (float) ((p.lat - minY) * scale);
            if (i == 0) path.moveTo(px, py); else path.lineTo(px, py);
        }
        canvas.drawPath(path, pathPaint);

        RoadTestStore.GeoPoint first = points.get(0);
        RoadTestStore.GeoPoint last = points.get(points.size() - 1);
        float fx = offsetX + (float) ((first.lon * cos - minX) * scale);
        float fy = offsetY + usedH - (float) ((first.lat - minY) * scale);
        float lx = offsetX + (float) ((last.lon * cos - minX) * scale);
        float ly = offsetY + usedH - (float) ((last.lat - minY) * scale);

        pointPaint.setColor(Color.WHITE);
        canvas.drawCircle(fx, fy, 10f, pointPaint);
        pointPaint.setColor(RED);
        canvas.drawCircle(lx, ly, 11f, pointPaint);
    }
}
