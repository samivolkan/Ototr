import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/services/photo_upload_service.dart';
import 'widgets/technician_vehicle_header.dart';

class StartEvidenceScreen extends StatefulWidget {
  const StartEvidenceScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<StartEvidenceScreen> createState() => _StartEvidenceScreenState();
}

class _StartEvidenceScreenState extends State<StartEvidenceScreen> {
  late final TextEditingController _vinController;
  late final TextEditingController _kmController;
  String _vinPhoto = '';
  String _platePhoto = '';
  String _odometerPhoto = '';
  String _transmission = '';
  bool _saving = false;
  StartEvidence? _lastEvidenceSnapshot;
  Future<TechnicianWorkOrder>? _remoteOrderFuture;

  @override
  void initState() {
    super.initState();
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      _remoteOrderFuture = remoteRepository.getById(widget.workOrderId);
    }
    final evidence = remoteRepository == null &&
            AppRepositories.instance.hasLocalTestWorkOrders
        ? AppRepositories.instance.localWorkOrders
            .getById(widget.workOrderId)
            .startEvidence
        : null;
    _vinController = TextEditingController(text: evidence?.vin ?? '');
    _kmController = TextEditingController(
      text: evidence?.odometerKm?.toString() ?? '',
    );
    _vinPhoto = _validPhotoReference(evidence?.vinPhoto ?? '');
    _platePhoto = _validPhotoReference(evidence?.platePhoto ?? '');
    _odometerPhoto = _validPhotoReference(evidence?.odometerPhoto ?? '');
  }

  @override
  void dispose() {
    _vinController.dispose();
    _kmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return FutureBuilder<TechnicianWorkOrder>(
        future: _remoteOrderFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              appBar: const OtotrAppBar(title: 'Araç Başlama İş Emri'),
              backgroundColor: AppColors.grayBg,
              body: Padding(
                padding: const EdgeInsets.all(AppSizes.lg),
                child: OtotrCard(
                  child: Text(
                    'Supabase iş emri alınamadı: ${snapshot.error}',
                    style: const TextStyle(color: AppColors.red),
                  ),
                ),
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Scaffold(
              appBar: OtotrAppBar(title: 'Araç Başlama İş Emri'),
              backgroundColor: AppColors.grayBg,
              body: Center(child: CircularProgressIndicator()),
            );
          }

          final order = snapshot.data!;
          final evidence = order.startEvidence;
          if (_vinController.text.isEmpty && evidence != null) {
            _vinController.text = evidence.vin;
            _kmController.text = evidence.odometerKm?.toString() ?? '';
            _vinPhoto = _validPhotoReference(evidence.vinPhoto);
            _platePhoto = _validPhotoReference(evidence.platePhoto);
            _odometerPhoto = _validPhotoReference(evidence.odometerPhoto);
          }
          return _buildForm(order);
        },
      );
    }

    if (AppRepositories.instance.hasLocalTestWorkOrders) {
      final order =
          AppRepositories.instance.localWorkOrders.getById(widget.workOrderId);
      return _buildForm(order);
    }

    return Scaffold(
      appBar: const OtotrAppBar(title: 'AraÃ§ BaÅŸlama Ä°ÅŸ Emri'),
      backgroundColor: AppColors.grayBg,
      body: Padding(
        padding: const EdgeInsets.all(AppSizes.lg),
        child: OtotrCard(
          child: Text(
            AppRepositories.instance.liveConnectionError ??
                'Canli veri baglantisi yok. Mock/local veri gosterilmiyor.',
            style: const TextStyle(color: AppColors.red),
          ),
        ),
      ),
    );
  }

  Widget _buildForm(TechnicianWorkOrder order) {
    _applyVehicleDefaults(order);
    final previewEvidence = _buildEvidence();
    final missing = previewEvidence.missingReasons();

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Araç Başlama İş Emri'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            message: 'Bu kapı tamamlanmadan teknik kontrol formu açılmaz.',
          ),
          _PhotoGateCard(
            title: 'Şasi Etiketi Fotoğrafı',
            isDone: _validPhotoReference(_vinPhoto).isNotEmpty,
            isBusy: _saving,
            onTap: () => _captureStartEvidencePhoto(_StartEvidencePhoto.vin),
          ),
          _PhotoGateCard(
            title: 'Plaka Fotoğrafı',
            isDone: _validPhotoReference(_platePhoto).isNotEmpty,
            isBusy: _saving,
            onTap: () => _captureStartEvidencePhoto(_StartEvidencePhoto.plate),
          ),
          _PhotoGateCard(
            title: 'KM Ekran Fotoğrafı',
            isDone: _validPhotoReference(_odometerPhoto).isNotEmpty,
            isBusy: _saving,
            onTap: () =>
                _captureStartEvidencePhoto(_StartEvidencePhoto.odometer),
          ),
          if (_saving)
            const Padding(
              padding: EdgeInsets.only(bottom: AppSizes.md),
              child: LinearProgressIndicator(),
            ),
          OtotrCard(
            child: Column(
              children: [
                TextField(
                  controller: _vinController,
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 17,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(17),
                    FilteringTextInputFormatter.allow(RegExp('[a-zA-Z0-9]')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Şasi / VIN',
                    helperText: '17 karakterden fazla girilemez.',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSizes.md),
                TextField(
                  controller: _kmController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Giriş KM'),
                ),
                const SizedBox(height: AppSizes.md),
                Row(
                  children: [
                    Expanded(
                      child: _TransmissionChoice(
                        label: 'Otomatik',
                        isSelected: _transmission == 'otomatik',
                        onTap: () => setState(() => _transmission = 'otomatik'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _TransmissionChoice(
                        label: 'Manuel',
                        isSelected: _transmission == 'manuel',
                        onTap: () => setState(() => _transmission = 'manuel'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (missing.isNotEmpty)
            OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Eksik Kanıtlar',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  for (final item in missing)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text('• $item'),
                    ),
                ],
              ),
            ),
          OtotrPrimaryButton(
            label: 'Araç İş Emri Açılış Başlat',
            icon: Icons.save,
            onPressed: _saving ? null : () => _saveEvidence(previewEvidence),
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Görevlerime Dön',
            icon: Icons.arrow_back,
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Future<void> _saveEvidence(StartEvidence previewEvidence) async {
    if (_saving) {
      return;
    }
    _lastEvidenceSnapshot = previewEvidence;
    setState(() => _saving = true);
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    try {
      if (remoteRepository != null) {
        final saved = await remoteRepository.saveStartEvidence(
          widget.workOrderId,
          previewEvidence,
        );
        if (!mounted) {
          return;
        }
        if (!saved.isStartEvidenceComplete) {
          _showMessage('Araç başlama iş emri için eksik alan var.');
          setState(() {
            _remoteOrderFuture = remoteRepository.getById(widget.workOrderId);
          });
          return;
        }
        Navigator.pushReplacementNamed(
          context,
          AppRoutes.technicianTasks,
          arguments: widget.workOrderId,
        );
        return;
      }

      if (AppRepositories.instance.hasLocalTestWorkOrders) {
        final repository = AppRepositories.instance.localWorkOrders;
        final saved = repository.saveStartEvidence(
          widget.workOrderId,
          previewEvidence,
        );
        if (!saved.isStartEvidenceComplete) {
          _showMessage('Araç başlama iş emri için eksik alan var.');
          setState(() {});
          return;
        }
        Navigator.pushReplacementNamed(
          context,
          AppRoutes.technicianTasks,
          arguments: widget.workOrderId,
        );
        return;
      }

      throw StateError('Canli veri baglantisi yok.');
    } catch (error) {
      if (mounted) {
        _showMessage(error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _captureStartEvidencePhoto(_StartEvidencePhoto type) async {
    if (_saving) {
      return;
    }
    final picked = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (picked == null) {
      return;
    }

    setState(() {
      switch (type) {
        case _StartEvidencePhoto.vin:
          _vinPhoto = picked.path;
          break;
        case _StartEvidencePhoto.plate:
          _platePhoto = picked.path;
          break;
        case _StartEvidencePhoto.odometer:
          _odometerPhoto = picked.path;
          break;
      }
    });
    _showMessage('Fotoğraf alındı. Yükleme arka planda devam ediyor.');
    unawaited(_uploadStartEvidencePhoto(type, picked.path, _buildEvidence()));
  }

  Future<void> _uploadStartEvidencePhoto(
    _StartEvidencePhoto type,
    String localPath,
    StartEvidence evidenceSnapshot,
  ) async {
    final supabaseClient = _activeSupabaseClient();
    if (supabaseClient == null) {
      return;
    }
    try {
      final uploader = PhotoUploadService(client: supabaseClient);
      final result = await uploader.uploadReportMedia(
        workOrderId: widget.workOrderId,
        itemId: type.storageItemId,
        localPath: localPath,
      );
      if (!result.uploaded) {
        if (mounted) {
          _showMessage(
              'Fotoğraf arka planda yüklenemedi. Tekrar çekebilirsiniz.');
        }
        return;
      }

      if (mounted) {
        setState(() {
          switch (type) {
            case _StartEvidencePhoto.vin:
              if (_vinPhoto == localPath) _vinPhoto = result.reference;
              break;
            case _StartEvidencePhoto.plate:
              if (_platePhoto == localPath) _platePhoto = result.reference;
              break;
            case _StartEvidencePhoto.odometer:
              if (_odometerPhoto == localPath) {
                _odometerPhoto = result.reference;
              }
              break;
          }
        });
      }

      final remoteRepository = AppRepositories.instance.remoteWorkOrders;
      if (remoteRepository != null) {
        final uploadedEvidence = _evidenceWithPhoto(
          _lastEvidenceSnapshot ?? evidenceSnapshot,
          type,
          result.reference,
        );
        _lastEvidenceSnapshot = uploadedEvidence;
        await remoteRepository.saveStartEvidence(
          widget.workOrderId,
          uploadedEvidence,
        );
      }
    } catch (error) {
      if (mounted) {
        _showMessage(error.toString());
      }
    }
  }

  StartEvidence _evidenceWithPhoto(
    StartEvidence evidence,
    _StartEvidencePhoto type,
    String reference,
  ) {
    switch (type) {
      case _StartEvidencePhoto.vin:
        return evidence.copyWith(vinPhoto: reference);
      case _StartEvidencePhoto.plate:
        return evidence.copyWith(platePhoto: reference);
      case _StartEvidencePhoto.odometer:
        return evidence.copyWith(odometerPhoto: reference);
    }
  }

  void _applyVehicleDefaults(TechnicianWorkOrder order) {
    if (_transmission.isNotEmpty) {
      return;
    }
    _transmission = _normalizeTransmission(order.vehicleTransmission);
  }

  String _normalizeTransmission(String value) {
    final normalized = value.toLowerCase();
    if (normalized.contains('oto') || normalized.contains('auto')) {
      return 'otomatik';
    }
    if (normalized.contains('man')) {
      return 'manuel';
    }
    return '';
  }

  SupabaseClient? _activeSupabaseClient() {
    if (AppRepositories.instance.remoteWorkOrders == null) {
      return null;
    }
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  StartEvidence _buildEvidence() {
    final currentUser =
        AppRepositories.instance.remoteWorkOrders?.currentUser ??
            (AppRepositories.instance.hasLocalTestWorkOrders
                ? AppRepositories.instance.localWorkOrders.currentUser
                : null);

    return StartEvidence(
      workOrderId: widget.workOrderId,
      vin: _vinController.text.trim().toUpperCase(),
      vinPhoto: _validPhotoReference(_vinPhoto),
      platePhoto: _validPhotoReference(_platePhoto),
      odometerKm: int.tryParse(_kmController.text.trim()),
      odometerPhoto: _validPhotoReference(_odometerPhoto),
      capturedAt: DateTime.now(),
      capturedBy: currentUser?.id ?? '',
      deviceId: 'android-demo-device',
      gpsApprox: 'Bursa Nilüfer',
    );
  }

  String _validPhotoReference(String reference) {
    const legacyPlaceholders = {
      'local/vin-label.jpg',
      'local/odometer.jpg',
    };
    return legacyPlaceholders.contains(reference) ? '' : reference;
  }
}

class _PhotoGateCard extends StatelessWidget {
  const _PhotoGateCard({
    required this.title,
    required this.isDone,
    required this.isBusy,
    required this.onTap,
  });

  final String title;
  final bool isDone;
  final bool isBusy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      onTap: isBusy ? null : onTap,
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle : Icons.camera_alt,
            color: isDone ? AppColors.success : AppColors.red,
            size: 34,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
            ),
          ),
          Text(isDone ? 'Alındı' : 'Çek'),
        ],
      ),
    );
  }
}

enum _StartEvidencePhoto {
  vin('start-evidence-vin'),
  plate('start-evidence-plate'),
  odometer('start-evidence-odometer');

  const _StartEvidencePhoto(this.storageItemId);

  final String storageItemId;
}

class _TransmissionChoice extends StatelessWidget {
  const _TransmissionChoice({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEAF7F0) : const Color(0xFFFFF1F2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.success : const Color(0xFFF9C7CD),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppColors.success : AppColors.red,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}
