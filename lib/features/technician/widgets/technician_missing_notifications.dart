import 'package:flutter/material.dart';

import '../../../core/constants/app_sizes.dart';
import '../../../core/navigation/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/technician_operation_model.dart';
import '../../../data/services/report_gate_calculator.dart';

class TechnicianMissingNotifications extends StatelessWidget {
  const TechnicianMissingNotifications({
    super.key,
    required this.order,
    this.syncQueue = const [],
    this.onChanged,
    this.includeTaskAction = true,
  });

  final TechnicianWorkOrder order;
  final List<OfflineSyncQueue> syncQueue;
  final VoidCallback? onChanged;
  final bool includeTaskAction;

  @override
  Widget build(BuildContext context) {
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: syncQueue,
    );
    final actions = _actionsForIssues(result.issues);
    if (actions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.redSoft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.red.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.notifications_active_outlined,
                color: AppColors.red,
                size: 18,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Eksik Bildirimleri',
                  style: TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              Text(
                '${actions.length}',
                style: const TextStyle(
                  color: AppColors.red,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final action in actions) ...[
            _NotificationActionButton(
              action: action,
              onPressed: () => _open(context, action),
            ),
            if (action != actions.last) const SizedBox(height: 6),
          ],
        ],
      ),
    );
  }

  List<_NotificationAction> _actionsForIssues(List<ReportGateIssue> issues) {
    final actions = <_NotificationAction>[];

    final startIssues = issues
        .where((issue) => issue.code == ReportGateIssueCode.startEvidenceMissing)
        .toList(growable: false);
    if (startIssues.isNotEmpty) {
      actions.add(
        _NotificationAction(
          title: 'Araç Başlama İş Emri eksik',
          subtitle: startIssues.first.message,
          icon: Icons.camera_alt_outlined,
          routeName: AppRoutes.technicianStartEvidence,
        ),
      );
    }

    final taskIds = <String>{
      for (final issue in issues)
        if (_isTechnicalTaskIssue(issue) && issue.taskId != null)
          issue.taskId!,
    };
    if (includeTaskAction && taskIds.isNotEmpty) {
      actions.add(
        _NotificationAction(
          title: '${taskIds.length} teknik başlık bekliyor',
          subtitle: 'Eksik başlıkları tamamlamak için görev listesine geçin.',
          icon: Icons.checklist_outlined,
          routeName: AppRoutes.technicianTasks,
        ),
      );
    }

    final finalMediaIssues = issues.where(_isFinalMediaIssue).length;
    if (finalMediaIssues > 0) {
      actions.add(
        _NotificationAction(
          title: 'Rapor medyaları eksik',
          subtitle: '$finalMediaIssues fotoğraf/video alanı tamamlanmalı.',
          icon: Icons.photo_camera_outlined,
          routeName: AppRoutes.technicianEvidence,
        ),
      );
    }

    return actions;
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

  void _open(BuildContext context, _NotificationAction action) {
    Navigator.pushNamed(
      context,
      action.routeName,
      arguments: order.id,
    ).then((_) {
      if (context.mounted) {
        onChanged?.call();
      }
    });
  }
}

class _NotificationAction {
  const _NotificationAction({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.routeName,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String routeName;
}

class _NotificationActionButton extends StatelessWidget {
  const _NotificationActionButton({
    required this.action,
    required this.onPressed,
  });

  final _NotificationAction action;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.navy,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          side: const BorderSide(color: AppColors.grayBorder),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSizes.radius),
          ),
        ),
        child: Row(
          children: [
            Icon(action.icon, color: AppColors.red, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    action.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    action.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.grayText,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 18),
          ],
        ),
      ),
    );
  }
}
