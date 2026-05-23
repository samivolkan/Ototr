import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_metric_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../data/dummy/dummy_data.dart';

class BranchKpiScreen extends StatelessWidget {
  const BranchKpiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final staff = ['Murat Kaya', 'Elif Arslan', 'Can Özkan'];
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Şube Performansı'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          Text(DummyData.branch.name, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: AppSizes.md),
          const Row(
            children: [
              Expanded(child: OtotrMetricCard(label: 'Günlük Araç', value: '12', icon: Icons.today)),
              SizedBox(width: AppSizes.md),
              Expanded(child: OtotrMetricCard(label: 'Haftalık Araç', value: '68', icon: Icons.date_range, tone: AppColors.info)),
            ],
          ),
          const Row(
            children: [
              Expanded(child: OtotrMetricCard(label: 'Ort. Süre', value: '72 dk', icon: Icons.timer_outlined, tone: AppColors.warning)),
              SizedBox(width: AppSizes.md),
              Expanded(child: OtotrMetricCard(label: 'Rapor', value: '57', icon: Icons.description_outlined, tone: AppColors.success)),
            ],
          ),
          const OtotrSectionTitle(title: 'Operasyon Kalitesi'),
          const OtotrCard(child: Text('Eksik fotoğraf kanıt oranı: %8\nGeciken iş emirleri: 3\nKritik bulgu oranı: %14\nMüşteri teslim süresi placeholder: 18 dk')),
          const OtotrSectionTitle(title: 'Personel Performansı'),
          ...staff.map((name) => OtotrCard(child: Text('$name\nTamamlanan iş: 8\nOrtalama süre: 70 dk\nEksik kanıt: 1'))),
        ],
      ),
    );
  }
}
