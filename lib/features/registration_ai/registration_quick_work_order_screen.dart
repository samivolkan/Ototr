import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../data/models/package_plan_model.dart';
import '../../data/models/registration_scan_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/services/registration_extraction_service.dart';
import '../../data/services/registration_scanner_service.dart';
import '../../data/services/registration_telemetry.dart';
import '../../data/services/work_order_task_factory.dart';

class RegistrationQuickWorkOrderScreen extends StatefulWidget {
  const RegistrationQuickWorkOrderScreen({
    super.key,
    RegistrationScannerService? scanner,
    RegistrationExtractionService? extraction,
    RegistrationTelemetry? telemetry,
  })  : scanner = scanner ?? const _DefaultRegistrationScannerService(),
        extraction = extraction ?? const RegistrationExtractionService(),
        telemetry = telemetry ?? const RegistrationTelemetry();

  final RegistrationScannerService scanner;
  final RegistrationExtractionService extraction;
  final RegistrationTelemetry telemetry;

  @override
  State<RegistrationQuickWorkOrderScreen> createState() =>
      _RegistrationQuickWorkOrderScreenState();
}

class _RegistrationQuickWorkOrderScreenState
    extends State<RegistrationQuickWorkOrderScreen> {
  RegistrationReviewSession? _session;
  PackageType _packageType = PackageType.hizliKontrol;
  bool _isScanning = false;
  bool _isSaving = false;
  String? _message;
  late String _idempotencyKey;

  @override
  void initState() {
    super.initState();
    _idempotencyKey = _newIdempotencyKey();
    _startScan();
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    final tasks = createTasksFromPackage(_packageType);
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Ruhsat Bilgilerini Kontrol Et'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          if (_message != null) ...[
            OtotrAlertCard(title: 'Bilgi', message: _message!),
            const SizedBox(height: AppSizes.md),
          ],
          if (_isScanning)
            const OtotrCard(
              child: ListTile(
                leading: CircularProgressIndicator(),
                title: Text('Ruhsat taranıyor ve OCR yapılıyor'),
                subtitle:
                    Text('Belge netliği düşükse tekrar çekmeniz istenir.'),
              ),
            )
          else if (session == null)
            OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Ruhsat taraması başlatılamadı.'),
                  const SizedBox(height: AppSizes.md),
                  OtotrPrimaryButton(
                    label: 'Tekrar Tara',
                    icon: Icons.document_scanner_outlined,
                    onPressed: _startScan,
                  ),
                  OtotrSecondaryButton(
                    label: 'Manuel İş Emri',
                    icon: Icons.edit_note_outlined,
                    onPressed: () => Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.newWorkOrder,
                    ),
                  ),
                ],
              ),
            )
          else ...[
            if (session.aiUnavailable)
              const OtotrAlertCard(
                title: 'Cloud AI kullanılamıyor',
                message:
                    'Local OCR ile devam edebilirsiniz. Kritik alanları ruhsat görüntüsünden onaylayın.',
              ),
            if (session.needsRescan)
              const OtotrAlertCard(
                title: 'Ruhsat net okunamadı',
                message: 'Lütfen belgeyi daha aydınlık ortamda yeniden çekin.',
              ),
            const OtotrSectionTitle(title: 'Kritik Alanlar'),
            for (var i = 0; i < session.fields.length; i++)
              _FieldReviewCard(
                field: session.fields[i],
                onConfirm: () => _updateField(
                  i,
                  session.fields[i].copyWith(
                    humanConfirmed: true,
                    state: session.fields[i].state ==
                            RegistrationFieldState.invalid
                        ? RegistrationFieldState.reviewRequired
                        : session.fields[i].state,
                  ),
                ),
                onEdit: () => _editField(i),
              ),
            const OtotrSectionTitle(title: 'Paket Seçimi'),
            OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<PackageType>(
                    initialValue: _packageType,
                    decoration: const InputDecoration(labelText: 'Paket'),
                    items: [
                      for (final type in PackageType.values)
                        DropdownMenuItem(value: type, child: Text(type.label)),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      widget.telemetry.track('quick_package_selected',
                          metadata: {'package_type': value.code});
                      setState(() => _packageType = value);
                    },
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Text('Tahmini süre: ${_packageType.durationMinutes} dk'),
                  const SizedBox(height: AppSizes.sm),
                  for (final task in tasks.take(6))
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.check_circle_outline),
                      title: Text(task.title),
                    ),
                ],
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: OtotrSecondaryButton(
                    label: 'Yeniden Tara',
                    icon: Icons.refresh,
                    onPressed: _isSaving ? null : _startScan,
                  ),
                ),
                const SizedBox(width: AppSizes.md),
                Expanded(
                  child: OtotrPrimaryButton(
                    label: _isSaving ? 'Gönderiliyor' : 'Kısa İş Emri Oluştur',
                    icon: Icons.send_outlined,
                    backgroundColor:
                        session.canCreateQuickOrder ? AppColors.success : null,
                    onPressed: !_isSaving && session.canCreateQuickOrder
                        ? _createQuickOrder
                        : null,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _startScan() async {
    widget.telemetry.track('registration_scan_started');
    setState(() {
      _isScanning = true;
      _message = null;
      _session = null;
    });
    final scan = await widget.scanner.scanRegistration();
    if (!mounted) return;
    if (scan.cancelled) {
      widget.telemetry.track('registration_scan_rescan');
      setState(() {
        _isScanning = false;
        _message = 'Tarama iptal edildi. Manuel akışa geçebilirsiniz.';
      });
      return;
    }
    if (scan.errorMessage != null) {
      setState(() {
        _isScanning = false;
        _message = scan.errorMessage;
      });
      return;
    }
    widget.telemetry.track('registration_ocr_completed',
        metadata: {'evidence_count': scan.evidence.length});
    final session = await widget.extraction.createReviewSession(scan);
    if (!mounted) return;
    widget.telemetry.track('registration_ai_completed',
        metadata: {'document_type': session.documentType.code});
    setState(() {
      _session = session;
      _isScanning = false;
      _idempotencyKey = _newIdempotencyKey();
    });
  }

  void _updateField(int index, RegistrationFieldReview field) {
    final session = _session;
    if (session == null) return;
    final fields = [...session.fields]..[index] = field;
    setState(() {
      _session = RegistrationReviewSession(
        id: session.id,
        documentType: session.documentType,
        imagePaths: session.imagePaths,
        evidence: session.evidence,
        fields: fields,
        needsRescan: session.needsRescan,
        aiUnavailable: session.aiUnavailable,
      );
    });
  }

  Future<void> _editField(int index) async {
    final field = _session!.fields[index];
    final controller = TextEditingController(text: field.value ?? '');
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(field.label),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null) return;
    widget.telemetry.track('registration_field_corrected',
        metadata: {'field_key': field.key, 'error_code': 'UNKNOWN'});
    _updateField(
      index,
      field.copyWith(
        value: value,
        humanConfirmed: true,
        state: value.isEmpty
            ? RegistrationFieldState.notRead
            : RegistrationFieldState.reviewRequired,
      ),
    );
  }

  Future<void> _createQuickOrder() async {
    final session = _session;
    if (session == null) return;
    setState(() => _isSaving = true);
    try {
      final order = await AppRepositories.instance.branchWorkOrders
          .createQuickFromRegistration(
        QuickRegistrationWorkOrderInput(
          registrationScanId: session.id,
          idempotencyKey: _idempotencyKey,
          vehicle: session.toVehicle(),
          packageType: _packageType,
          notes: 'Ruhsat AI hızlı iş emri',
        ),
      );
      widget.telemetry.track('quick_work_order_created',
          metadata: {'document_type': session.documentType.code});
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.workOrderDetail,
        (_) => false,
        arguments: order.id,
      );
    } catch (error) {
      widget.telemetry.track('quick_work_order_failed',
          metadata: {'error_code': 'BACKEND_MAPPING_ERROR'});
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _message = 'Kısa iş emri oluşturulamadı: $error';
      });
    }
  }

  String _newIdempotencyKey() {
    final random = Random().nextInt(1 << 32).toRadixString(16);
    return '${DateTime.now().microsecondsSinceEpoch}-$random';
  }
}

