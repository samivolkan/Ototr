import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/report_template_model.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/models/user_profile_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/remote_work_order_repository.dart';
import '../../data/services/report_gate_calculator.dart';
import '../../data/services/work_order_report_service.dart';
import 'widgets/technician_missing_notifications.dart';

class TechnicianJobsScreen extends StatefulWidget {
  const TechnicianJobsScreen({super.key});

  @override
  State<TechnicianJobsScreen> createState() => _TechnicianJobsScreenState();
}

class _TechnicianJobsScreenState extends State<TechnicianJobsScreen> {
  final _repository = AppRepositories.instance.localWorkOrders;
  Future<List<TechnicianWorkOrder>>? _remoteJobsFuture;
  Timer? _remoteRefreshTimer;

  @override
  void initState() {
    super.initState();
    _remoteRefreshTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (!mounted) {
        return;
      }
      if (AppRepositories.instance.remoteWorkOrders != null) {
        _refreshRemote();
      }
    });
  }

  @override
  void dispose() {
    _remoteRefreshTimer?.cancel();
    super.dispose();
  }

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
            _JobSummaryCard(
              job: job,
              currentRole: role,
              onTap: () => _openJobDetail(job.id),
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
              if (isLoading && jobs.isEmpty)
                const OtotrCard(child: Text('İş emirleri yükleniyor...')),
              for (final job in jobs)
                _JobSummaryCard(
                  job: job,
                  currentRole: repository.currentTechnicianRole,
                  onTap: () => _openJobDetail(job.id),
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

  void _openJobDetail(String workOrderId) {
    Navigator.pushNamed(
      context,
      AppRoutes.technicianJobDetail,
      arguments: workOrderId,
    ).then((_) {
      if (!mounted) {
        return;
      }
      if (AppRepositories.instance.remoteWorkOrders != null) {
        _refreshRemote();
      } else {
        _refresh();
      }
    });
  }

  void _refreshRemote() {
    setState(() {
      final remoteRepository = AppRepositories.instance.remoteWorkOrders;
      _remoteJobsFuture = remoteRepository?.visibleWorkOrders();
    });
  }
}

class TechnicianJobDetailScreen extends StatefulWidget {
  const TechnicianJobDetailScreen({
    super.key,
    required this.workOrderId,
  });

  final String workOrderId;

  @override
  State<TechnicianJobDetailScreen> createState() =>
      _TechnicianJobDetailScreenState();
}

class _TechnicianJobDetailScreenState extends State<TechnicianJobDetailScreen> {
  Future<_RemoteJobDetailData>? _remoteJobFuture;

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      _remoteJobFuture ??= _loadRemoteJob(remoteRepository);
      return FutureBuilder<_RemoteJobDetailData>(
        future: _remoteJobFuture,
        builder: (context, snapshot) {
          final data = snapshot.data;
          final job = data == null
              ? null
              : _jobWithReportProgress(
                  data.job,
                  data.template,
                  data.progressByGroupId,
                );
          return Scaffold(
            appBar: const OtotrAppBar(title: 'İş Emri Detayı'),
            backgroundColor: AppColors.grayBg,
            body: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                if (snapshot.hasError)
                  OtotrCard(
                    child: Text(
                      'İş emri alınamadı: ${snapshot.error}',
                      style: const TextStyle(color: AppColors.red),
                    ),
                  )
                else if (job == null)
                  const OtotrCard(child: Text('İş emri yükleniyor...'))
                else
                  _JobCard(
                    job: job,
                    currentRole: remoteRepository.currentTechnicianRole,
                    onNeedsRefresh: _refreshRemote,
                  ),
              ],
            ),
          );
        },
      );
    }

    final repository = AppRepositories.instance.localWorkOrders;
    final job = repository.getById(widget.workOrderId);

    return Scaffold(
      appBar: const OtotrAppBar(title: 'İş Emri Detayı'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        children: [
          _JobCard(
            job: job,
            currentRole: repository.currentTechnicianRole,
            onNeedsRefresh: _refreshLocal,
          ),
        ],
      ),
    );
  }

  void _refreshLocal() => setState(() {});

  void _refreshRemote() {
    setState(() {
      final repository = AppRepositories.instance.remoteWorkOrders;
      _remoteJobFuture = repository == null ? null : _loadRemoteJob(repository);
    });
  }

  Future<_RemoteJobDetailData> _loadRemoteJob(
    RemoteWorkOrderRepository repository,
  ) async {
    final job = await repository.getById(widget.workOrderId);
    try {
      final template =
          await AppRepositories.instance.reportTemplates.getActiveTemplate();
      final reportService = WorkOrderReportService(
        templateRepository: AppRepositories.instance.reportTemplates,
        reportRepository: AppRepositories.instance.workOrderReports,
      );
      final progress =
          await reportService.getReportProgress(widget.workOrderId);
      return _RemoteJobDetailData(
        job: job,
        template: template,
        progressByGroupId: {
          for (final item in progress) item.groupId: item,
        },
      );
    } catch (_) {
      return _RemoteJobDetailData(
        job: job,
        template: null,
        progressByGroupId: const {},
      );
    }
  }
}

