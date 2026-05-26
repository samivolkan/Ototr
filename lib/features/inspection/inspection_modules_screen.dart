import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/inspection_module_model.dart';

class InspectionModulesScreen extends StatelessWidget {
  const InspectionModulesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Ekspertiz Modülleri'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          const OtotrSectionTitle(
              title: 'Modül Durumu',
              subtitle:
                  'Her modül kanıt, kontrol listesi ve kritik bulgu bilgisiyle takip edilir.'),
          ...DummyData.modules.map(
            (module) => OtotrCard(
              onTap: () => Navigator.pushNamed(
                  context, AppRoutes.inspectionModuleDetail,
                  arguments: module.id),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(module.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 17))),
                      OtotrStatusBadge(
                          label: module.status.label,
                          tone: _tone(module.status)),
                    ],
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Text('Teknisyen: ${module.technician}'),
                  Text(
                      'Kanıt: ${module.hasEvidence ? 'Var' : 'Eksik'} | Checklist: ${module.completedCount}/${module.checklistCount} | Kritik: ${module.criticalCount}'),
                  const SizedBox(height: AppSizes.sm),
                  const Align(
                      alignment: Alignment.centerRight,
                      child: Text('Detay >',
                          style: TextStyle(fontWeight: FontWeight.w800))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  OtotrBadgeTone _tone(ModuleStatus status) {
    return switch (status) {
      ModuleStatus.completed => OtotrBadgeTone.success,
      ModuleStatus.criticalFinding => OtotrBadgeTone.danger,
      ModuleStatus.inProgress => OtotrBadgeTone.info,
      ModuleStatus.pending || ModuleStatus.notChecked => OtotrBadgeTone.neutral,
    };
  }
}