class _FieldReviewCard extends StatelessWidget {
  const _FieldReviewCard({
    required this.field,
    required this.onConfirm,
    required this.onEdit,
  });

  final RegistrationFieldReview field;
  final VoidCallback onConfirm;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final warning = field.state == RegistrationFieldState.reviewRequired ||
        field.state == RegistrationFieldState.invalid ||
        field.state == RegistrationFieldState.notRead;
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(field.label,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              Icon(
                field.humanConfirmed ? Icons.check_circle : Icons.info_outline,
                color: field.humanConfirmed ? AppColors.success : null,
              ),
            ],
          ),
          const SizedBox(height: AppSizes.xs),
          Text(
            field.value?.isNotEmpty == true ? field.value! : 'Okunamadı',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          if (field.ocrValue != null || field.aiValue != null) ...[
            const SizedBox(height: AppSizes.xs),
            Text('OCR: ${field.ocrValue ?? '-'}'),
            Text('AI: ${field.aiValue ?? '-'}'),
          ],
          if (warning)
            Padding(
              padding: const EdgeInsets.only(top: AppSizes.xs),
              child: Text(
                field.state.code,
                style: const TextStyle(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          const SizedBox(height: AppSizes.sm),
          Row(
            children: [
              Expanded(
                child: OtotrSecondaryButton(
                  label: 'Düzenle',
                  icon: Icons.edit_outlined,
                  onPressed: onEdit,
                ),
              ),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: OtotrPrimaryButton(
                  label: 'Ruhsatta Aynı',
                  icon: Icons.check,
                  onPressed: onConfirm,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DefaultRegistrationScannerService extends RegistrationScannerService {
  const _DefaultRegistrationScannerService();
}
