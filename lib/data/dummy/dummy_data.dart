import '../../core/constants/app_constants.dart';
import '../models/audit_log_model.dart';
import '../models/branch_model.dart';
import '../models/customer_model.dart';
import '../models/inspection_checklist_item_model.dart';
import '../models/inspection_module_model.dart';
import '../models/package_plan_model.dart';
import '../models/photo_evidence_model.dart';
import '../models/report_model.dart';
import '../models/user_profile_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';

class DummyData {
  const DummyData._();

  static const Branch branch = Branch(
    id: 'branch-bursa-nilufer',
    name: 'OTOTR Bursa Nilüfer',
    code: AppConstants.demoBranchCode,
    city: 'Bursa',
    district: 'Nilüfer',
    authorizedUser: 'Ahmet Demir',
    technicalResponsible: 'Murat Kaya',
    workingHours: '09:00 - 18:30',
    staffCount: 8,
    hasTseHybDocument: true,
    hasLiabilityInsurance: true,
  );

  static const UserProfile user = UserProfile(
    id: 'user-ahmet-demir',
    fullName: 'Ahmet Demir',
    email: 'ahmet.demir@ototr.test',
    phone: '0555 000 16 16',
    role: UserRole.branchManager,
    branchId: 'branch-bursa-nilufer',
    isActive: true,
  );

  static const UserProfile technician = UserProfile(
    id: 'user-murat-kaya',
    fullName: 'Murat Kaya',
    email: 'murat.kaya@ototr.test',
    phone: '0555 000 16 17',
    role: UserRole.inspectionTechnician,
    branchId: 'branch-bursa-nilufer',
    isActive: true,
  );

  static const Vehicle vehicle = Vehicle(
    plate: '16 ABC 123',
    vin: 'WVWZZZ3CZLE000001',
    brand: 'Volkswagen',
    model: 'Passat 1.5 TSI',
    year: 2020,
    fuelType: 'Benzin',
    transmission: 'Otomatik',
    kilometers: 84500,
    sellerType: 'Bireysel',
    arrivalNote: 'Randevulu kabul. Sol arka kapıda boya beyanı var.',
  );

  static const Customer customer = Customer(
    fullName: 'Mehmet Yılmaz',
    phone: '0532 000 16 16',
    identityNumber: '',
    email: 'mehmet.yilmaz@example.test',
    role: 'Alıcı',
    kvkkConsent: true,
    serviceConsent: true,
  );

  static const List<PackagePlan> packages = [
    PackagePlan(
      id: 'standard',
      name: 'Standart Ekspertiz',
      listPrice: 'Liste fiyatı: 3.900 TL',
      dealerDiscount: 'Bayi iskonto alanı: %0',
      maxDiscountWarning: 'Maksimum iskonto uyarısı: %10',
      netCollection: 'Net tahsilat: 3.900 TL',
      paymentStatus: 'Ödeme durumu: Bekliyor',
      durationMinutes: 45,
      includedModules: ['Kaporta & Boya', 'Motor', 'Mekanik'],
      isRecommended: false,
    ),
    PackagePlan(
      id: 'full',
      name: 'Full Ekspertiz',
      listPrice: 'Liste fiyatı: 5.900 TL',
      dealerDiscount: 'Bayi iskonto alanı: %5',
      maxDiscountWarning: 'Maksimum iskonto uyarısı: %12',
      netCollection: 'Net tahsilat: 5.605 TL',
      paymentStatus: 'Ödeme durumu: Kısmi tahsilat',
      durationMinutes: 75,
      includedModules: ['Kaporta & Boya', 'Motor', 'Mekanik', 'OBD', 'Airbag'],
      isRecommended: false,
    ),
    PackagePlan(
      id: 'premium',
      name: 'Premium Güven Paketi',
      listPrice: 'Liste fiyatı: 7.900 TL',
      dealerDiscount: 'Bayi iskonto alanı: %5',
      maxDiscountWarning: 'Maksimum iskonto uyarısı: %15',
      netCollection: 'Net tahsilat: 7.505 TL',
      paymentStatus: 'Ödeme durumu: Bekliyor',
      durationMinutes: 95,
      includedModules: [
        'Kaporta & Boya',
        'Motor',
        'Mekanik',
        'OBD/Beyin Kontrolü',
        'Airbag',
        'Conta Kaçak Testi',
        'Fren/Süspansiyon',
        'Fotoğraf Kanıtları',
      ],
      isRecommended: true,
    ),
    PackagePlan(
      id: 'fleet',
      name: 'Kurumsal/Filo Paketi',
      listPrice: 'Liste fiyatı: Teklif usulü',
      dealerDiscount: 'Bayi iskonto alanı: Merkez onaylı',
      maxDiscountWarning: 'Maksimum iskonto uyarısı: Bölge müdürü onayı gerekir',
      netCollection: 'Net tahsilat: Sözleşmeye bağlı',
      paymentStatus: 'Ödeme durumu: Kurumsal cari',
      durationMinutes: 80,
      includedModules: ['Filo kabul', 'Standart modüller', 'Kurumsal raporlama'],
      isRecommended: false,
    ),
  ];

