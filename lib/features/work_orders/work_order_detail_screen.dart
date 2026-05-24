import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/work_order_model.dart';

class WorkOrderDetailScreen extends StatelessWidget {
  const WorkOrderDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = DummyData.workOrder;
    final args = ModalRoute.of(context)?.settings.arguments;
    final mode = args is Map ? args['mode'] as String? : 'view';
    final requestEditMode = mode == 'requestEdit' || order.isReportPrinted;
    final canEdit = mode == 'edit' && !requestEditMode;
    final timeline = ['Taslak', 'Araç Kabul Edildi', 'Ekspertiz Başladı', 'Modüller Tamamlandı', 'Rapor Hazırlandı', 'Müşteriye Teslim Edildi'];
    return Scaffold(
      appBar: const OtotrAppBar(title: 'İş Emri Detayı'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(order.number, style: Theme.of(context).textTheme.titleLarge)),
                    OtotrStatusBadge(label: order.status.label, tone: OtotrBadgeTone.info),
                  ],
                ),
                Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
                Text('${order.customer.fullName} | ${order.customer.phone}'),
                Text('Teknisyen: ${order.assignedTechnician}'),
                Text('Paket: ${order.packagePlan.name}'),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Durum Zaman Çizelgesi'),
          OtotrCard(
            child: Column(
              children: timeline
                  .map(
                    (step) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(step == 'Ekspertiz Başladı' ? Icons.radio_button_checked : Icons.check_circle, color: step == 'Ekspertiz Başladı' ? AppColors.red : AppColors.success),
                      title: Text(step),
                    ),
                  )
                  .toList(),
            ),
          ),
          OtotrAlertCard(
            title: requestEditMode
                ? 'Rapor basılmış iş emri kilitli'
                : canEdit
                    ? 'Düzenleme modu açık'
                    : 'Görüntüleme modu',
            message: requestEditMode
                ? 'Bu iş emri doğrudan düzenlenemez. Değişiklik için yöneticiden düzenleme talebi açılır.'
                : canEdit
                    ? 'Alanlar düzenlenebilir. Kaydetme sırasında audit kaydı ve revizyon notu oluşturulacak.'
                    : 'Aç ile girildiği için iş emri alanları kilitli görüntülenir. Değişiklik için Düzenle kullanılmalıdır.',
          ),
          const OtotrSectionTitle(title: 'İş Emri Giriş Alanları'),
          OtotrCard(
            child: Column(
              children: [
                TextFormField(
                  initialValue: order.vehicle.plate,
                  enabled: canEdit,
                  decoration: const InputDecoration(labelText: 'Plaka'),
                ),
                const SizedBox(height: AppSizes.md),
                TextFormField(
                  initialValue: order.vehicle.vin,
                  enabled: canEdit,
                  decoration: const InputDecoration(labelText: 'Şasi / VIN'),
                ),
                const SizedBox(height: AppSizes.md),
                TextFormField(
                  initialValue: order.customer.fullName,
                  enabled: canEdit,
                  decoration: const InputDecoration(labelText: 'Müşteri'),
                ),
                const SizedBox(height: AppSizes.md),
                TextFormField(
                  initialValue: order.notes,
                  enabled: canEdit,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'İş Emri Notu'),
                ),
              ],
            ),
          ),
          OtotrCard(child: Text('Modül ilerleme: ${order.completedModules}/${order.modules.length}\nFotoğraf durumu: ${order.photoEvidence.length - order.missingRequiredPhotoCount}/${order.photoEvidence.length}\nNot: ${order.notes}')),
          const OtotrSectionTitle(title: 'Operasyon Eşikleri'),
          OtotrCard(
            child: Column(
              children: order.operationGates
                  .map(
                    (gate) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        gate.isPassed ? Icons.check_circle : Icons.lock_outline,
                        color: gate.isPassed ? AppColors.success : AppColors.red,
                      ),
                      title: Text(gate.title),
                      trailing: OtotrStatusBadge(
                        label: gate.isPassed ? 'Geçildi' : 'Kapalı',
                        tone: gate.isPassed ? OtotrBadgeTone.success : OtotrBadgeTone.warning,
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          OtotrAlertCard(
            title: order.reportPrintGateReady ? 'Rapor basım kapısı açık' : 'Rapor basım kapısı kapalı',
            message: order.reportPrintGateReady
                ? 'Tüm modüller, fotoğraflar, dış sorgular ve kalite onayı tamamlandı.'
                : 'Rapor basımı için modül, fotoğraf, dış sorgu ve yönetici kalite onayı tamamlanmalı.',
          ),
          OtotrAlertCard(
            title: order.deliveryGateReady ? 'Teslim kapısı tamam' : 'Teslim kapısı kapalı',
            message: order.deliveryGateReady
                ? 'Rapor basıldı, ödeme ve müşteri teslim onayı tamamlandı.'
                : 'Teslim edildi statüsü için rapor basımı, ödeme ve müşteri teslim onayı gerekir.',
          ),
          if (requestEditMode)
            OtotrPrimaryButton(
              label: 'Yöneticiden Düzenleme Talebi Aç',
              icon: Icons.admin_panel_settings_outlined,
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Düzenleme talebi yönetici onayına gönderildi.')),
              ),
            )
          else
            OtotrPrimaryButton(
              label: canEdit ? 'Değişiklikleri Kaydet' : 'Ekspertizi Başlat',
              icon: canEdit ? Icons.save_outlined : Icons.play_arrow,
              onPressed: () => Navigator.pushNamed(context, AppRoutes.inspectionProgress),
            ),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Modülleri Gör', icon: Icons.fact_check_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.inspectionModules)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Fotoğraf Kanıtları', icon: Icons.photo_library_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.photoEvidence)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Rapor Önizle', icon: Icons.description_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.reportPreview)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'İşi Tamamla', icon: Icons.done_all, onPressed: () {}),
        ],
      ),
    );
  }
}
