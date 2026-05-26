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
import '../../data/models/user_profile_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/remote_work_order_repository.dart';
import 'widgets/technician_missing_notifications.dart';
import 'widgets/technician_vehicle_header.dart';

class TechnicianTasksScreen extends StatefulWidget {
  const TechnicianTasksScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<TechnicianTasksScreen> createState() => _TechnicianTasksScreenState();
}

class _TechnicianTasksScreenState extends State<TechnicianTasksScreen> {
  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return _RemoteTechnicianTasksScreen(
        repository: remoteRepository,
        workOrderId: widget.workOrderId,
      );
    }
    if (AppRepositories.instance.hasLocalTestWorkOrders) {
      final repository = AppRepositories.instance.localWorkOrders;
      final order = repository.getById(widget.workOrderId);
      final role = repository.currentTechnicianRole;
      final tasks = order.tasksFor(role);
      for (final task in tasks) {
        if (task.status == TaskStatus.completed) {
          AppRepositories.instance.clearOptimisticTaskCompleted(
            widget.workOrderId,
            task.taskId,
          );
        }
      }

      return _TechnicianTasksView(
        order: order,
        role: role,
        tasks: tasks,
        workOrderId: widget.workOrderId,
        currentUser: repository.currentUser,
        onClaim: (taskId) async {
          repository.claimTask(widget.workOrderId, taskId);
          setState(() {});
        },
        onRelease: (taskId, reason) async {
          repository.releaseTask(widget.workOrderId, taskId, reason);
          setState(() {});
        },
        onTaskChanged: () => setState(() {}),
      );
    }

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Bekleyen Görevler'),
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
}

class _RemoteTechnicianTasksScreen extends StatefulWidget {
  const _RemoteTechnicianTasksScreen({
    required this.repository,
    required this.workOrderId,
  });

  final RemoteWorkOrderRepository repository;
  final String workOrderId;

  @override
  State<_RemoteTechnicianTasksScreen> createState() =>
      _RemoteTechnicianTasksScreenState();
}

class _RemoteTechnicianTasksScreenState
    extends State<_RemoteTechnicianTasksScreen> {
  Future<TechnicianWorkOrder>? _future;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.getById(widget.workOrderId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<TechnicianWorkOrder>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: const OtotrAppBar(title: 'Bekleyen Görevler'),
            backgroundColor: AppColors.grayBg,
            body: Padding(
              padding: const EdgeInsets.all(AppSizes.lg),
              child: OtotrCard(
                child: Text(
                  'Supabase görevleri alınamadı: ${snapshot.error}',
                  style: const TextStyle(color: AppColors.red),
                ),
              ),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Scaffold(
            appBar: OtotrAppBar(title: 'Bekleyen Görevler'),
            backgroundColor: AppColors.grayBg,
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final order = snapshot.data!;
        final role = widget.repository.currentTechnicianRole;
        final tasks = order.tasksFor(role);
        for (final task in tasks) {
          if (task.status == TaskStatus.completed) {
            AppRepositories.instance.clearOptimisticTaskCompleted(
              widget.workOrderId,
              task.taskId,
            );
          }
        }

        return _TechnicianTasksView(
          order: order,
          role: role,
          tasks: tasks,
          workOrderId: widget.workOrderId,
          currentUser: widget.repository.currentUser,
          onClaim: (taskId) async {
            await widget.repository.claimTask(widget.workOrderId, taskId);
            _refresh();
          },
          onRelease: (taskId, reason) async {
            await widget.repository.releaseTask(
              widget.workOrderId,
              taskId,
              reason,
            );
            _refresh();
          },
          onTaskChanged: _refresh,
        );
      },
    );
  }

  void _refresh() {
    setState(() {
      _future = widget.repository.getById(widget.workOrderId);
    });
  }
}

class _TechnicianTasksView extends StatelessWidget {
  const _TechnicianTasksView({
    required this.order,
    required this.role,
    required this.tasks,
    required this.workOrderId,
    required this.currentUser,
    this.onClaim,
    this.onRelease,
    this.onTaskChanged,
  });

