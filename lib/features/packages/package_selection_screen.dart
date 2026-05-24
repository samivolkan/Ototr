import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';

class PackageSelectionScreen extends StatefulWidget {
  const PackageSelectionScreen({super.key});

  @override
  State<PackageSelectionScreen> createState() => _PackageSelectionScreenState();
}

class _PackageSelectionScreenState extends State<PackageSelectionScreen> {
  String selectedId = 'premium';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Paket Seçimi'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          const OtotrSectionTitle(
            title: 'Ekspertiz Paketi',
            subtitle:
                'Fiyat alanları şimdilik placeholder; canlı fiyatlama merkez onayıyla bağlanacak.',
          ),
          ...DummyData.packages.map(
            (plan) => OtotrCard(
              onTap: () => setState(() => selectedId = plan.id),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(plan.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 18))),
                      if (plan.isRecommended)
                        const OtotrStatusBadge(
                            label: 'Önerilen', tone: OtotrBadgeTone.danger),
                    ],
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Text(plan.listPrice),
                  Text(plan.dealerDiscount),
                  Text(plan.maxDiscountWarning),
                  Text(plan.netCollection),
                  Text(plan.paymentStatus),
                  const SizedBox(height: AppSizes.sm),
                  Text('Süre: ${plan.durationMinutes} dk'),
                  const SizedBox(height: AppSizes.sm),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: plan.includedModules
                        .map((module) => OtotrStatusBadge(label: module))
                        .toList(),
                  ),
                  const SizedBox(height: AppSizes.md),
                  InkWell(
                    borderRadius: BorderRadius.circular(AppSizes.radius),
                    onTap: () => setState(() => selectedId = plan.id),
                    child: Padding(
                      padding:
                          const EdgeInsets.symmetric(vertical: AppSizes.sm),
                      child: Row(
                        children: [
                          Icon(
                            selectedId == plan.id
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                          ),
                          const SizedBox(width: AppSizes.sm),
                          const Text('Bu paketi seç'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          OtotrPrimaryButton(
            label: 'İş Emri Özetine Geç',
            icon: Icons.assignment_turned_in_outlined,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.workOrderSummary),
          ),
        ],
      ),
    );
  }
}
