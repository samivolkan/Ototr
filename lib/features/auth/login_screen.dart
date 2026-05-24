import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/constants/app_strings.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSizes.xl),
          children: [
            const SizedBox(height: 42),
            const Text(
              AppConstants.brandName,
              style: TextStyle(
                color: AppColors.white,
                fontSize: 40,
                fontWeight: FontWeight.w900,
              ),
            ),
            const Text(
              AppConstants.brandPositioning,
              style: TextStyle(color: AppColors.white, fontSize: 16),
            ),
            const SizedBox(height: 42),
            Container(
              padding: const EdgeInsets.all(AppSizes.lg),
              decoration: BoxDecoration(
                color: AppColors.grayBg,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Usta Operasyon Girişi', style: AppTextStyles.title),
                    const SizedBox(height: AppSizes.md),
                    const OtotrTextField(label: 'E-posta / Telefon', initialValue: 'ahmet.demir@ototr.test'),
                    const SizedBox(height: AppSizes.md),
                    const OtotrTextField(label: 'Şifre', initialValue: 'demo123', obscureText: true),
                    const SizedBox(height: AppSizes.md),
                    const OtotrTextField(label: 'Şube Kodu', initialValue: AppConstants.demoBranchCode),
                    const SizedBox(height: AppSizes.lg),
                    OtotrPrimaryButton(
                      label: AppStrings.demoLogin,
                      icon: Icons.login,
                      onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.dashboard),
                    ),
                    const SizedBox(height: AppSizes.sm),
                    OtotrSecondaryButton(
                      label: 'Şifremi Unuttum',
                      icon: Icons.lock_reset,
                      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Şifre sıfırlama Firebase Auth ile eklenecek.')),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
