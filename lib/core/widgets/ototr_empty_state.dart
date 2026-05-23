import 'package:flutter/material.dart';

import '../constants/app_sizes.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'ototr_card.dart';

class OtotrEmptyState extends StatelessWidget {
  const OtotrEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        children: [
          Icon(icon, size: 42, color: AppColors.grayText),
          const SizedBox(height: AppSizes.md),
          Text(title, style: AppTextStyles.section),
          const SizedBox(height: AppSizes.xs),
          Text(message, style: AppTextStyles.muted, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
