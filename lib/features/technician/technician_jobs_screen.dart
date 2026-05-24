import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';

class TechnicianJobsScreen extends StatefulWidget {
  const TechnicianJobsScreen({super.key});

  @override
  State<TechnicianJobsScreen> createState() => _TechnicianJobsScreenState();
}

class _TechnicianJobsScreenState extends State<TechnicianJobsScreen> {
  final _repository = DummyWorkOrderRepository.instance;

  @override
  Widget build(BuildContext context) {
    final jobs = _repository.visibleWorkOrders();
    final user = _repository.currentUser;
    final role = _repository.currentTechnicianRole;

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Usta İşleri'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          _SyncBar(count: _repository.syncQueue().length),
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${user.fullName} - ${role.label}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bu mobil ekran sadece ustaya atanmış teknik işleri gösterir. Sekreterya ve finans alanları usta rolünde kapalıdır.',
                  style: TextStyle(color: AppColors.grayText),
                ),
              ],
            ),
          ),
          for (final job in jobs) _JobCard(job: job, onChanged: _refresh),
          if (jobs.isEmpty)
            const OtotrCard(
              child: Text('Şu anda size atanmış açık iş emri yok.'),
            ),
          OtotrSecondaryButton(
            label: 'Senkron ve Audit',
            icon: Icons.sync,
            onPressed: () => Navigator.pushNamed(context, AppRoutes.technicianSync),
          ),
        ],
      ),
    );
  }

  void _refresh() => setState(() {});
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
    required this.onChanged,
  });

  final TechnicianWorkOrder job;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final repository = DummyWorkOrderRepository.instance;
    final myTasks = job.tasksFor(repository.currentTechnicianRole);
    final completed = myTasks.where((task) => task.status == TaskStatus.completed).length;

    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  job.plate,
                  style: const TextStyle(
                    color: AppColors.red,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              OtotrStatusBadge(label: job.status.label, tone: OtotrBadgeTone.info),
            ],
          ),
          const SizedBox(height: 10),
          Text(job.vehicleSummary, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 4),
          Text(job.packageName, style: const TextStyle(color: AppColors.grayText)),
          const Divider(height: 28),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OtotrStatusBadge(
                label: '${myTasks.length} görev',
                tone: OtotrBadgeTone.neutral,
              ),
              OtotrStatusBadge(
                label: '$completed/${myTasks.length} gönderildi',
                tone: completed == myTasks.length ? OtotrBadgeTone.success : OtotrBadgeTone.warning,
              ),
              OtotrStatusBadge(
                label: job.isStartEvidenceComplete ? 'Başlangıç kanıtı tamam' : 'Başlangıç kanıtı eksik',
                tone: job.isStartEvidenceComplete ? OtotrBadgeTone.success : OtotrBadgeTone.danger,
              ),
            ],
          ),
          const SizedBox(height: AppSizes.md),
          if (!job.isClaimed)
            OtotrPrimaryButton(
              label: 'Sahiplen',
              icon: Icons.assignment_ind,
              onPressed: () {
                repository.claim(job.id);
                onChanged();
              },
            )
          else
            OtotrSecondaryButton(
              label: 'İşe Başlama Kanıtı',
              icon: Icons.camera_alt,
              onPressed: () => Navigator.pushNamed(
                context,
                AppRoutes.technicianStartEvidence,
                arguments: job.id,
              ),
            ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Görevlerim',
            icon: Icons.checklist,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianTasks,
              arguments: job.id,
            ),
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Rapor Kapısı',
            icon: Icons.fact_check,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianReportGate,
              arguments: job.id,
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncBar extends StatelessWidget {
  const _SyncBar({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.md),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: count == 0 ? const Color(0xFFEAF7F0) : const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(AppSizes.radius),
      ),
      child: Row(
        children: [
          Icon(count == 0 ? Icons.cloud_done : Icons.cloud_upload, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              count == 0
                  ? 'Senkron temiz'
                  : '$count kayıt senkron bekliyor. İnternet bağlantısı gelince kuyruktan gönderilecek.',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
