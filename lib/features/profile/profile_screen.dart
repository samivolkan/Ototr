import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/user_profile_model.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const user = DummyData.user;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Profil', showProfile: false),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Text(
              '${user.fullName}\n'
              '${user.role.label}\n'
              '${user.email}\n'
              '${user.phone}\n'
              'Durum: ${user.isActive ? 'Aktif' : 'Pasif'}',
            ),
          ),
          OtotrPrimaryButton(
            label: 'Çıkış Yap',
            icon: Icons.logout,
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
                context, AppRoutes.login, (_) => false),
          ),
        ],
      ),
    );
  }
}