class _RemoteJobDetailData {
  const _RemoteJobDetailData({
    required this.job,
    required this.template,
    required this.progressByGroupId,
  });

  final TechnicianWorkOrder job;
  final ReportTemplate? template;
  final Map<String, ReportGroupProgress> progressByGroupId;
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

int _technicianMissingActionCount(TechnicianWorkOrder job) {
  final issues = const ReportGateCalculator()
      .calculate(workOrder: job, syncQueue: const []).issues;
  final hasStartEvidenceIssue = issues
      .any((issue) => issue.code == ReportGateIssueCode.startEvidenceMissing);
  final technicalTaskIds = <String>{
    for (final issue in issues)
      if (_isTechnicalTaskIssue(issue) && issue.taskId != null) issue.taskId!,
  };
  final hasFinalMediaIssue = issues.any(_isFinalMediaIssue);

  return [
    hasStartEvidenceIssue,
    technicalTaskIds.isNotEmpty,
    hasFinalMediaIssue,
  ].where((value) => value).length;
}

bool _isTechnicalTaskIssue(ReportGateIssue issue) {
  if (_isFinalMediaIssue(issue)) {
    return false;
  }
  return issue.taskId != null &&
      issue.code != ReportGateIssueCode.externalQueryPending &&
      issue.code != ReportGateIssueCode.secretaryGateMissing &&
      issue.code != ReportGateIssueCode.kvkkGateMissing &&
      issue.code != ReportGateIssueCode.paymentGateMissing &&
      issue.code != ReportGateIssueCode.managerApprovalPending;
}

bool _isFinalMediaIssue(ReportGateIssue issue) {
  final key = issue.fieldKey ?? '';
  return key == 'final_media' || key.startsWith('report.final_media.');
}

TechnicianWorkOrder _jobWithReportProgress(
  TechnicianWorkOrder job,
  ReportTemplate? template,
  Map<String, ReportGroupProgress> progressByGroupId,
) {
  if (template == null || progressByGroupId.isEmpty) {
    return job;
  }

  return job.copyWith(
    tasks: [
      for (final task in job.tasks)
        _taskWithReportProgress(task, template, progressByGroupId),
    ],
  );
}

TechnicianTask _taskWithReportProgress(
  TechnicianTask task,
  ReportTemplate template,
  Map<String, ReportGroupProgress> progressByGroupId,
) {
  final group = _findReportGroupForTask(task, template);
  if (group == null) {
    return task;
  }
  final progress = progressByGroupId[group.id];
  if (progress == null || progress.totalItems <= 0) {
    return task;
  }

  final completed =
      progress.completedItems.clamp(0, task.checklistItems.length);
  final checklistItems = [
    for (var index = 0; index < task.checklistItems.length; index += 1)
      task.checklistItems[index].copyWith(
        isAnswered: task.checklistItems[index].isAnswered || index < completed,
      ),
  ];

  return task.copyWith(
    status:
        progress.progressPercent >= 100 ? TaskStatus.completed : task.status,
    checklistItems: checklistItems,
  );
}

ReportTemplateGroup? _findReportGroupForTask(
  TechnicianTask task,
  ReportTemplate template,
) {
  final checklistIds = task.checklistItems.map((item) => item.id).toSet();
  final checklistTitles = {
    for (final item in task.checklistItems)
      _normalizeReportMatchText(item.title),
  };
  for (final group in template.groups) {
    if (group.items.any(
      (item) =>
          checklistIds.contains(item.id) ||
          checklistTitles.contains(_normalizeReportMatchText(item.title)),
    )) {
      return group;
    }
  }
  for (final group in template.groups) {
    if (_normalizeReportMatchText(group.title) ==
            _normalizeReportMatchText(task.title) ||
        _taskGroupCodeMatches(group.code, task.reportFieldKey)) {
      return group;
    }
  }
  return null;
}

bool _taskGroupCodeMatches(String groupCode, String reportFieldKey) {
  final normalizedGroup = _normalizeReportMatchText(groupCode);
  final normalizedReportKey = _normalizeReportMatchText(reportFieldKey);
  if (normalizedGroup.isEmpty || normalizedReportKey.isEmpty) {
    return false;
  }
  return normalizedReportKey.endsWith(normalizedGroup) ||
      normalizedReportKey.contains(normalizedGroup);
}

String _normalizeReportMatchText(String value) {
  return value
      .trim()
      .toUpperCase()
      .replaceAll('İ', 'I')
      .replaceAll('İ', 'I')
      .replaceAll('Ğ', 'G')
      .replaceAll('Ü', 'U')
      .replaceAll('Ş', 'S')
      .replaceAll('Ö', 'O')
      .replaceAll('Ç', 'C')
      .replaceAll('ı', 'I')
      .replaceAll('ğ', 'G')
      .replaceAll('ü', 'U')
      .replaceAll('ş', 'S')
      .replaceAll('ö', 'O')
      .replaceAll('ç', 'C')
      .replaceAll(RegExp(r'[^A-Z0-9]+'), '_');
}

bool _isTaskCompleted(TechnicianTask task, String workOrderId) {
  final totalRows = task.checklistItems.length;
  final rowsComplete = totalRows > 0 && task.completedCount >= totalRows;
  if (task.status == TaskStatus.completed || rowsComplete) {
    return true;
  }
  return AppRepositories.instance.isOptimisticTaskCompleted(
    workOrderId,
    task.taskId,
  );
}

class _JobSummaryCard extends StatelessWidget {
  const _JobSummaryCard({
    required this.job,
    required this.currentRole,
    required this.onTap,
  });

