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
import '../../data/repositories/dummy_work_order_repository.dart';
import '../../data/repositories/remote_work_order_repository.dart';
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

    final repository = DummyWorkOrderRepository.instance;
    final order = repository.getById(widget.workOrderId);
    final role = repository.currentTechnicianRole;
    final tasks = order.tasksFor(role);

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
            appBar: const OtotrAppBar(title: 'Görevlerim'),
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
            appBar: OtotrAppBar(title: 'Görevlerim'),
            backgroundColor: AppColors.grayBg,
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final order = snapshot.data!;
        final role = widget.repository.currentTechnicianRole;
        final tasks = order.tasksFor(role);

        return _TechnicianTasksView(
          order: order,
          role: role,
          tasks: tasks,
          workOrderId: widget.workOrderId,
          currentUser: widget.repository.currentUser,
          showEvidenceLinks: false,
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
    this.showEvidenceLinks = true,
    this.onClaim,
    this.onRelease,
  });

  final TechnicianWorkOrder order;
  final TechnicianRole role;
  final List<TechnicianTask> tasks;
  final String workOrderId;
  final UserProfile currentUser;
  final bool showEvidenceLinks;
  final Future<void> Function(String taskId)? onClaim;
  final Future<void> Function(String taskId, String reason)? onRelease;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Görevlerim'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            status: order.isStartEvidenceComplete
                ? const OtotrStatusBadge(
                    label: 'Teknik giriş açık',
                    tone: OtotrBadgeTone.success,
                  )
                : const OtotrStatusBadge(
                    label: 'Teknik giriş kilitli: başlangıç kanıtı eksik',
                    tone: OtotrBadgeTone.danger,
                  ),
            message: order.isStartEvidenceComplete
                ? 'Müsait başlıklardan birini üzerine alıp doldurabilirsiniz.'
                : 'Önce şasi, plaka ve KM kanıtlarını tamamlayın.',
          ),
          for (final task in tasks)
            _TaskCard(
              task: task,
              isUnlocked: order.isStartEvidenceComplete,
              workOrderId: workOrderId,
              currentUser: currentUser,
              onClaim: onClaim == null ? null : () => onClaim!(task.taskId),
              onRelease: onRelease == null
                  ? null
                  : (reason) => onRelease!(task.taskId, reason),
            ),
          if (showEvidenceLinks) ...[
            OtotrSecondaryButton(
              label: 'Kanıt Fotoğrafları',
              icon: Icons.photo_camera,
              onPressed: () => Navigator.pushNamed(
                context,
                AppRoutes.technicianEvidence,
                arguments: workOrderId,
              ),
            ),
            const SizedBox(height: 8),
            OtotrSecondaryButton(
              label: 'Tramer / KM',
              icon: Icons.manage_search,
              onPressed: () => Navigator.pushNamed(
                context,
                AppRoutes.technicianQueries,
                arguments: workOrderId,
              ),
            ),
            const SizedBox(height: 8),
          ],
          OtotrPrimaryButton(
            label: 'Rapor Kapısını Kontrol Et',
            icon: Icons.fact_check,
            onPressed: () => Navigator.pushNamed(
              context,
              AppRoutes.technicianReportGate,
              arguments: workOrderId,
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
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
    final canClaim = isUnlocked && !task.isOwned && onClaim != null;
    final canOpenForm = isUnlocked && (canEdit || isReadOnly);

    return OtotrCard(
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
              'JSON alt başlıkları',
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
          if (!task.isOwned)
            OtotrPrimaryButton(
              label:
                  isUnlocked ? 'Başlığı Sahiplen' : 'Başlangıç Kanıtı Gerekli',
              icon: isUnlocked ? Icons.assignment_ind : Icons.lock,
              onPressed: canClaim ? onClaim : null,
            )
          else if (isOwnedByCurrentUser)
            OtotrSecondaryButton(
              label: 'Görevi Devret / Görevi Bırak',
              icon: Icons.undo,
              onPressed:
                  onRelease == null ? null : () => _showReleaseDialog(context),
            ),
          if (!task.isOwned || isOwnedByCurrentUser) const SizedBox(height: 8),
          OtotrPrimaryButton(
            label: isReadOnly
                ? 'Sadece Görüntüle'
                : isUnlocked
                    ? 'Kontrol Formunu Aç'
                    : 'Başlangıç Kanıtı Gerekli',
            icon: isReadOnly
                ? Icons.visibility
                : isUnlocked
                    ? Icons.edit_note
                    : Icons.lock,
            onPressed: canOpenForm
                ? () => Navigator.pushNamed(
                      context,
                      AppRoutes.technicianTaskForm,
                      arguments: {
                        'workOrderId': workOrderId,
                        'taskId': task.taskId,
                      },
                    )
                : null,
          ),
        ],
      ),
    );
  }

  Future<void> _showReleaseDialog(BuildContext context) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Görevi Bırak'),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Bırakma gerekçesi',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Havuza Bırak'),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 250));
    controller.dispose();
    if (reason == null || reason.trim().isEmpty || onRelease == null) {
      return;
    }
    await onRelease!(reason);
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
