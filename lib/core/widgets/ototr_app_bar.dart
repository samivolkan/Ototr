import 'package:flutter/material.dart';

import '../constants/app_constants.dart';
import '../navigation/app_routes.dart';

class OtotrAppBar extends StatelessWidget implements PreferredSizeWidget {
  const OtotrAppBar({
    super.key,
    required this.title,
    this.showProfile = true,
  });

  final String title;
  final bool showProfile;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const Text(
            '${AppConstants.brandName} | ${AppConstants.brandPositioning}',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
          ),
        ],
      ),
      actions: [
        if (showProfile)
          IconButton(
            tooltip: 'Profil',
            onPressed: () => Navigator.pushNamed(context, AppRoutes.profile),
            icon: const Icon(Icons.account_circle_outlined),
          ),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(64);
}