  final TechnicianWorkOrder job;
  final TechnicianRole currentRole;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final myTasks = job.tasksFor(currentRole);
    final completed =
        myTasks.where((task) => _isTaskCompleted(task, job.id)).length;
    final totalTasks = job.tasks.length;
    final totalCompleted =
        job.tasks.where((task) => _isTaskCompleted(task, job.id)).length;
    final totalPercent =
        totalTasks == 0 ? 0 : ((totalCompleted / totalTasks) * 100).round();
    final missingCount = _technicianMissingActionCount(job);

    return OtotrCard(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  job.plate,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.red,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: OtotrStatusBadge(
                      label: job.status.label,
                      tone: job.isStartEvidenceComplete
                          ? OtotrBadgeTone.info
                          : OtotrBadgeTone.warning,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            job.vehicleSummary,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.darkText,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          _JobCompletionProgress(
            completed: totalCompleted,
            total: totalTasks,
            percent: totalPercent,
            compact: true,
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    OtotrStatusBadge(
                      label: '${myTasks.length} görev',
                      tone: OtotrBadgeTone.neutral,
                    ),
                    OtotrStatusBadge(
                      label: '$completed/${myTasks.length} tamamlandı',
                      tone: completed == myTasks.length && myTasks.isNotEmpty
                          ? OtotrBadgeTone.success
                          : OtotrBadgeTone.warning,
                    ),
                    if (missingCount > 0)
                      OtotrStatusBadge(
                        label: '$missingCount eksik',
                        tone: OtotrBadgeTone.danger,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: AppColors.grayText),
            ],
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
        myTasks.where((task) => _isTaskCompleted(task, job.id)).length;
    final totalTasks = job.tasks.length;
    final totalCompleted =
        job.tasks.where((task) => _isTaskCompleted(task, job.id)).length;
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
            label: 'Bekleyen Görevler',
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
    this.compact = false,
  });

  final int completed;
  final int total;
  final int percent;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final progressColor = percent == 100
        ? AppColors.success
        : percent == 0
            ? AppColors.grayText
            : AppColors.info;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 12,
        vertical: compact ? 8 : 10,
      ),
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
              Expanded(
                child: Text(
                  'İş emri tamamlanma',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.darkText,
                    fontWeight: FontWeight.w900,
                    fontSize: compact ? 12 : 13,
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
                  fontSize: compact ? 14 : 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: compact ? 6 : 7,
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
