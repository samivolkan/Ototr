class SupabaseConfig {
  const SupabaseConfig({
    required this.url,
    required this.anonKey,
    required this.testEmail,
    required this.testPassword,
  });

  static const fromEnvironment = SupabaseConfig(
    url: String.fromEnvironment('OTOTR_SUPABASE_URL'),
    anonKey: String.fromEnvironment('OTOTR_SUPABASE_ANON_KEY'),
    testEmail: String.fromEnvironment('OTOTR_SUPABASE_TEST_EMAIL'),
    testPassword: String.fromEnvironment('OTOTR_SUPABASE_TEST_PASSWORD'),
  );

  final String url;
  final String anonKey;
  final String testEmail;
  final String testPassword;

  bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;

  bool get hasTestLogin => testEmail.isNotEmpty && testPassword.isNotEmpty;
}
