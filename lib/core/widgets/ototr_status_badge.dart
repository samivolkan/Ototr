import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class OtotrStatusBadge extends StatelessWidget {
  const OtotrStatusBadge({
    super.key,
    required this.label,
    this.tone = OtotrBadgeTone.neutral,
  });

  final String label;
  final OtotrBadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = switch (tone) {
      OtotrBadgeTone.success => (AppColors.success, const Color(0xFFEAF7F0)),
      OtotrBadgeTone.warning => (AppColors.warning, const Color(0xFFFFF7E6)),
      OtotrBadgeTone.danger => (AppColors.red, AppColors.redSoft),
      OtotrBadgeTone.info => (AppColors.info, const Color(0xFFEFF6FF)),
      OtotrBadgeTone.neutral => (AppColors.grayText, AppColors.grayBg),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.$2,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.$1,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

enum OtotrBadgeTone { neutral, success, warning, danger, info }
