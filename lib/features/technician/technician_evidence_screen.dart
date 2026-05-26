import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/app_repositories.dart';
import 'widgets/technician_vehicle_header.dart';

class TechnicianEvidenceScreen extends StatefulWidget {
  const TechnicianEvidenceScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<TechnicianEvidenceScreen> createState() =>
      _TechnicianEvidenceScreenState();
}

class _TechnicianEvidenceScreenState extends State<TechnicianEvidenceScreen> {
  TechnicianWorkOrder? _order;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final remoteRepository = AppRepositories.instance.remoteWorkOrders;
      final order = remoteRepository == null
          ? AppRepositories.instance.localWorkOrders.getById(widget.workOrderId)
          : await remoteRepository.getById(widget.workOrderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        appBar: OtotrAppBar(title: 'Rapor Medyaları'),
        backgroundColor: AppColors.grayBg,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _order == null) {
      return Scaffold(
        appBar: const OtotrAppBar(title: 'Rapor Medyaları'),
        backgroundColor: AppColors.grayBg,
        body: ListView(
          padding: const EdgeInsets.all(AppSizes.lg),
          children: [
            OtotrCard(
              child: Text(
                _error ?? 'İş emri medyaları yüklenemedi.',
                style: const TextStyle(color: AppColors.red),
              ),
            ),
          ],
        ),
      );
    }

    final order = _order!;
    final role =
        AppRepositories.instance.remoteWorkOrders?.currentTechnicianRole ??
            AppRepositories.instance.localWorkOrders.currentTechnicianRole;
    final currentUser =
        AppRepositories.instance.remoteWorkOrders?.currentUser ??
            AppRepositories.instance.localWorkOrders.currentUser;
    final tasks = order.tasksFor(role);
    final taskAssets = [
      for (final task in tasks) ...task.evidenceAssets,
    ];
    final finalMediaAssets = order.finalMediaAssets;

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Rapor Medyaları'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            role: role,
            message:
                'Rapor kapanmadan önce araç çevre fotoğrafları ve video kaydı tamamlanmalıdır.',
          ),
          if (finalMediaAssets.isNotEmpty)
            _EvidenceSection(
              title: 'Araç çevre fotoğrafları ve video',
              subtitle:
                  '${finalMediaAssets.where((asset) => asset.isAvailable).length}/${finalMediaAssets.length} medya tamamlandı',
              assets: finalMediaAssets,
              canCapture: true,
              onCapture: (asset) =>
                  _captureFinalMediaAsset(order, asset, currentUser.id),
            ),
          if (taskAssets.isNotEmpty)
            _EvidenceSection(
              title: 'Test sırasında gereken ek kanıtlar',
              subtitle:
                  '${taskAssets.where((asset) => asset.isAvailable).length}/${taskAssets.length} kanıt tamamlandı',
              assets: taskAssets,
              canCaptureFor: (asset) => tasks
                  .firstWhere((task) => task.taskId == asset.taskId)
                  .canEditBy(currentUser),
              onCapture: (asset) => _captureTaskAsset(order, asset),
            ),
          if (taskAssets.isEmpty && finalMediaAssets.isEmpty)
            const OtotrCard(child: Text('Zorunlu rapor medyası yok.')),
        ],
      ),
    );
  }

  Future<void> _captureFinalMediaAsset(
    TechnicianWorkOrder order,
    EvidenceAsset asset,
    String userId,
  ) async {
    final extension = asset.evidenceType == 'video' ? 'mp4' : 'jpg';
    final nextAsset = asset.copyWith(
      localPath: 'local/${asset.fieldKey}.$extension',
      remoteUrl: 'remote/${asset.fieldKey}.$extension',
      hash: 'demo-hash-${asset.fieldKey}',
      uploadedAt: DateTime.now(),
      uploadedBy: userId,
      syncStatus: EvidenceStatus.uploaded,
      qualityStatus: 'accepted',
    );

    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository == null) {
      final nextOrder = AppRepositories.instance.localWorkOrders
          .saveFinalMediaAsset(order.id, nextAsset);
      setState(() => _order = nextOrder);
      return;
    }

    final nextOrder =
        await remoteRepository.saveFinalMediaAsset(order.id, nextAsset);
    if (!mounted) return;
    setState(() => _order = nextOrder);
  }

  Future<void> _captureTaskAsset(
    TechnicianWorkOrder order,
    EvidenceAsset asset,
  ) async {
    final extension = asset.evidenceType == 'video' ? 'mp4' : 'jpg';
    final tasks = [
      for (final task in order.tasks)
        if (task.taskId == asset.taskId)
          task.copyWith(
            evidenceAssets: [
              for (final current in task.evidenceAssets)
                if (current.id == asset.id)
                  current.copyWith(
                    localPath: 'local/${asset.fieldKey}.$extension',
                    remoteUrl: 'remote/${asset.fieldKey}.$extension',
                    hash: 'demo-hash-${asset.fieldKey}',
                    uploadedAt: DateTime.now(),
                    syncStatus: EvidenceStatus.uploaded,
                    qualityStatus: 'accepted',
                  )
                else
                  current,
            ],
          )
        else
          task,
    ];

    final nextTask =
        order.tasks.firstWhere((task) => task.taskId == asset.taskId).copyWith(
              evidenceAssets: tasks
                  .firstWhere((task) => task.taskId == asset.taskId)
                  .evidenceAssets,
            );

    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository == null) {
      final nextOrder = AppRepositories.instance.localWorkOrders
          .updateTask(order.id, nextTask);
      setState(() => _order = nextOrder);
      return;
    }

    final nextOrder = await remoteRepository.updateTask(order.id, nextTask);
    if (!mounted) return;
    setState(() => _order = nextOrder);
  }
}

