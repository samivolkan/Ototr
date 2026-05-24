import 'package:flutter/material.dart';

import 'app.dart';
import 'data/repositories/app_repositories.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppRepositories.instance.configureSupabase();
  runApp(const OtotrApp());
}
