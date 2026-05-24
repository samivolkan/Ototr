import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import 'widgets/technician_vehicle_header.dart';

class StartEvidenceScreen extends StatefulWidget {
  const StartEvidenceScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<StartEvidenceScreen> createState() => _StartEvidenceScreenState();
}

class _StartEvidenceScreenState extends State<StartEvidenceScreen> {
  final _repository = DummyWorkOrderRepository.instance;
  late final TextEditingController _vinController;
  late final TextEditingController _kmController;
  String _vinPhoto = '';
  String _platePhoto = '';
  String _odometerPhoto = '';
  String _transmission = '';
  Future<TechnicianWorkOrder>? _remoteOrderFuture;

  @override
  void initState() {
    super.initState();
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      _remoteOrderFuture = remoteRepository.getById(widget.workOrderId);
    }
    final evidence = remoteRepository == null
        ? _repository.getById(widget.workOrderId).startEvidence
        : null;
    _vinController = TextEditingController(text: evidence?.vin ?? '');
    _kmController = TextEditingController(
      text: evidence?.odometerKm?.toString() ?? '',
    );
    _vinPhoto = evidence?.vinPhoto ?? '';
    _platePhoto = evidence?.platePhoto ?? '';
    _odometerPhoto = evidence?.odometerPhoto ?? '';
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
              appBar: const OtotrAppBar(title: 'İşe Başlama Kanıtı'),
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
              appBar: OtotrAppBar(title: 'İşe Başlama Kanıtı'),
              backgroundColor: AppColors.grayBg,
              body: Center(child: CircularProgressIndicator()),
            );
          }

          final order = snapshot.data!;
          final evidence = order.startEvidence;
          if (_vinController.text.isEmpty && evidence != null) {
            _vinController.text = evidence.vin;
            _kmController.text = evidence.odometerKm?.toString() ?? '';
            _vinPhoto = evidence.vinPhoto;
            _platePhoto = evidence.platePhoto;
            _odometerPhoto = evidence.odometerPhoto;
          }
          return _buildForm(order);
        },
      );
    }

    final order = _repository.getById(widget.workOrderId);
    return _buildForm(order);
  }

  Widget _buildForm(TechnicianWorkOrder order) {
    final previewEvidence = _buildEvidence();
    final missing = previewEvidence.missingReasons();

    return Scaffold(
      appBar: const OtotrAppBar(title: 'İşe Başlama Kanıtı'),
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
            isDone: _vinPhoto.isNotEmpty,
            onTap: () => setState(() => _vinPhoto = 'local/vin-label.jpg'),
          ),
          _PhotoGateCard(
            title: 'Plaka Fotoğrafı',
            isDone: _platePhoto.isNotEmpty,
            onTap: () => setState(() => _platePhoto = 'local/plate.jpg'),
          ),
          _PhotoGateCard(
            title: 'KM Ekran Fotoğrafı',
            isDone: _odometerPhoto.isNotEmpty,
            onTap: () => setState(() => _odometerPhoto = 'local/odometer.jpg'),
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
                DropdownButtonFormField<String>(
                  initialValue: _transmission.isEmpty ? null : _transmission,
                  decoration: const InputDecoration(labelText: 'Vites Tipi'),
                  items: const [
                    DropdownMenuItem(
                        value: 'otomatik', child: Text('Otomatik')),
                    DropdownMenuItem(value: 'manuel', child: Text('Manuel')),
                  ],
                  onChanged: (value) =>
                      setState(() => _transmission = value ?? ''),
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
            label: 'Kanıtları Kaydet',
            icon: Icons.save,
            onPressed: () {
              _saveEvidence(previewEvidence);
            },
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
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      final saved = await remoteRepository.saveStartEvidence(
        widget.workOrderId,
        previewEvidence,
      );
      if (!mounted) {
        return;
      }
      if (!saved.isStartEvidenceComplete) {
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

    final saved = _repository.saveStartEvidence(
      widget.workOrderId,
      previewEvidence,
    );
    if (!saved.isStartEvidenceComplete) {
      setState(() {});
      return;
    }
    Navigator.pushReplacementNamed(
      context,
      AppRoutes.technicianTasks,
      arguments: widget.workOrderId,
    );
  }

  StartEvidence _buildEvidence() {
    return StartEvidence(
      workOrderId: widget.workOrderId,
      vin: _vinController.text.trim().toUpperCase(),
      vinPhoto: _vinPhoto,
      platePhoto: _platePhoto,
      odometerKm: int.tryParse(_kmController.text.trim()),
      odometerPhoto: _odometerPhoto,
      capturedAt: DateTime.now(),
      capturedBy: _repository.currentUser.id,
      deviceId: 'android-demo-device',
      gpsApprox: 'Bursa Nilüfer',
    );
  }
}

class _PhotoGateCard extends StatelessWidget {
  const _PhotoGateCard({
    required this.title,
    required this.isDone,
    required this.onTap,
  });

  final String title;
  final bool isDone;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      onTap: onTap,
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
