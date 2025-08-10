// lib/services/user_manager.dart

import 'package:shared_preferences/shared_preferences.dart';

/// Gerencia o estado local do último usuário que teve seu token FCM registrado.
/// Isso evita o envio repetido do mesmo token para o backend na mesma sessão.
class UserManager {
  static const String _lastRegisteredTokenUserIdKey = 'last_fcm_registered_user_id';

  /// Salva o ID do usuário que acabou de ter seu token FCM registrado.
  Future<void> saveUserId(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastRegisteredTokenUserIdKey, userId);
    print('✅ ID do usuário $userId salvo como o último a ter o token registrado.');
  }

  /// Obtém o ID do último usuário que teve seu token registrado.
  Future<String?> getLastUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_lastRegisteredTokenUserIdKey);
  }

  /// Limpa o ID do usuário salvo, permitindo que um novo registro de token ocorra no próximo login.
  Future<void> clearUserId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastRegisteredTokenUserIdKey);
    print('🗑️ ID do último usuário registrado foi limpo.');
  }
}
