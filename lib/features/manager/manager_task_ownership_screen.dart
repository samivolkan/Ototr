import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
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

class ManagerTaskOwnershipScreen extends StatefulWidget {
  const ManagerTaskOwnershipScreen({super.key});

  @override
  State<ManagerTaskOwnershipScreen> createState() =>
      _ManagerTaskOwnershipScreenState();
}

class _ManagerTaskOwnershipScreenState
    extends State<ManagerTaskOwnershipScreen> {
  final _localRepository = DummyWorkOrderRepository.instance;
  Future<List<TechnicianWorkOrder>>? _remoteFuture;

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      _remoteFuture ??= remoteRepository.visibleWorkOrders();
      return FutureBuilder<List<TechnicianWorkOrder>>(
        future: _remoteFuture,
        builder: (context, snapshot) {
          final orders = snapshot.data ?? const <TechnicianWorkOrder>[];
          return _buildScaffold(
            currentUser: remoteRepository.currentUser,
            orders: orders,
            isLoading: snapshot.connectionState != ConnectionState.done,
            error: snapshot.error,
            onAssign: (orderId, taskId, ownerUserId, reason) async {
              await remoteRepository.managerAssignTask(
                orderId,
                taskId,
                ownerUserId,
                reason,
              );
              _refreshRemote(remoteRepository);
            },
            onClear: (orderId, taskId, reason) async {
              await remoteRepository.managerClearTaskOwner(
                orderId,
                taskId,
                reason,
              );
              _refreshRemote(remoteRepository);
            },
          );
        },
      );
    }

    return _buildScaffold(
      currentUser: _localRepository.currentUser,
      orders: _localRepository.visibleWorkOrders(),
      onAssign: (orderId, taskId, ownerUserId, reason) async {
        _localRepository.managerAssignTask(
            orderId, taskId, ownerUserId, reason);
        setState(() {});
      },
      onClear: (orderId, taskId, reason) async {
        _localRepository.managerClearTaskOwner(orderId, taskId, reason);
        setState(() {});
      },
    );
  }

  Widget _buildScaffold({
    required UserProfile currentUser,
    required List<TechnicianWorkOrder> orders,
    required Future<void> Function(
      String orderId,
      String taskId,
      String ownerUserId,
      String reason,
    ) onAssign,
    required Future<void> Function(
      String orderId,
      String taskId,
      String reason,
    ) onClear,
    bool isLoading = false,
    Object? error,
  }) {
    final canManage = currentUser.role == UserRole.branchManager;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Başlık Sahipliği'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${currentUser.fullName} - ${currentUser.role.label}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                OtotrStatusBadge(
                  label: canManage ? 'Müdür yetkisi aktif' : 'Read-only',
                  tone: canManage
                      ? OtotrBadgeTone.success
                      : OtotrBadgeTone.warning,
                ),
              ],
            ),
          ),
          if (isLoading)
            const OtotrCard(child: Text('Başlıklar yükleniyor...')),
          if (error != null)
            OtotrCard(
              child: Text(
                'Başlık sahipliği alınamadı: $error',
                style: const TextStyle(color: AppColors.red),
              ),
            ),
          for (final order in orders)
            for (final task in order.tasks)
              _OwnershipCard(
                order: order,
                task: task,
                canManage: canManage,
                onAssign: (ownerUserId, reason) => onAssign(
                  order.id,
                  task.taskId,
                  ownerUserId,
                  reason,
                ),
                onClear: (reason) => onClear(order.id, task.taskId, reason),
              ),
          if (!isLoading && orders.isEmpty && error == null)
            const OtotrCard(child: Text('Yonetilecek teknik baslik yok.')),
        ],
      ),
    );
  }

  void _refreshRemote(RemoteWorkOrderRepository repository) {
    setState(() {
      _remoteFuture = repository.visibleWorkOrders();
    });
  }
}

class _OwnershipCard extends StatelessWidget {
  const _OwnershipCard({
    required this.order,
    required this.task,
    required this.canManage,
    required this.onAssign,
    required this.onClear,
  });

  final TechnicianWorkOrder order;
  final TechnicianTask task;
  final bool canManage;
  final Future<void> Function(String ownerUserId, String reason) onAssign;
  final Future<void> Function(String reason) onClear;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${order.plate} - ${task.title}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OtotrStatusBadge(label: task.status.label, tone: _tone(task)),
              OtotrStatusBadge(
                label: task.isOwned ? 'Owner: ${task.ownerUserId}' : 'Havuzda',
                tone:
                    task.isOwned ? OtotrBadgeTone.warning : OtotrBadgeTone.info,
              ),
              OtotrStatusBadge(
                label: 'History: ${task.ownershipHistory.length}',
                tone: OtotrBadgeTone.neutral,
              ),
            ],
          ),
          if (task.releaseReason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Son gerekce: ${task.releaseReason}',
              style: const TextStyle(color: AppColors.grayText),
            ),
          ],
          const SizedBox(height: AppSizes.md),
          OtotrPrimaryButton(
            label: 'Baska Ustaya Ata',
            icon: Icons.manage_accounts,
            onPressed: canManage ? () => _showAssignDialog(context) : null,
          ),
          const SizedBox(height: 8),
          OtotrSecondaryButton(
            label: 'Sahipligi Kaldir',
            icon: Icons.lock_open,
            onPressed: canManage && task.isOwned
                ? () => _showClearDialog(context)
                : null,
          ),
        ],
      ),
    );
  }

  OtotrBadgeTone _tone(TechnicianTask task) {
    return switch (task.status) {
      TaskStatus.completed => OtotrBadgeTone.success,
      TaskStatus.evidenceMissing ||
      TaskStatus.managerReturned =>
        OtotrBadgeTone.danger,
      TaskStatus.conflictDetected => OtotrBadgeTone.warning,
      _ => OtotrBadgeTone.neutral,
    };
  }

  Future<void> _showAssignDialog(BuildContext context) async {
    final ownerController = TextEditingController();
    final reasonController = TextEditingController();
    final result = await showDialog<({String ownerUserId, String reason})>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Baska Ustaya Ata'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: ownerController,
              decoration: const InputDecoration(labelText: 'Yeni ownerUserId'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Atama gerekcesi'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Vazgec'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(
                context,
                (
                  ownerUserId: ownerController.text.trim(),
                  reason: reasonController.text.trim(),
                ),
              );
            },
            child: const Text('Ata'),
          ),
        ],
      ),
    );
    ownerController.dispose();
    reasonController.dispose();
    if (result == null || result.ownerUserId.isEmpty || result.reason.isEmpty) {
      return;
    }
    await onAssign(result.ownerUserId, result.reason);
  }

  Future<void> _showClearDialog(BuildContext context) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sahipligi Kaldir'),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Gerekce'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Vazgec'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Havuza Al'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null || reason.isEmpty) {
      return;
    }
    await onClear(reason);
  }
}
