import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';

class PhotoEvidenceScreen extends StatelessWidget {
  const PhotoEvidenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const photos = DummyData.photos;
    final completed = Validators.requiredPhotosCompleted(photos);
    final missingCount =
        photos.where((photo) => photo.isRequired && !photo.isUploaded).length;

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Fotoğraf Kanıtları'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          if (!completed)
            OtotrAlertCard(
              title: 'Zorunlu fotoğraf eksik',
              message:
                  '$missingCount zorunlu fotoğraf tamamlanmalı. İnternet yoksa yükleme kuyruğunda bekletilecek.',
            )
          else
            const OtotrAlertCard(
              title: 'Fotoğraf kanıtları tamam',
              message: 'Tüm zorunlu fotoğraflar yüklendi ve rapora hazır.',
              icon: Icons.check_circle_outline,
            ),
          const OtotrSectionTitle(title: 'Kanıt Listesi'),
          ...photos.map(
            (photo) => OtotrCard(
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: photo.isUploaded
                          ? const Color(0xFFEAF7F0)
                          : AppColors.grayBg,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                        photo.isUploaded
                            ? Icons.image
                            : Icons.add_a_photo_outlined,
                        color: photo.isUploaded
                            ? AppColors.success
                            : AppColors.grayText),
                  ),
                  const SizedBox(width: AppSizes.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(photo.title,
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        Text(photo.isRequired ? 'Zorunlu' : 'Opsiyonel'),
                        Text(photo.uploadQueueLabel),
                      ],
                    ),
                  ),
                  OtotrStatusBadge(
                    label: photo.isUploaded ? 'Yüklendi' : 'Eksik',
                    tone: photo.isUploaded
                        ? OtotrBadgeTone.success
                        : OtotrBadgeTone.warning,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
