import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_section_title.dart';

class NewWorkOrderScreen extends StatelessWidget {
  const NewWorkOrderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Yeni İş Emri'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          const OtotrSectionTitle(
            title: 'Araç kabul akışı',
            subtitle: 'Araç, müşteri, paket, modül ve fotoğraf kanıtı adımlarını sırayla tamamlayın.',
          ),
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Yeni Araç Kabulü Başlat', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: AppSizes.sm),
                const Text('Plaka ve araç bilgileriyle taslak iş emrini açar.'),
                const SizedBox(height: AppSizes.lg),
                OtotrPrimaryButton(
                  label: 'Araç Kabulüne Başla',
                  icon: Icons.play_arrow,
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.vehicleIntake),
                ),
              ],
            ),
          ),
          OtotrSecondaryButton(
            label: 'Taslak İş Emirleri',
            icon: Icons.drafts_outlined,
            onPressed: () => Navigator.pushNamed(context, AppRoutes.workOrders),
          ),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(
            label: 'Son İş Emirleri',
            icon: Icons.history,
            onPressed: () => Navigator.pushNamed(context, AppRoutes.workOrders),
          ),
        ],
      ),
    );
  }
}
