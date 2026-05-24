class Customer {
  const Customer({
    required this.fullName,
    required this.phone,
    required this.identityNumber,
    required this.email,
    required this.role,
    required this.kvkkConsent,
    required this.serviceConsent,
  });

  final String fullName;
  final String phone;
  final String identityNumber;
  final String email;
  final String role;
  final bool kvkkConsent;
  final bool serviceConsent;

  Map<String, Object?> toJson() {
    return {
      'fullName': fullName,
      'phone': phone,
      'identityNumber': identityNumber,
      'email': email,
      'role': role,
      'kvkkConsent': kvkkConsent,
      'serviceConsent': serviceConsent,
    };
  }

  factory Customer.fromJson(Map<String, Object?> json) {
    return Customer(
      fullName: json['fullName'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      identityNumber: json['identityNumber'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'Musteri',
      kvkkConsent: json['kvkkConsent'] as bool? ?? false,
      serviceConsent: json['serviceConsent'] as bool? ?? false,
    );
  }
}
