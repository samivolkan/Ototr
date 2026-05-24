import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../core/widgets/ototr_text_field.dart';
import '../../data/models/customer_model.dart';
import '../../data/models/package_plan_model.dart';
import '../../data/models/vehicle_model.dart';
import '../../data/models/work_order_model.dart';
import '../../data/repositories/work_order_local_repository.dart';
import '../../data/services/work_order_task_factory.dart';

class NewWorkOrderScreen extends StatefulWidget {
  const NewWorkOrderScreen({super.key});

  @override
  State<NewWorkOrderScreen> createState() => _NewWorkOrderScreenState();
}

class _NewWorkOrderScreenState extends State<NewWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customerNameController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _plateController = TextEditingController();
  final _vinController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController();
  final _kilometersController = TextEditingController();
  final _notesController = TextEditingController();
  PackageType _packageType = PackageType.standard;

  @override
  void dispose() {
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _plateController.dispose();
    _vinController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _kilometersController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final previewTasks = createTasksFromPackage(_packageType);
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Yeni Is Emri'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSizes.lg),
          children: [
            const OtotrSectionTitle(
              title: 'Musteri ve arac',
              subtitle:
                  'Temel bilgiler eksikse is emri acilir ama eksik veri sayisina yansir.',
            ),
            OtotrCard(
              child: Column(
                children: [
                  OtotrTextField(
                    label: 'Musteri adi',
                    controller: _customerNameController,
                    validator: _required,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Musteri telefonu',
                    controller: _customerPhoneController,
                    keyboardType: TextInputType.phone,
                    validator: _required,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Plaka',
                    controller: _plateController,
                    validator: _required,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Sasi / VIN',
                    controller: _vinController,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Marka',
                    controller: _brandController,
                    validator: _required,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Model',
                    controller: _modelController,
                    validator: _required,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Yil',
                    controller: _yearController,
                    keyboardType: TextInputType.number,
                    validator: _yearValidator,
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Kilometre',
                    controller: _kilometersController,
                    keyboardType: TextInputType.number,
                  ),
                ],
              ),
            ),
            const OtotrSectionTitle(title: 'Paket'),
            OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<PackageType>(
                    initialValue: _packageType,
                    decoration: const InputDecoration(labelText: 'Paket tipi'),
                    items: [
                      for (final type in PackageType.values)
                        DropdownMenuItem(
                          value: type,
                          child: Text(type.label),
                        ),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _packageType = value);
                    },
                  ),
                  const SizedBox(height: AppSizes.md),
                  OtotrTextField(
                    label: 'Is emri notu',
                    controller: _notesController,
                    maxLines: 3,
                  ),
                ],
              ),
            ),
            OtotrSectionTitle(
              title: 'Gorev onizleme',
              subtitle:
                  '${previewTasks.length} zorunlu gorev otomatik olusacak.',
            ),
            OtotrCard(
              child: Column(
                children: [
                  for (final task in previewTasks)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.checklist_outlined),
                      title: Text(task.title),
                      subtitle: Text(task.type.code),
                      trailing: const OtotrStatusBadge(label: 'Zorunlu'),
                    ),
                ],
              ),
            ),
            OtotrPrimaryButton(
              label: 'Is Emri Olustur',
              icon: Icons.add_circle_outline,
              onPressed: _createWorkOrder,
            ),
          ],
        ),
      ),
    );
  }

  String? _required(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Zorunlu alan';
    }
    return null;
  }

  String? _yearValidator(String? value) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    final year = int.tryParse(value!.trim());
    if (year == null || year < 1950 || year > DateTime.now().year + 1) {
      return 'Gecerli yil girin';
    }
    return null;
  }

  void _createWorkOrder() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final year = int.parse(_yearController.text.trim());
    final kilometers = int.tryParse(_kilometersController.text.trim()) ?? 0;
    final order = WorkOrderLocalRepository.instance.create(
      customer: Customer(
        fullName: _customerNameController.text.trim(),
        phone: _customerPhoneController.text.trim(),
        identityNumber: '',
        email: '',
        role: 'Musteri',
        kvkkConsent: true,
        serviceConsent: true,
      ),
      vehicle: Vehicle(
        plate: _plateController.text.trim().toUpperCase(),
        vin: _vinController.text.trim().toUpperCase(),
        brand: _brandController.text.trim(),
        model: _modelController.text.trim(),
        year: year,
        fuelType: '',
        transmission: '',
        kilometers: kilometers,
        sellerType: '',
        arrivalNote: '',
      ),
      packageType: _packageType,
      notes: _notesController.text,
    );
    Navigator.pushReplacementNamed(
      context,
      AppRoutes.workOrderDetail,
      arguments: order.id,
    );
  }
}
