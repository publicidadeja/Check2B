// lib/services/user_manager.dart
import 'package:shared_preferences/shared_preferences.dart';

/// Uma classe auxiliar para gerenciar e persistir
/// o ID do último usuário logado no dispositivo.
class UserManager {
  static const String _lastUserIdKey = 'last_user_id';
  static String? _cachedUserId;

  /// Salva o ID do usuário no armazenamento local e o mantém em cache.
  Future<void> saveUserId(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastUserIdKey, userId);
    _cachedUserId = userId;
    print('[UserManager] ID do usuário salvo: $userId');
  }

  /// Obtém o último ID de usuário salvo do armazenamento local.
  Future<String?> getLastUserId() async {
    if (_cachedUserId != null) return _cachedUserId;
    
    final prefs = await SharedPreferences.getInstance();
    _cachedUserId = prefs.getString(_lastUserIdKey);
    return _cachedUserId;
  }

  /// Limpa o ID do usuário salvo do armazenamento local e do cache.
  Future<void> clearUserId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastUserIdKey);
    _cachedUserId = null;
    print('[UserManager] ID do usuário limpo.');
  }
}
