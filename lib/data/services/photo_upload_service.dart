import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

enum PhotoUploadStatus { uploaded, localFallback }

class PhotoUploadResult {
  const PhotoUploadResult({
    required this.reference,
    required this.status,
    required this.localPath,
  });

  final String reference;
  final PhotoUploadStatus status;
  final String localPath;

  bool get uploaded => status == PhotoUploadStatus.uploaded;
}

class PhotoUploadService {
  const PhotoUploadService({
    this.client,
    this.bucketName = 'report-media',
  });

  final SupabaseClient? client;
  final String bucketName;

  Future<PhotoUploadResult> uploadReportPhoto({
    required String workOrderId,
    required String itemId,
    required String localPath,
  }) async {
    return uploadReportMedia(
      workOrderId: workOrderId,
      itemId: itemId,
      localPath: localPath,
    );
  }

  Future<PhotoUploadResult> uploadReportMedia({
    required String workOrderId,
    required String itemId,
    required String localPath,
  }) async {
    final file = File(localPath);
    if (!await file.exists()) {
      return PhotoUploadResult(
        reference: localPath,
        status: PhotoUploadStatus.localFallback,
        localPath: localPath,
      );
    }

    final supabase = client;
    if (supabase == null) {
      return PhotoUploadResult(
        reference: localPath,
        status: PhotoUploadStatus.localFallback,
        localPath: localPath,
      );
    }

    final extension = _extension(localPath);
    final storagePath =
        'work-orders/$workOrderId/report/$itemId/${DateTime.now().millisecondsSinceEpoch}$extension';
    try {
      await supabase.storage.from(bucketName).upload(
            storagePath,
            file,
            fileOptions: FileOptions(
              upsert: true,
              contentType: _contentType(extension),
            ),
          );
      return PhotoUploadResult(
        reference: 'storage://$bucketName/$storagePath',
        status: PhotoUploadStatus.uploaded,
        localPath: localPath,
      );
    } catch (_) {
      return PhotoUploadResult(
        reference: localPath,
        status: PhotoUploadStatus.localFallback,
        localPath: localPath,
      );
    }
  }

  String _extension(String path) {
    final dotIndex = path.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex == path.length - 1) {
      return '.jpg';
    }
    return path.substring(dotIndex).toLowerCase();
  }

  String _contentType(String extension) {
    switch (extension) {
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.heic':
      case '.heif':
        return 'image/heic';
      case '.mp4':
        return 'video/mp4';
      case '.mov':
        return 'video/quicktime';
      case '.webm':
        return 'video/webm';
      default:
        return 'image/jpeg';
    }
  }
}
