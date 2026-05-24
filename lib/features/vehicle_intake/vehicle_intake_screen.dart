import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_text_field.dart';
import '../../data/dummy/dummy_data.dart';

class VehicleIntakeScreen extends StatefulWidget {
  const VehicleIntakeScreen({super.key});

  @override
  State<VehicleIntakeScreen> createState() => _VehicleIntakeScreenState();
}

class _VehicleIntakeScreenState extends State<VehicleIntakeScreen> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    const vehicle = DummyData.vehicle;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Araç Kabul'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSizes.lg),
          children: [
            OtotrTextField(
                label: 'Plaka',
                initialValue: vehicle.plate,
                validator: Validators.plate),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Şasi / VIN',
                initialValue: vehicle.vin,
                validator: Validators.vinWarning),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(label: 'Marka', initialValue: vehicle.brand),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(label: 'Model', initialValue: vehicle.model),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Yıl',
                initialValue: '${vehicle.year}',
                keyboardType: TextInputType.number,
                validator: (v) => Validators.numeric(v, fieldName: 'Yıl')),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(label: 'Yakıt Tipi', initialValue: vehicle.fuelType),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Şanzıman', initialValue: vehicle.transmission),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Kilometre',
                initialValue: '${vehicle.kilometers}',
                keyboardType: TextInputType.number,
                validator: (v) =>
                    Validators.numeric(v, fieldName: 'Kilometre')),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Satıcı Tipi', initialValue: vehicle.sellerType),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Geliş Notu',
                initialValue: vehicle.arrivalNote,
                maxLines: 3),
            const SizedBox(height: AppSizes.lg),
            OtotrSecondaryButton(
              label: 'Taslak Kaydet',
              icon: Icons.save_outlined,
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content:
                          Text('Taslak kaydedildi. Senkronizasyon bekliyor.'))),
            ),
            const SizedBox(height: AppSizes.sm),
            OtotrPrimaryButton(
              label: 'Müşteri Bilgilerine Geç',
              onPressed: () {
                if (_formKey.currentState!.validate()) {
                  Navigator.pushNamed(context, AppRoutes.customerInfo);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
