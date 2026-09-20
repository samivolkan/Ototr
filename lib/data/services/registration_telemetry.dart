class RegistrationTelemetry {
  const RegistrationTelemetry();

  void track(
    String eventName, {
    Map<String, Object?> metadata = const {},
  }) {
    final safeMetadata = Map<String, Object?>.from(metadata)
      ..removeWhere((key, _) => _piiKeys.contains(key));
    assert(() {
      // Local debug only. Do not log VIN, plate, engine number or personal data.
      // ignore: avoid_print
      print('registration_event=$eventName metadata=$safeMetadata');
      return true;
    }());
  }

  static const _piiKeys = {
    'vin',
    'plate',
    'engine_number',
    'tckn',
    'address',
    'phone',
  };
}