  static List<InspectionChecklistItem> checklistFor(String moduleId) {
    switch (moduleId) {
      case 'kaporta':
        return const [
          InspectionChecklistItem(id: 'kaput', title: 'Ön kaput', result: ChecklistResultStatus.normal, note: 'Mikron değeri standart aralıkta.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'sag-on-camurluk', title: 'Sağ ön çamurluk', result: ChecklistResultStatus.attention, note: 'Lokal boya şüphesi.', photoRequired: true, severity: 1),
          InspectionChecklistItem(id: 'sol-on-camurluk', title: 'Sol ön çamurluk', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'sag-on-kapi', title: 'Sağ ön kapı', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'sol-on-kapi', title: 'Sol ön kapı', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'tavan', title: 'Tavan', result: ChecklistResultStatus.normal, note: 'Boya ölçümü normal.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'bagaj', title: 'Bagaj kapağı', result: ChecklistResultStatus.attention, note: 'Sök-tak izi kontrol edilmeli.', photoRequired: true, severity: 1),
          InspectionChecklistItem(id: 'mikron', title: 'Boya mikron değeri', result: ChecklistResultStatus.normal, note: '92-118 mikron aralığı.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'islem', title: 'Değişen/sökülen/boyalı/lokal boyalı/işlemli', result: ChecklistResultStatus.attention, note: 'Sağ ön çamurluk lokal boyalı olabilir.', photoRequired: true, severity: 1),
        ];
      case 'motor':
        return const [
          InspectionChecklistItem(id: 'yag-kacak', title: 'Yağ kaçak kontrolü', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'su-kacak', title: 'Su kaçak kontrolü', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'ses', title: 'Ses kontrolü', result: ChecklistResultStatus.normal, note: 'Rölanti stabil.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'turbo', title: 'Turbo kontrolü', result: ChecklistResultStatus.attention, note: 'Basınç testi önerilir.', photoRequired: false, severity: 1),
          InspectionChecklistItem(id: 'sogutma', title: 'Hararet/soğutma', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'conta', title: 'Conta şüphesi', result: ChecklistResultStatus.normal, note: 'Kaçak belirtisi yok.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'duman', title: 'Duman kontrolü', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
        ];
      case 'mekanik':
        return const [
          InspectionChecklistItem(id: 'sanziman', title: 'Şanzıman', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'debriyaj', title: 'Debriyaj/kavrama', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'direksiyon', title: 'Direksiyon', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'suspansiyon', title: 'Süspansiyon', result: ChecklistResultStatus.attention, note: 'Sağ ön amortisör takip edilmeli.', photoRequired: false, severity: 1),
          InspectionChecklistItem(id: 'fren', title: 'Fren sistemi', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'alt-takim', title: 'Alt takım', result: ChecklistResultStatus.normal, note: '', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'test-surusu', title: 'Test sürüşü notu', result: ChecklistResultStatus.notChecked, note: 'Test sürüşü bekliyor.', photoRequired: false, severity: 0),
        ];
      default:
        return const [
          InspectionChecklistItem(id: 'genel-kontrol', title: 'Genel kontrol', result: ChecklistResultStatus.notChecked, note: 'Teknisyen kontrolü bekleniyor.', photoRequired: false, severity: 0),
          InspectionChecklistItem(id: 'bulgu-notu', title: 'Bulgu notu', result: ChecklistResultStatus.notChecked, note: '', photoRequired: false, severity: 0),
        ];
    }
  }

  static List<InspectionModule> modules = [
    InspectionModule(id: 'kaporta', name: 'Kaporta & Boya', status: ModuleStatus.criticalFinding, technician: technician.fullName, hasEvidence: true, checklistItems: checklistFor('kaporta')),
    InspectionModule(id: 'motor', name: 'Motor', status: ModuleStatus.completed, technician: technician.fullName, hasEvidence: true, checklistItems: checklistFor('motor')),
    InspectionModule(id: 'mekanik', name: 'Mekanik', status: ModuleStatus.inProgress, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('mekanik')),
    InspectionModule(id: 'obd', name: 'OBD/Beyin Kontrolü', status: ModuleStatus.pending, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('obd')),
    InspectionModule(id: 'airbag', name: 'Airbag', status: ModuleStatus.pending, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('airbag')),
    InspectionModule(id: 'conta', name: 'Conta Kaçak Testi', status: ModuleStatus.pending, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('conta')),
    InspectionModule(id: 'fren', name: 'Fren/Süspansiyon', status: ModuleStatus.pending, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('fren')),
    InspectionModule(id: 'donanim', name: 'İç/Dış Donanım', status: ModuleStatus.pending, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('donanim')),
    InspectionModule(id: 'fotograf', name: 'Fotoğraf Kanıtları', status: ModuleStatus.inProgress, technician: technician.fullName, hasEvidence: false, checklistItems: checklistFor('fotograf')),
  ];

  static const List<PhotoEvidence> photos = [
    PhotoEvidence(id: 'front', title: 'Ön görünüm', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'rear', title: 'Arka görünüm', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'right', title: 'Sağ yan', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'left', title: 'Sol yan', isRequired: true, isUploaded: false, uploadQueueLabel: 'Fotoğraf yükleme kuyruğu'),
    PhotoEvidence(id: 'cockpit', title: 'İç kokpit', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'km', title: 'Kilometre göstergesi', isRequired: true, isUploaded: false, uploadQueueLabel: 'Fotoğraf yükleme kuyruğu'),
    PhotoEvidence(id: 'engine', title: 'Motor bölümü', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'vin', title: 'Şasi/VIN etiketi', isRequired: true, isUploaded: false, uploadQueueLabel: 'Senkronizasyon bekliyor'),
    PhotoEvidence(id: 'plate', title: 'Plaka', isRequired: true, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
    PhotoEvidence(id: 'damage', title: 'Hasarlı bölgeler', isRequired: false, isUploaded: false, uploadQueueLabel: 'Opsiyonel'),
    PhotoEvidence(id: 'critical', title: 'Kritik bulgu fotoğrafları', isRequired: false, isUploaded: true, uploadQueueLabel: 'Yüklendi'),
  ];

  static WorkOrder workOrder = WorkOrder(
    id: 'wo-oto-2026-0001',
    number: 'OTO-2026-0001',
    status: WorkOrderStatus.inspectionInProgress,
    vehicle: vehicle,
    customer: customer,
    packagePlan: packages[2],
    modules: modules,
    photoEvidence: photos,
    assignedTechnician: technician.fullName,
    createdAt: DateTime(2026, 5, 24, 10, 15),
    estimatedDurationMinutes: 95,
    notes: 'Premium Güven Paketi kapsamında rapor öncesi fotoğraf eksikleri tamamlanmalı.',
    auditLogs: [
      AuditLog(id: 'a1', userName: 'Ahmet Demir', action: 'Araç kabul edildi', createdAt: DateTime(2026, 5, 24, 10, 15)),
      AuditLog(id: 'a2', userName: 'Murat Kaya', action: 'Ekspertiz başlatıldı', createdAt: DateTime(2026, 5, 24, 10, 28)),
    ],
  );

  static List<WorkOrder> workOrders = [
    workOrder,
    WorkOrder(
      id: 'wo-draft',
      number: 'OTO-2026-0002',
      status: WorkOrderStatus.draft,
      vehicle: vehicle,
      customer: customer,
      packagePlan: packages[0],
      modules: modules.take(3).toList(),
      photoEvidence: photos,
      assignedTechnician: 'Atanmadı',
      createdAt: DateTime(2026, 5, 24, 11, 5),
      estimatedDurationMinutes: 45,
      notes: 'Taslak kaydedildi. Müşteri onayı bekleniyor.',
      auditLogs: const [],
    ),
    WorkOrder(
      id: 'wo-report',
      number: 'OTO-2026-0003',
      status: WorkOrderStatus.reportPreparing,
      vehicle: vehicle,
      customer: customer,
      packagePlan: packages[1],
      modules: modules,
      photoEvidence: photos.map((photo) => PhotoEvidence(id: photo.id, title: photo.title, isRequired: photo.isRequired, isUploaded: true, uploadQueueLabel: 'Yüklendi')).toList(),
      assignedTechnician: technician.fullName,
      createdAt: DateTime(2026, 5, 24, 9, 35),
      estimatedDurationMinutes: 75,
      notes: 'Rapor hazırlanıyor.',
      auditLogs: const [],
    ),
  ];

  static Report report = Report(
    id: 'report-oto-2026-0001',
    workOrderNumber: 'OTO-2026-0001',
    revision: 'Revizyon geçmişi: v0.1 ön izleme',
    riskSummary: 'Orta risk: kaporta lokal boya şüphesi ve süspansiyon takip önerisi.',
    technicianNote: 'Fotoğraf eksikleri tamamlandığında şube onayına gönderilebilir.',
    branchApprovalStatus: 'Şube onayı: Bekliyor',
    qrVerificationPlaceholder: 'QR doğrulama placeholder',
    createdAt: DateTime(2026, 5, 24, 12, 10),
  );
}
