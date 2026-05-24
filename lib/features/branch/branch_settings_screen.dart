import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../data/dummy/dummy_data.dart';

class BranchSettingsScreen extends StatelessWidget {
  const BranchSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const branch = DummyData.branch;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Şube Ayarları'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          const OtotrSectionTitle(title: 'Şube Bilgileri'),
          OtotrCard(
            child: Text(
              '${branch.name}\n'
              'Şube kodu: ${branch.code}\n'
              'Yetkili: ${branch.authorizedUser}\n'
              'Teknik sorumlu: ${branch.technicalResponsible}\n'
              'Çalışma saatleri: ${branch.workingHours}\n'
              'Personel sayısı: ${branch.staffCount}',
            ),
          ),
          const OtotrSectionTitle(title: 'Belge ve Uyum'),
          OtotrCard(
            child: Text(
              'TSE/HYB belge placeholder: ${branch.hasTseHybDocument ? 'Kayıtlı' : 'Eksik'}\n'
              'Mesleki sorumluluk sigortası: ${branch.hasLiabilityInsurance ? 'Kayıtlı' : 'Eksik'}\n'
              'Belge yenileme ve merkez denetimi sonradan Firebase sync ile bağlanacak.',
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
