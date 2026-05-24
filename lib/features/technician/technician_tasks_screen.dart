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
import '../../data/repositories/dummy_work_order_repository.dart';

class TechnicianTasksScreen extends StatelessWidget {
  const TechnicianTasksScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final repository = DummyWorkOrderRepository.instance;
    final order = repository.getById(workOrderId);
    final role = repository.currentTechnicianRole;
    final tasks = order.tasksFor(role);

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Görevlerim'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${order.plate} - ${role.label}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
                ),
                const SizedBox(height: 6),
                Text(order.vehicleSummary),
                const SizedBox(height: 10),
                if (!order.isStartEvidenceComplete)
                  const OtotrStatusBadge(
                    label: 'Teknik giriş kilitli: başlangıç kanıtı eksik',
                    tone: OtotrBadgeTone.danger,
                  )
                else
                  const OtotrStatusBadge(
                    label: 'Teknik giriş açık',
                    tone: OtotrBadgeTone.success,
                  ),
              ],
            ),
          ),
          for (final task in tasks)
            _TaskCard(
              task: task,
              isUnlocked: order.isStartEvidenceComplete,
              workOrderId: workOrderId,
            ),
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
  });

  final TechnicianTask task;
  final bool isUnlocked;
  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final tone = switch (task.status) {
      TaskStatus.completed => OtotrBadgeTone.success,
      TaskStatus.evidenceMissing || TaskStatus.managerReturned => OtotrBadgeTone.danger,
      TaskStatus.conflictDetected => OtotrBadgeTone.warning,
      _ => OtotrBadgeTone.neutral,
    };

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
              OtotrStatusBadge(label: task.status.name, tone: tone),
              OtotrStatusBadge(
                label: '${task.checklistItems.length} kontrol',
                tone: OtotrBadgeTone.info,
              ),
              OtotrStatusBadge(
                label: '${task.estimatedMinutes} dk',
                tone: OtotrBadgeTone.neutral,
              ),
            ],
          ),
          if (task.managerReturnReason.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Müdür iadesi: ${task.managerReturnReason}',
              style: const TextStyle(color: AppColors.red),
            ),
          ],
          const SizedBox(height: AppSizes.md),
          OtotrPrimaryButton(
            label: isUnlocked ? 'Kontrol Formunu Aç' : 'Başlangıç Kanıtı Gerekli',
            icon: isUnlocked ? Icons.edit_note : Icons.lock,
            onPressed: isUnlocked
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
}