  final TechnicianWorkOrder order;
  final TechnicianRole role;
  final List<TechnicianTask> tasks;
  final String workOrderId;
  final UserProfile currentUser;
  final Future<void> Function(String taskId)? onClaim;
  final Future<void> Function(String taskId, String reason)? onRelease;
  final VoidCallback? onTaskChanged;

  @override
  Widget build(BuildContext context) {
    final pendingTasks = [
      for (final task in tasks)
        if (!_isCompleted(task)) task,
    ];
    final completedTasks = [
      for (final task in tasks)
        if (_isCompleted(task)) task,
    ];

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Bekleyen Görevler'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(order: order),
          TechnicianMissingNotifications(
            order: order,
            includeTaskAction: false,
            onChanged: onTaskChanged,
          ),
          const SizedBox(height: 8),
          OtotrPrimaryButton(
            label: 'Rapor Girişi',
            icon: Icons.assignment,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianReportEntry,
              arguments: workOrderId,
            ).then((_) => onTaskChanged?.call()),
          ),
          const SizedBox(height: 8),
          _TaskSectionHeader(
            title: 'Bekleyen Görevler',
            count: pendingTasks.length,
          ),
          if (pendingTasks.isEmpty)
            const _EmptyTaskSectionCard(
              message: 'Bekleyen teknik başlık bulunmuyor.',
            ),
          for (final task in pendingTasks)
            _TaskProgressCard(
              task: task,
              isUnlocked: order.isStartEvidenceComplete,
              workOrderId: workOrderId,
              currentUser: currentUser,
              onClaim: onClaim == null ? null : () => onClaim!(task.taskId),
              onRelease: onRelease == null
                  ? null
                  : (reason) => onRelease!(task.taskId, reason),
              onTaskChanged: onTaskChanged,
              isOptimisticCompleted: _isOptimisticCompleted(task),
            ),
          if (completedTasks.isNotEmpty) ...[
            const SizedBox(height: 4),
            _TaskSectionHeader(
              title: 'Tamamlanan Görevler',
              count: completedTasks.length,
            ),
            for (final task in completedTasks)
              _TaskProgressCard(
                task: task,
                isUnlocked: order.isStartEvidenceComplete,
                workOrderId: workOrderId,
                currentUser: currentUser,
                onClaim: null,
                onRelease: null,
                onTaskChanged: onTaskChanged,
                isOptimisticCompleted: _isOptimisticCompleted(task),
              ),
          ],
          OtotrSecondaryButton(
            label: 'Rapor Medyalarına Git',
            icon: Icons.photo_camera,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianEvidence,
              arguments: workOrderId,
            ).then((_) => onTaskChanged?.call()),
          ),
        ],
      ),
    );
  }

  bool _isOptimisticCompleted(TechnicianTask task) {
    return AppRepositories.instance.isOptimisticTaskCompleted(
      workOrderId,
      task.taskId,
    );
  }

  bool _isCompleted(TechnicianTask task) {
    return task.status == TaskStatus.completed || _isOptimisticCompleted(task);
  }
}

class _TaskProgressCard extends StatelessWidget {
  const _TaskProgressCard({
    required this.task,
    required this.isUnlocked,
    required this.workOrderId,
    required this.currentUser,
    this.onClaim,
    this.onRelease,
    this.onTaskChanged,
    this.isOptimisticCompleted = false,
  });

  final TechnicianTask task;
  final bool isUnlocked;
  final String workOrderId;
  final UserProfile currentUser;
  final Future<void> Function()? onClaim;
  final Future<void> Function(String reason)? onRelease;
  final VoidCallback? onTaskChanged;
  final bool isOptimisticCompleted;

