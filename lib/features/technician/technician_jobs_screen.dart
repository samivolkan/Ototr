import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/models/user_profile_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/remote_work_order_repository.dart';
import 'widgets/technician_missing_notifications.dart';

class TechnicianJobsScreen extends StatefulWidget {
  const TechnicianJobsScreen({super.key});

  @override
  State<TechnicianJobsScreen> createState() => _TechnicianJobsScreenState();
}

class _TechnicianJobsScreenState extends State<TechnicianJobsScreen> {
  final _repository = AppRepositories.instance.localWorkOrders;
  Future<List<TechnicianWorkOrder>>? _remoteJobsFuture;

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return _buildRemote(context, remoteRepository);
    }
    if (!AppRepositories.instance.hasLocalTestWorkOrders) {
      return Scaffold(
        appBar: const OtotrAppBar(title: 'Usta Ä°ÅŸleri'),
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

    final jobs = _repository.visibleWorkOrders();
    final user = _repository.currentUser;
    final role = _repository.currentTechnicianRole;

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Usta İşleri'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        children: [
          _TechnicianIdentityBar(
            name: user.fullName,
            role: user.role.label,
          ),
          for (final job in jobs)
            _JobCard(
              job: job,
              currentRole: role,
              onNeedsRefresh: _refresh,
            ),
          if (jobs.isEmpty)
            const OtotrCard(child: Text('Şu anda açık teknik iş emri yok.')),
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
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            children: [
              _TechnicianIdentityBar(
                name: repository.currentUser.fullName,
                role: repository.currentUser.role.label,
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
                  onNeedsRefresh: _refreshRemote,
                ),
              if (!isLoading && jobs.isEmpty && !snapshot.hasError)
                const OtotrCard(
                  child: Text('Şu anda açık teknik iş emri yok.'),
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

class _TechnicianIdentityBar extends StatelessWidget {
  const _TechnicianIdentityBar({
    required this.name,
    required this.role,
  });

  final String name;
  final String role;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.grayBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.engineering_outlined,
              color: AppColors.red, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$name - $role',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.darkText,
                fontWeight: FontWeight.w900,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
    required this.currentRole,
    this.onNeedsRefresh,
  });

  final TechnicianWorkOrder job;
  final TechnicianRole currentRole;
  final VoidCallback? onNeedsRefresh;

  @override
  Widget build(BuildContext context) {
    final myTasks = job.tasksFor(currentRole);
    final completed =
        myTasks.where((task) => task.status == TaskStatus.completed).length;
    final totalTasks = job.tasks.length;
    final totalCompleted =
        job.tasks.where((task) => task.status == TaskStatus.completed).length;
    final totalPercent =
        totalTasks == 0 ? 0 : ((totalCompleted / totalTasks) * 100).round();

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
                label: job.status.label,
                tone: OtotrBadgeTone.info,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(job.vehicleSummary, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 12),
          _JobCompletionProgress(
            completed: totalCompleted,
            total: totalTasks,
            percent: totalPercent,
          ),
          TechnicianMissingNotifications(
            order: job,
            onChanged: onNeedsRefresh,
          ),
          const Divider(height: 24),
          Row(
            children: [
              OtotrStatusBadge(
                label: '${myTasks.length} görev',
                tone: OtotrBadgeTone.neutral,
              ),
              const SizedBox(width: 8),
              OtotrStatusBadge(
                label: '$completed/${myTasks.length} tamamlandı',
                tone: completed == myTasks.length
                    ? OtotrBadgeTone.success
                    : OtotrBadgeTone.warning,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: OtotrStatusBadge(
                      label: job.isStartEvidenceComplete
                          ? 'Açılış tamam'
                          : 'Açılış eksik',
                      tone: job.isStartEvidenceComplete
                          ? OtotrBadgeTone.success
                          : OtotrBadgeTone.danger,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.md),
          OtotrSecondaryButton(
            label: 'Araç Başlama İş Emri',
            icon: Icons.camera_alt,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianStartEvidence,
              arguments: job.id,
            ).then((_) => onNeedsRefresh?.call()),
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Görevlerim',
            icon: Icons.checklist,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianTasks,
              arguments: job.id,
            ).then((_) => onNeedsRefresh?.call()),
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Rapor Girişi',
            icon: Icons.assignment,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianReportEntry,
              arguments: job.id,
            ).then((_) => onNeedsRefresh?.call()),
          ),
        ],
      ),
    );
  }
}

class _JobCompletionProgress extends StatelessWidget {
  const _JobCompletionProgress({
    required this.completed,
    required this.total,
    required this.percent,
  });

  final int completed;
  final int total;
  final int percent;

  @override
  Widget build(BuildContext context) {
    final progressColor = percent == 100
        ? AppColors.success
        : percent == 0
            ? AppColors.grayText
            : AppColors.info;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.grayBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.grayBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.percent, size: 18, color: progressColor),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'İş emri tamamlanma',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.darkText,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              Text(
                '$completed/$total',
                style: const TextStyle(
                  color: AppColors.grayText,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '%$percent',
                style: TextStyle(
                  color: progressColor,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 7,
              value: percent / 100,
              color: progressColor,
              backgroundColor: AppColors.grayBorder,
            ),
          ),
        ],
      ),
    );
  }
}
