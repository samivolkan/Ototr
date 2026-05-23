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
}
