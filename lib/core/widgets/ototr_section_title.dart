import 'package:flutter/material.dart';

import '../constants/app_sizes.dart';
import '../theme/app_text_styles.dart';

class OtotrSectionTitle extends StatelessWidget {
  const OtotrSectionTitle({
    super.key,
    required this.title,
    this.subtitle,
  });

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSizes.md, top: AppSizes.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTextStyles.section),
          if (subtitle != null) ...[
            const SizedBox(height: AppSizes.xs),
            Text(subtitle!, style: AppTextStyles.muted),
          ],
        ],
      ),
    );
  }
}
