import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/package_plan_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/branch_work_order_repository.dart';

class WorkOrderDetailScreen extends StatefulWidget {
  const WorkOrderDetailScreen({super.key});

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  Future<WorkOrder?>? _future;
  String? _workOrderId;

  BranchWorkOrderRepository get _repository =>
      AppRepositories.instance.branchWorkOrders;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args is String ? args : null;
    if (_future == null || id != _workOrderId) {
      _workOrderId = id;
      _future = _load(id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Is Emri Detayi'),
      body: FutureBuilder<WorkOrder?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Is emri alinamadi: ${snapshot.error}'));
          }
          final order = snapshot.data;
          if (order == null) {
            return const Center(child: Text('Is emri bulunamadi.'));
          }
          return _buildOrder(context, order);
        },
      ),
    );
  }

  Widget _buildOrder(BuildContext context, WorkOrder order) {
    final packageType = order.packageType ?? PackageType.standard;
    final missingCount = _repository.missingDataCount(order);
    return ListView(
      padding: const EdgeInsets.all(AppSizes.lg),
      children: [
        OtotrCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      order.number,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  OtotrStatusBadge(
                    label: order.status.label,
                    tone: missingCount == 0
                        ? OtotrBadgeTone.info
                        : OtotrBadgeTone.warning,
                  ),
                ],
              ),
              const SizedBox(height: AppSizes.sm),
              Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
              Text('${order.customer.fullName} | ${order.customer.phone}'),
              Text('Paket: ${packageType.label}'),
              Text('Kaynak: ${_repository.sourceLabel}'),
              if (order.notes.trim().isNotEmpty) Text('Not: ${order.notes}'),
            ],
          ),
        ),
        if (missingCount > 0)
          OtotrAlertCard(
            title: '$missingCount eksik veri var',
            message:
                'Zorunlu gorevler tamamlanmadan veya temel musteri/arac bilgisi eksikken is emri rapor onayina hazir sayilmaz.',
          )
        else
          const OtotrAlertCard(
            title: 'Eksik veri yok',
            message:
                'Temel bilgiler ve zorunlu gorevler tamamlanmis gorunuyor.',
          ),
        const OtotrSectionTitle(title: 'Eksik veriler'),
        OtotrCard(
          child: Column(
            children: [
              for (final item in _missingItems(order))
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(
                    Icons.error_outline,
                    color: AppColors.warning,
                  ),
                  title: Text(item),
                ),
              if (_missingItems(order).isEmpty)
                const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.check_circle, color: AppColors.success),
                  title: Text('Eksik veri bulunmuyor.'),
                ),
            ],
          ),
        ),
        OtotrSectionTitle(
          title: 'Gorevler',
          subtitle:
              '${order.tasks.where((task) => task.status == WorkOrderTaskStatus.completed).length}/${order.tasks.length} tamamlandi.',
        ),
        for (final task in order.tasks)
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        task.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    OtotrStatusBadge(
                      label: task.status.label,
                      tone: _taskTone(task.status),
                    ),
                  ],
                ),
                const SizedBox(height: AppSizes.xs),
                Text(task.type.code),
                const SizedBox(height: AppSizes.md),
                DropdownButtonFormField<WorkOrderTaskStatus>(
                  initialValue: task.status,
                  decoration: const InputDecoration(labelText: 'Gorev durumu'),
                  items: [
                    for (final status in WorkOrderTaskStatus.values)
                      DropdownMenuItem(
                        value: status,
                        child: Text(status.label),
                      ),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    _updateTask(order.id, task.id, value);
                  },
                ),
              ],
            ),
          ),
      ],
    );
  }

  Future<WorkOrder?> _load(String? id) async {
    if (id != null) {
      return _repository.getById(id);
    }
    final orders = await _repository.getAll();
    return orders.isEmpty ? null : orders.first;
  }

  Future<void> _updateTask(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  ) async {
    try {
      final next = await _repository.updateTaskStatus(
        workOrderId,
        taskId,
        status,
      );
      setState(() {
        _workOrderId = next.id;
        _future = Future.value(next);
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gorev durumu guncellenemedi: $error')),
      );
    }
  }

  List<String> _missingItems(WorkOrder order) {
    final items = <String>[];
    if (order.customer.fullName.trim().isEmpty) {
      items.add('Musteri adi eksik.');
    }
    if (order.customer.phone.trim().isEmpty) {
      items.add('Musteri telefonu eksik.');
    }
    if (order.vehicle.plate.trim().isEmpty) {
      items.add('Plaka eksik.');
    }
    if (order.vehicle.brand.trim().isEmpty) {
      items.add('Marka eksik.');
    }
    if (order.vehicle.model.trim().isEmpty) {
      items.add('Model eksik.');
    }
    if (order.vehicle.year <= 0) {
      items.add('Yil eksik.');
    }
    if (order.vehicle.kilometers < 0) {
      items.add('Kilometre hatali.');
    }
    for (final task in order.tasks) {
      if (task.isRequired &&
          task.status != WorkOrderTaskStatus.completed &&
          task.status != WorkOrderTaskStatus.cancelled) {
        items.add('${task.title} tamamlanmadi.');
      }
    }
    return items;
  }

  OtotrBadgeTone _taskTone(WorkOrderTaskStatus status) {
    return switch (status) {
      WorkOrderTaskStatus.completed => OtotrBadgeTone.success,
      WorkOrderTaskStatus.inProgress => OtotrBadgeTone.info,
      WorkOrderTaskStatus.assigned => OtotrBadgeTone.neutral,
      WorkOrderTaskStatus.cancelled => OtotrBadgeTone.danger,
      WorkOrderTaskStatus.pending => OtotrBadgeTone.warning,
    };
  }
}