  @override
  Widget build(BuildContext context) {
    final canEdit = task.canEditBy(currentUser);
    final isOwnedByCurrentUser = task.isOwnedBy(currentUser.id);
    final isReadOnly = task.isOwned && !canEdit;
    final canClaim = isUnlocked && task.isAvailableForClaim && onClaim != null;
    final isCompletedStatus =
        task.status == TaskStatus.completed || isOptimisticCompleted;
    final canOpenForm =
        isUnlocked && (canEdit || isReadOnly || isCompletedStatus);
    final canOpenByTap = canClaim || canOpenForm;
    final total = task.checklistItems.length;
    final completed = isCompletedStatus && total > 0
        ? total
        : task.completedCount.clamp(0, total);
    final percent = isCompletedStatus
        ? 100
        : total == 0
            ? task.completionPercent
            : ((completed / total) * 100).round();
    final rowsComplete = total > 0 && completed >= total;
    final elapsedMinutes = task.claimedAt == null
        ? 0
        : DateTime.now().difference(task.claimedAt!).inMinutes.clamp(0, 999);
    final statusText = isCompletedStatus || rowsComplete
        ? 'Test tamamlandı'
        : completed == 0
            ? 'Teste henuz baslanmadi'
            : 'Test devam ediyor';
    final ownershipLabel = task.isOwned
        ? isOwnedByCurrentUser
            ? 'Sorumlu: siz'
            : 'Sorumlu: ${task.ownerUserId}'
        : 'Havuzda';
    final ownershipBackground = task.isOwned
        ? isOwnedByCurrentUser
            ? const Color(0xFFEAF7F0)
            : const Color(0xFFFFF7E6)
        : const Color(0xFFEFF6FF);
    final ownershipForeground = task.isOwned
        ? isOwnedByCurrentUser
            ? AppColors.success
            : AppColors.warning
        : AppColors.info;

    return OtotrCard(
      onTap: canOpenByTap ? () => _openTask(context) : null,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            task.title.toUpperCase(),
            style: const TextStyle(
              color: AppColors.darkText,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 22),
          Center(
            child: Text(
              statusText,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.darkText,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: total == 0 ? 0 : percent / 100,
              color: AppColors.success,
              backgroundColor: AppColors.grayBorder,
            ),
          ),
          const Divider(height: 28, thickness: 1.4, color: AppColors.darkText),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              _SoftMetricPill(
                label: '$completed/$total',
                icon: rowsComplete ? Icons.check_circle : null,
                background: rowsComplete
                    ? const Color(0xFFEAF7F0)
                    : const Color(0xFFE5E7EB),
                foreground:
                    rowsComplete ? AppColors.success : AppColors.grayText,
              ),
              _SoftMetricPill(
                label: ownershipLabel,
                background: ownershipBackground,
                foreground: ownershipForeground,
              ),
              _SoftMetricPill(
                label: '%$percent tamam',
                background: const Color(0xFFEAF7F0),
                foreground: AppColors.success,
              ),
              _SoftMetricPill(
                label: '$elapsedMinutes dk. /${task.estimatedMinutes} dk.',
                background: const Color(0xFFEAF7F0),
                foreground: AppColors.success,
              ),
            ],
          ),
          if (task.managerReturnReason.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Mudur iadesi: ${task.managerReturnReason}',
              style: const TextStyle(color: AppColors.red),
            ),
          ],
          if (isReadOnly) ...[
            const SizedBox(height: 10),
            const Text(
              'Bu baslik baska bir usta tarafindan sahiplenildigi icin sadece izlenebilir.',
              style: TextStyle(color: AppColors.grayText),
            ),
          ],
          if (isOwnedByCurrentUser && !isCompletedStatus) ...[
            const SizedBox(height: AppSizes.md),
            OtotrSecondaryButton(
              label: 'Gorevi Birak',
              icon: Icons.undo,
              onPressed: onRelease == null ? null : _releaseTask,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _openTask(BuildContext context) async {
    if (task.isAvailableForClaim && onClaim != null) {
      await onClaim!();
      if (!context.mounted) {
        return;
      }
    }

    final changed = await Navigator.pushNamed(
      context,
      AppRoutes.technicianTaskForm,
      arguments: {
        'workOrderId': workOrderId,
        'taskId': task.taskId,
      },
    );
    if (changed == true) {
      onTaskChanged?.call();
    }
  }

  Future<void> _releaseTask() async {
    if (onRelease == null) {
      return;
    }
    await onRelease!('Usta gorevi havuza birakti.');
  }
}

class _TaskSectionHeader extends StatelessWidget {
  const _TaskSectionHeader({
    required this.title,
    required this.count,
  });

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 10, 2, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: AppColors.navy,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.grayBorder),
            ),
            child: Text(
              '$count başlık',
              style: const TextStyle(
                color: AppColors.grayText,
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTaskSectionCard extends StatelessWidget {
  const _EmptyTaskSectionCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Text(
        message,
        style: const TextStyle(
          color: AppColors.grayText,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SoftMetricPill extends StatelessWidget {
  const _SoftMetricPill({
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: foreground, size: 15),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: foreground,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class TaskCardLegacy extends StatelessWidget {
  const TaskCardLegacy({
    super.key,
    required this.task,
    required this.isUnlocked,
    required this.workOrderId,
    required this.currentUser,
    this.onClaim,
    this.onRelease,
  });

  final TechnicianTask task;
  final bool isUnlocked;
  final String workOrderId;
  final UserProfile currentUser;
  final Future<void> Function()? onClaim;
  final Future<void> Function(String reason)? onRelease;

  @override
  Widget build(BuildContext context) {
    final tone = switch (task.status) {
      TaskStatus.completed => OtotrBadgeTone.success,
      TaskStatus.evidenceMissing ||
      TaskStatus.managerReturned =>
        OtotrBadgeTone.danger,
      TaskStatus.conflictDetected => OtotrBadgeTone.warning,
      _ => OtotrBadgeTone.neutral,
    };
    final canEdit = task.canEditBy(currentUser);
    final isOwnedByCurrentUser = task.isOwnedBy(currentUser.id);
    final isReadOnly = task.isOwned && !canEdit;
    final canClaim = isUnlocked && task.isAvailableForClaim && onClaim != null;
    final canOpenForm = isUnlocked && (canEdit || isReadOnly);
    final canOpenByTap = canClaim || canOpenForm;

    return OtotrCard(
      onTap: canOpenByTap ? () => _openTask(context) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            task.title,
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OtotrStatusBadge(label: task.status.label, tone: tone),
              OtotrStatusBadge(
                label: '${task.checklistItems.length} kontrol',
                tone: OtotrBadgeTone.info,
              ),
              OtotrStatusBadge(
                label: '${task.estimatedMinutes} dk',
                tone: OtotrBadgeTone.neutral,
              ),
              if (task.isOwned)
                OtotrStatusBadge(
                  label: isOwnedByCurrentUser
                      ? 'Sorumlu: siz'
                      : 'Sorumlu: ${task.ownerUserId}',
                  tone: isOwnedByCurrentUser
                      ? OtotrBadgeTone.success
                      : OtotrBadgeTone.warning,
                )
              else
                const OtotrStatusBadge(
                  label: 'Havuzda',
                  tone: OtotrBadgeTone.info,
                ),
            ],
          ),
          if (task.checklistItems.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Test alanları',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final item in task.checklistItems.take(5))
                  _ChecklistPreviewChip(label: item.title),
                if (task.checklistItems.length > 5)
                  _ChecklistPreviewChip(
                    label: '+${task.checklistItems.length - 5} başlık',
                  ),
              ],
            ),
          ],
          if (task.managerReturnReason.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Müdür iadesi: ${task.managerReturnReason}',
              style: const TextStyle(color: AppColors.red),
            ),
          ],
          if (isReadOnly) ...[
            const SizedBox(height: 10),
            const Text(
              'Bu başlık başka bir usta tarafından sahiplenildiği için sadece izlenebilir.',
              style: TextStyle(color: AppColors.grayText),
            ),
          ],
          const SizedBox(height: AppSizes.md),
          if (isOwnedByCurrentUser)
            OtotrSecondaryButton(
              label: 'Görevi Bırak',
              icon: Icons.undo,
              onPressed: onRelease == null ? null : _releaseTask,
            ),
        ],
      ),
    );
  }

  Future<void> _openTask(BuildContext context) async {
    if (task.isAvailableForClaim && onClaim != null) {
      await onClaim!();
      if (!context.mounted) {
        return;
      }
    }

    await Navigator.pushNamed(
      context,
      AppRoutes.technicianTaskForm,
      arguments: {
        'workOrderId': workOrderId,
        'taskId': task.taskId,
      },
    );
  }

  Future<void> _releaseTask() async {
    if (onRelease == null) {
      return;
    }
    await onRelease!('Usta gorevi havuza birakti.');
  }
}

class _ChecklistPreviewChip extends StatelessWidget {
  const _ChecklistPreviewChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.grayBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.grayBorder),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AppColors.grayText,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
