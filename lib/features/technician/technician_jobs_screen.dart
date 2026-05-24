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
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import '../../data/repositories/remote_work_order_repository.dart';

class TechnicianJobsScreen extends StatefulWidget {
  const TechnicianJobsScreen({super.key});

  @override
  State<TechnicianJobsScreen> createState() => _TechnicianJobsScreenState();
}

class _TechnicianJobsScreenState extends State<TechnicianJobsScreen> {
  final _repository = DummyWorkOrderRepository.instance;
  Future<List<TechnicianWorkOrder>>? _remoteJobsFuture;

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return _buildRemote(context, remoteRepository);
    }

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
                  '${user.fullName} - Usta operasyonu',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Müsait usta açık teknik başlıklardan birini üzerine alıp başlayabilir. Sekreterya ve finans alanları usta rolünde kapalıdır.',
                  style: TextStyle(color: AppColors.grayText),
                ),
              ],
            ),
          ),
          for (final job in jobs)
            _JobCard(
              job: job,
              currentRole: role,
              onClaim: () async {
                _repository.claim(job.id);
                _refresh();
              },
            ),
          if (jobs.isEmpty)
            const OtotrCard(
              child: Text('Şu anda açık teknik iş emri yok.'),
            ),
          OtotrSecondaryButton(
            label: 'Senkron ve Audit',
            icon: Icons.sync,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.technicianSync),
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Müdür Başlık Sahipliği',
            icon: Icons.manage_accounts,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.managerTaskOwnership,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRemote(
    BuildContext context,
    RemoteWorkOrderRepository repository,
  ) {
    _remoteJobsFuture ??= repository.visibleWorkOrders();

    return FutureBuilder<List<TechnicianWorkOrder>>(
      future: _remoteJobsFuture,
      builder: (context, snapshot) {
        final jobs = snapshot.data ?? const <TechnicianWorkOrder>[];
        final isLoading = snapshot.connectionState != ConnectionState.done;

        return Scaffold(
          appBar: const OtotrAppBar(title: 'Usta İşleri'),
          backgroundColor: AppColors.grayBg,
          body: ListView(
            padding: const EdgeInsets.all(AppSizes.lg),
            children: [
              const _RemoteSyncBar(),
              OtotrCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${repository.currentUser.fullName} - Usta operasyonu',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Supabase bağlantısı aktif. Müsait usta açık teknik başlıkları üzerine alabilir.',
                      style: TextStyle(color: AppColors.grayText),
                    ),
                  ],
                ),
              ),
              if (snapshot.hasError)
                OtotrCard(
                  child: Text(
                    'Supabase iş emirleri alınamadı: ${snapshot.error}',
                    style: const TextStyle(color: AppColors.red),
                  ),
                ),
              if (isLoading)
                const OtotrCard(child: Text('İş emirleri yükleniyor...')),
              for (final job in jobs)
                _JobCard(
                  job: job,
                  currentRole: repository.currentTechnicianRole,
                  onClaim: () async {
                    await repository.claim(job.id);
                    _refreshRemote();
                  },
                ),
              if (!isLoading && jobs.isEmpty && !snapshot.hasError)
                const OtotrCard(
                  child: Text('Şu anda açık teknik iş emri yok.'),
                ),
              OtotrSecondaryButton(
                label: 'Mudur Baslik Sahipligi',
                icon: Icons.manage_accounts,
                onPressed: () => Navigator.pushNamed(
                  context,
                  AppRoutes.managerTaskOwnership,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _refresh() => setState(() {});

  void _refreshRemote() {
    setState(() {
      final remoteRepository = AppRepositories.instance.remoteWorkOrders;
      _remoteJobsFuture = remoteRepository?.visibleWorkOrders();
    });
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
    required this.currentRole,
    required this.onClaim,
  });

  final TechnicianWorkOrder job;
  final TechnicianRole currentRole;
  final Future<void> Function() onClaim;

  @override
  Widget build(BuildContext context) {
    final myTasks = job.tasksFor(currentRole);
    final completed =
        myTasks.where((task) => task.status == TaskStatus.completed).length;

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
              OtotrStatusBadge(
                  label: job.status.label, tone: OtotrBadgeTone.info),
            ],
          ),
          const SizedBox(height: 10),
          Text(job.vehicleSummary, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 4),
          Text(job.packageName,
              style: const TextStyle(color: AppColors.grayText)),
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
                tone: completed == myTasks.length
                    ? OtotrBadgeTone.success
                    : OtotrBadgeTone.warning,
              ),
              OtotrStatusBadge(
                label: job.isStartEvidenceComplete
                    ? 'Başlangıç kanıtı tamam'
                    : 'Başlangıç kanıtı eksik',
                tone: job.isStartEvidenceComplete
                    ? OtotrBadgeTone.success
                    : OtotrBadgeTone.danger,
              ),
            ],
          ),
          const SizedBox(height: AppSizes.md),
          if (!job.isClaimed)
            OtotrPrimaryButton(
              label: 'Sahiplen',
              icon: Icons.assignment_ind,
              onPressed: () {
                onClaim();
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

class _RemoteSyncBar extends StatelessWidget {
  const _RemoteSyncBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.md),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF7F0),
        borderRadius: BorderRadius.circular(AppSizes.radius),
      ),
      child: const Row(
        children: [
          Icon(Icons.cloud_done, size: 18),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Supabase bağlantısı aktif',
              style: TextStyle(fontWeight: FontWeight.w700),
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
