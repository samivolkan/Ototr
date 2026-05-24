import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_metric_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/package_plan_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/branch_work_order_repository.dart';
import '../../data/repositories/work_order_local_repository.dart';

class WorkOrdersListScreen extends StatefulWidget {
  const WorkOrdersListScreen({super.key});

  @override
  State<WorkOrdersListScreen> createState() => _WorkOrdersListScreenState();
}

class _WorkOrdersListScreenState extends State<WorkOrdersListScreen> {
  late Future<_WorkOrdersListData> _future;

  BranchWorkOrderRepository get _repository =>
      AppRepositories.instance.branchWorkOrders;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Is Emirleri'),
      body: FutureBuilder<_WorkOrdersListData>(
        future: _future,
        builder: (context, snapshot) {
          final data = snapshot.data;
          final orders = data?.orders ?? const <WorkOrder>[];
          final summary = data?.summary ??
              const WorkOrderSummary(
                total: 0,
                active: 0,
                missingData: 0,
                completedTasks: 0,
              );

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(AppSizes.lg),
              children: [
                _SourceBar(repository: _repository),
                OtotrPrimaryButton(
                  label: 'Yeni Is Emri',
                  icon: Icons.add_circle_outline,
                  onPressed: () => Navigator.pushNamed(
                    context,
                    AppRoutes.newWorkOrder,
                  ).then((_) => _refresh()),
                ),
                const SizedBox(height: AppSizes.md),
                if (snapshot.hasError)
                  OtotrCard(
                    child: Text(
                      'Is emirleri alinamadi: ${snapshot.error}',
                      style: const TextStyle(color: AppColors.red),
                    ),
                  ),
                if (snapshot.connectionState != ConnectionState.done)
                  const OtotrCard(child: Text('Is emirleri yukleniyor...')),
                Row(
                  children: [
                    Expanded(
                      child: OtotrMetricCard(
                        label: 'Toplam is emri',
                        value: summary.total.toString(),
                        icon: Icons.assignment_outlined,
                      ),
                    ),
                    const SizedBox(width: AppSizes.md),
                    Expanded(
                      child: OtotrMetricCard(
                        label: 'Aktif',
                        value: summary.active.toString(),
                        icon: Icons.pending_actions_outlined,
                        tone: AppColors.info,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: OtotrMetricCard(
                        label: 'Eksik veri',
                        value: summary.missingData.toString(),
                        icon: Icons.warning_amber_outlined,
                        tone: AppColors.warning,
                      ),
                    ),
                    const SizedBox(width: AppSizes.md),
                    Expanded(
                      child: OtotrMetricCard(
                        label: 'Tamamlanan gorev',
                        value: summary.completedTasks.toString(),
                        icon: Icons.task_alt,
                        tone: AppColors.success,
                      ),
                    ),
                  ],
                ),
                const OtotrSectionTitle(title: 'Kayitlar'),
                if (orders.isEmpty &&
                    snapshot.connectionState == ConnectionState.done)
                  const OtotrCard(child: Text('Henuz is emri yok.'))
                else
                  for (final order in orders)
                    _WorkOrderCard(
                      order: order,
                      repository: _repository,
                    ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<_WorkOrdersListData> _load() async {
    final orders = await _repository.getAll();
    final summary = await _repository.summary();
    return _WorkOrdersListData(orders: orders, summary: summary);
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _load();
    });
    await _future;
  }
}

class _SourceBar extends StatelessWidget {
  const _SourceBar({required this.repository});

  final BranchWorkOrderRepository repository;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.md),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: repository.isRemote
            ? const Color(0xFFEAF7F0)
            : const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(AppSizes.radius),
      ),
      child: Row(
        children: [
          Icon(repository.isRemote ? Icons.cloud_done : Icons.storage,
              size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              repository.isRemote
                  ? 'Supabase canli veri aktif'
                  : 'Local demo veri aktif',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkOrderCard extends StatelessWidget {
  const _WorkOrderCard({
    required this.order,
    required this.repository,
  });

  final WorkOrder order;
  final BranchWorkOrderRepository repository;

  @override
  Widget build(BuildContext context) {
    final missingCount = repository.missingDataCount(order);
    final packageType = order.packageType ?? PackageType.standard;
    return OtotrCard(
      onTap: () => Navigator.pushNamed(
        context,
        AppRoutes.workOrderDetail,
        arguments: order.id,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.number,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
              ),
              OtotrStatusBadge(
                label: order.status.label,
                tone: _tone(order.status, missingCount),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.sm),
          Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
          Text('${order.customer.fullName} | ${order.customer.phone}'),
          Text('${packageType.label} | ${Formatters.time(order.createdAt)}'),
          const SizedBox(height: AppSizes.sm),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              OtotrStatusBadge(
                label: '${order.tasks.length} gorev',
                tone: OtotrBadgeTone.info,
              ),
              OtotrStatusBadge(
                label: '$missingCount eksik veri',
                tone: missingCount == 0
                    ? OtotrBadgeTone.success
                    : OtotrBadgeTone.warning,
              ),
              OtotrStatusBadge(
                label:
                    '${order.tasks.where((task) => task.status == WorkOrderTaskStatus.completed).length} tamam',
                tone: OtotrBadgeTone.neutral,
              ),
            ],
          ),
          const SizedBox(height: AppSizes.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(
                    context,
                    AppRoutes.workOrderDetail,
                    arguments: order.id,
                  ),
                  icon: const Icon(Icons.visibility_outlined),
                  label: const Text('Ac'),
                ),
              ),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => Navigator.pushNamed(
                    context,
                    AppRoutes.workOrderDetail,
                    arguments: order.id,
                  ),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Detay'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  OtotrBadgeTone _tone(WorkOrderStatus status, int missingCount) {
    if (status == WorkOrderStatus.cancelled) return OtotrBadgeTone.danger;
    if (missingCount > 0) return OtotrBadgeTone.warning;
    return switch (status) {
      WorkOrderStatus.approvalWaiting ||
      WorkOrderStatus.delivered ||
      WorkOrderStatus.approved =>
        OtotrBadgeTone.success,
      WorkOrderStatus.inspectionInProgress ||
      WorkOrderStatus.assigned =>
        OtotrBadgeTone.info,
      _ => OtotrBadgeTone.neutral,
    };
  }
}

class _WorkOrdersListData {
  const _WorkOrdersListData({
    required this.orders,
    required this.summary,
  });

  final List<WorkOrder> orders;
  final WorkOrderSummary summary;
}
