import 'package:flutter/material.dart';

import '../../../core/constants/app_sizes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/ototr_card.dart';
import '../../../data/models/technician_operation_model.dart';

class TechnicianVehicleHeader extends StatelessWidget {
  const TechnicianVehicleHeader({
    super.key,
    required this.order,
    this.role,
    this.status,
    this.message,
    this.trailing,
  });

  final TechnicianWorkOrder order;
  final TechnicianRole? role;
  final Widget? status;
  final String? message;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _PlateBox(plate: order.plate)),
              if (trailing != null) ...[
                const SizedBox(width: AppSizes.md),
                trailing!,
              ],
            ],
          ),
          const SizedBox(height: AppSizes.md),
          Text(
            order.vehicleSummary,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            [
              order.number,
              order.packageName,
              if (role != null) role!.label,
            ].join(' • '),
            style: const TextStyle(color: AppColors.grayText),
          ),
          if (status != null) ...[
            const SizedBox(height: AppSizes.md),
            status!,
          ],
          if (message != null && message!.isNotEmpty) ...[
            const SizedBox(height: AppSizes.sm),
            Text(message!, style: const TextStyle(color: AppColors.grayText)),
          ],
        ],
      ),
    );
  }
}

class _PlateBox extends StatelessWidget {
  const _PlateBox({required this.plate});

  final String plate;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 52),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkText, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            height: 52,
            width: 56,
            alignment: Alignment.center,
            color: AppColors.info,
            child: const Text(
              'TR',
              style: TextStyle(
                color: AppColors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                plate,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.darkText,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