class _EvidenceSection extends StatelessWidget {
  const _EvidenceSection({
    required this.title,
    required this.subtitle,
    required this.assets,
    required this.onCapture,
    this.canCapture,
    this.canCaptureFor,
  });

  final String title;
  final String subtitle;
  final List<EvidenceAsset> assets;
  final bool? canCapture;
  final bool Function(EvidenceAsset asset)? canCaptureFor;
  final ValueChanged<EvidenceAsset> onCapture;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.darkText,
              fontWeight: FontWeight.w900,
              fontSize: 17,
            ),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: AppColors.grayText)),
          const SizedBox(height: 12),
          for (final asset in assets)
            _EvidenceCard(
              asset: asset,
              canCapture: canCapture ?? canCaptureFor?.call(asset) ?? false,
              onCapture: () => onCapture(asset),
            ),
        ],
      ),
    );
  }
}

class _EvidenceCard extends StatelessWidget {
  const _EvidenceCard({
    required this.asset,
    required this.canCapture,
    required this.onCapture,
  });

  final EvidenceAsset asset;
  final bool canCapture;
  final VoidCallback onCapture;

  @override
  Widget build(BuildContext context) {
    final isVideo = asset.evidenceType == 'video';
    return InkWell(
      onTap: canCapture ? onCapture : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.grayBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.grayBorder),
        ),
        child: Row(
          children: [
            Icon(
              asset.isAvailable
                  ? Icons.check_circle
                  : isVideo
                      ? Icons.videocam
                      : Icons.camera_alt,
              color: asset.isAvailable ? AppColors.success : AppColors.red,
              size: 34,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    asset.title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isVideo ? 'Video kaydı' : 'Fotoğraf',
                    style: const TextStyle(
                      color: AppColors.grayText,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            OtotrStatusBadge(
              label: !canCapture
                  ? 'Read-only'
                  : asset.isAvailable
                      ? 'Yüklendi'
                      : 'Eksik',
              tone: !canCapture
                  ? OtotrBadgeTone.neutral
                  : asset.isAvailable
                      ? OtotrBadgeTone.success
                      : OtotrBadgeTone.danger,
            ),
          ],
        ),
      ),
    );
  }
}
