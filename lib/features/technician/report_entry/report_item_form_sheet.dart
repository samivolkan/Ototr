import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/report_template_model.dart';
import '../../../data/models/user_profile_model.dart';
import '../../../data/repositories/app_repositories.dart';
import '../../../data/services/photo_upload_service.dart';
import '../../../data/services/work_order_report_service.dart';

class ReportItemFormSheet extends StatefulWidget {
  const ReportItemFormSheet({
    super.key,
    required this.workOrderId,
    required this.template,
    required this.group,
    required this.item,
    required this.answer,
    required this.user,
    required this.service,
  });

  final String workOrderId;
  final ReportTemplate template;
  final ReportTemplateGroup group;
  final ReportTemplateItem item;
  final WorkOrderReportAnswer? answer;
  final UserProfile user;
  final WorkOrderReportService service;

  @override
  State<ReportItemFormSheet> createState() => _ReportItemFormSheetState();
}

class _ReportItemFormSheetState extends State<ReportItemFormSheet> {
  late final TextEditingController _descriptionController;
  late final Map<String, TextEditingController> _inputControllers;
  late List<String> _selectedOptionIds;
  late List<String> _imageUrls;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedOptionIds = [...?widget.answer?.selectedOptionIds];
    _imageUrls = [...?widget.answer?.imageUrls];
    _descriptionController = TextEditingController(
      text: widget.answer?.description ?? '',
    );
    _inputControllers = {
      for (final input in widget.item.inputFields)
        input.id: TextEditingController(
          text: widget.answer?.inputValues[input.id] ?? input.value,
        ),
    };
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    for (final controller in _inputControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + 16),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.grayBorder,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.item.modalTitle.isEmpty
                  ? widget.item.title
                  : widget.item.modalTitle,
              style: const TextStyle(
                color: AppColors.navy,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${widget.group.title} · Nokta ${widget.item.noktaId}',
              style: const TextStyle(
                color: AppColors.grayText,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            if (widget.item.options.isNotEmpty) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in widget.item.options)
                    _OptionChip(
                      option: option,
                      selected: _selectedOptionIds.contains(option.id),
                      onTap: () => _toggleOption(option),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            for (final input in widget.item.inputFields) ...[
              TextField(
                controller: _inputControllers[input.id],
                keyboardType: _keyboardType(input.type),
                decoration: InputDecoration(
                  labelText: input.label.isEmpty ? input.name : input.label,
                  hintText: input.placeholder,
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (widget.item.hasDescription) ...[
              TextField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Açıklama',
                  hintText: 'Gerekli notu yazın',
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (widget.item.hasImages) ...[
              OutlinedButton.icon(
                onPressed: _saving ? null : _addImage,
                icon: const Icon(Icons.photo_camera),
                label: Text(
                  _imageUrls.isEmpty
                      ? 'Fotoğraf Kanıtı Ekle'
                      : '${_imageUrls.length} fotoğraf eklendi',
                ),
              ),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _saving ? null : () => _save(complete: false),
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Kaydet'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _saving ? null : () => _save(complete: true),
                    icon: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check),
                    label: const Text('Tamamlandı'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  TextInputType _keyboardType(String type) {
    switch (type.toLowerCase()) {
      case 'number':
        return const TextInputType.numberWithOptions(decimal: true);
      case 'year':
        return TextInputType.number;
      case 'date':
        return TextInputType.datetime;
      default:
        return TextInputType.text;
    }
  }

  void _toggleOption(ReportTemplateOption option) {
    if (option.disabled) {
      return;
    }
    setState(() {
      if (widget.item.allowsMultipleOptions) {
        if (_selectedOptionIds.contains(option.id)) {
          _selectedOptionIds.remove(option.id);
        } else {
          _selectedOptionIds.add(option.id);
        }
      } else {
        _selectedOptionIds = [option.id];
      }
    });
  }

  Future<void> _addImage() async {
    if (widget.item.maxImages > 0 &&
        _imageUrls.length >= widget.item.maxImages) {
      return;
    }

    final picked = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (picked == null) {
      return;
    }

    setState(() => _imageUrls.add(picked.path));
    unawaited(_uploadImageInBackground(picked.path));
  }

  Future<void> _uploadImageInBackground(String localPath) async {
    final supabaseClient = _activeSupabaseClient();
    if (supabaseClient == null) {
      return;
    }
    final uploader = PhotoUploadService(client: supabaseClient);
    final result = await uploader.uploadReportPhoto(
      workOrderId: widget.workOrderId,
      itemId: widget.item.id,
      localPath: localPath,
    );
    if (!mounted || !result.uploaded) {
      return;
    }
    setState(() {
      final index = _imageUrls.indexOf(localPath);
      if (index >= 0) {
        _imageUrls[index] = result.reference;
      }
    });
  }

  SupabaseClient? _activeSupabaseClient() {
    if (AppRepositories.instance.remoteWorkOrders == null) {
      return null;
    }
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  Future<void> _save({required bool complete}) async {
    setState(() => _saving = true);
    try {
      await widget.service.saveItemAnswer(
        workOrderId: widget.workOrderId,
        template: widget.template,
        group: widget.group,
        item: widget.item,
        user: widget.user,
        selectedOptionIds: _selectedOptionIds,
        inputValues: {
          for (final entry in _inputControllers.entries)
            entry.key: entry.value.text,
        },
        description: _descriptionController.text,
        imageUrls: _imageUrls,
        complete: complete,
      );
      if (!mounted) {
        return;
      }
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final ReportTemplateOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _tone(option.colorType);
    return ChoiceChip(
      label: Text(
        option.label,
        style: TextStyle(
          color: selected ? color : AppColors.darkText,
          fontWeight: FontWeight.w900,
        ),
      ),
      selected: selected,
      selectedColor: color.withAlpha(36),
      backgroundColor: AppColors.white,
      side: BorderSide(color: selected ? color : AppColors.grayBorder),
      onSelected: (_) => onTap(),
    );
  }

  Color _tone(ReportOptionColorType type) {
    switch (type) {
      case ReportOptionColorType.green:
        return AppColors.success;
      case ReportOptionColorType.red:
        return AppColors.red;
      case ReportOptionColorType.orange:
        return AppColors.warning;
      case ReportOptionColorType.blue:
        return AppColors.info;
      case ReportOptionColorType.gray:
      case ReportOptionColorType.neutral:
        return AppColors.grayText;
    }
  }
}
