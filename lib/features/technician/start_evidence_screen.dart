import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';

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

  @override
  void initState() {
    super.initState();
    final evidence = _repository.getById(widget.workOrderId).startEvidence;
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
    final order = _repository.getById(widget.workOrderId);
    final previewEvidence = _buildEvidence();
    final missing = previewEvidence.missingReasons();

    return Scaffold(
      appBar: const OtotrAppBar(title: 'İşe Başlama Kanıtı'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.plate,
                  style: const TextStyle(
                    color: AppColors.red,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(order.vehicleSummary),
                const SizedBox(height: 8),
                const Text(
                  'Bu kapı tamamlanmadan teknik kontrol formu açılmaz.',
                  style: TextStyle(color: AppColors.grayText),
                ),
              ],
            ),
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
                  decoration: const InputDecoration(labelText: 'Şasi / VIN'),
                ),
                const SizedBox(height: AppSizes.md),
                TextField(
                  controller: _kmController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Giriş KM'),
                ),
                const SizedBox(height: AppSizes.md),
                DropdownButtonFormField<String>(
                  value: _transmission.isEmpty ? null : _transmission,
                  decoration: const InputDecoration(labelText: 'Vites Tipi'),
                  items: const [
                    DropdownMenuItem(value: 'otomatik', child: Text('Otomatik')),
                    DropdownMenuItem(value: 'manuel', child: Text('Manuel')),
                  ],
                  onChanged: (value) => setState(() => _transmission = value ?? ''),
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
