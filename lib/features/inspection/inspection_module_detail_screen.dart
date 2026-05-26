import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/inspection_checklist_item_model.dart';

class InspectionModuleDetailScreen extends StatelessWidget {
  const InspectionModuleDetailScreen({super.key, this.moduleId});

  final String? moduleId;

  @override
  Widget build(BuildContext context) {
    final module = DummyData.modules.firstWhere(
      (item) => item.id == moduleId,
      orElse: () => DummyData.modules.first,
    );

    return Scaffold(
      appBar: OtotrAppBar(title: module.name),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrSectionTitle(
            title: 'Kontrol Listesi',
            subtitle:
                '${module.technician} tarafından yürütülüyor. Fotoğraf zorunluluğu ve şiddet göstergesi rapora taşınacak.',
          ),
          ...module.checklistItems.map(
            (item) => OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(item.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 16))),
                      OtotrStatusBadge(
                          label: item.result.label, tone: _tone(item.result)),
                    ],
                  ),
                  const SizedBox(height: AppSizes.sm),
                  DropdownButtonFormField<ChecklistResultStatus>(
                    initialValue: item.result,
                    decoration: const InputDecoration(labelText: 'Sonuç'),
                    items: ChecklistResultStatus.values
                        .map((result) => DropdownMenuItem(
                            value: result, child: Text(result.label)))
                        .toList(),
                    onChanged: (_) {},
                  ),
                  const SizedBox(height: AppSizes.sm),
                  TextFormField(
                    initialValue: item.note,
                    maxLines: 2,
                    decoration:
                        const InputDecoration(labelText: 'Teknisyen Notu'),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: item.photoRequired,
                    onChanged: (_) {},
                    title: const Text('Fotoğraf zorunlu placeholder'),
                  ),
                  Text('Şiddet göstergesi: ${item.severity}/3',
                      style: TextStyle(
                          color: item.severity > 0
                              ? AppColors.red
                              : AppColors.success)),
                ],
              ),
            ),
          ),
          OtotrPrimaryButton(
            label: 'Modül İlerlemesine Dön',
            icon: Icons.timeline,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.inspectionProgress),
          ),
        ],
      ),
    );
  }

  OtotrBadgeTone _tone(ChecklistResultStatus result) {
    return switch (result) {
      ChecklistResultStatus.normal => OtotrBadgeTone.success,
      ChecklistResultStatus.attention => OtotrBadgeTone.warning,
      ChecklistResultStatus.critical => OtotrBadgeTone.danger,
      ChecklistResultStatus.notChecked => OtotrBadgeTone.neutral,
    };
  }
}
