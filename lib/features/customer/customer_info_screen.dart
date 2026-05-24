import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_text_field.dart';
import '../../data/dummy/dummy_data.dart';

class CustomerInfoScreen extends StatefulWidget {
  const CustomerInfoScreen({super.key});

  @override
  State<CustomerInfoScreen> createState() => _CustomerInfoScreenState();
}

class _CustomerInfoScreenState extends State<CustomerInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  bool kvkk = true;
  bool service = true;

  @override
  Widget build(BuildContext context) {
    const customer = DummyData.customer;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Müşteri Kabul'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSizes.lg),
          children: [
            OtotrTextField(
                label: 'Ad Soyad / Ünvan',
                initialValue: customer.fullName,
                validator: (v) =>
                    Validators.requiredField(v, fieldName: 'Ad Soyad')),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'Telefon',
                initialValue: customer.phone,
                keyboardType: TextInputType.phone,
                validator: Validators.phone),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'TCKN / VKN (opsiyonel)',
                initialValue: customer.identityNumber),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(
                label: 'E-posta (opsiyonel)',
                initialValue: customer.email,
                keyboardType: TextInputType.emailAddress),
            const SizedBox(height: AppSizes.md),
            OtotrTextField(label: 'Müşteri Rolü', initialValue: customer.role),
            CheckboxListTile(
              value: kvkk,
              onChanged: (value) => setState(() => kvkk = value ?? false),
              title: const Text('KVKK aydınlatma ve açık rıza alındı'),
            ),
            CheckboxListTile(
              value: service,
              onChanged: (value) => setState(() => service = value ?? false),
              title: const Text('Hizmet koşulları ve ekspertiz onayı alındı'),
            ),
            const SizedBox(height: AppSizes.lg),
            Row(
              children: [
                Expanded(
                    child: OtotrSecondaryButton(
                        label: 'Geri',
                        onPressed: () => Navigator.pop(context))),
                const SizedBox(width: AppSizes.sm),
                Expanded(
                    child: OtotrSecondaryButton(
                        label: 'Taslak Kaydet',
                        icon: Icons.save_outlined,
                        onPressed: () {})),
              ],
            ),
            const SizedBox(height: AppSizes.sm),
            OtotrPrimaryButton(
              label: 'Paket Seçimine Geç',
              onPressed: () {
                if (_formKey.currentState!.validate() && kvkk && service) {
                  Navigator.pushNamed(context, AppRoutes.packageSelection);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
