import 'package:flutter/material.dart';

import '../constants/app_sizes.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'ototr_card.dart';

class OtotrMetricCard extends StatelessWidget {
  const OtotrMetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.tone = AppColors.navy,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: tone.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: tone),
          ),
          const SizedBox(width: AppSizes.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: AppTextStyles.title.copyWith(fontSize: 22)),
                Text(label, style: AppTextStyles.muted),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
