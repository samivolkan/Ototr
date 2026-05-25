import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/services/photo_upload_service.dart';

void main() {
  test('Supabase yoksa fotoğraf yerel referansla kaydedilir', () async {
    final file = File(
      '${Directory.systemTemp.path}/ototr-photo-upload-test-${DateTime.now().millisecondsSinceEpoch}.jpg',
    );
    addTearDown(() {
      if (file.existsSync()) {
        file.deleteSync();
      }
    });
    await file.writeAsBytes([1, 2, 3]);

    const service = PhotoUploadService();
    final result = await service.uploadReportPhoto(
      workOrderId: 'wo-2026-0001',
      itemId: 'motor-1',
      localPath: file.path,
    );

    expect(result.status, PhotoUploadStatus.localFallback);
    expect(result.reference, file.path);
    expect(result.uploaded, isFalse);
  });
}
