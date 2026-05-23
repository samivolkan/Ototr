class Formatters {
  const Formatters._();

  static String kilometers(int value) {
    return '${value.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]}.',
    )} km';
  }

  static String time(DateTime value) {
    return '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }

  static String minutes(int value) => '$value dk';
}
