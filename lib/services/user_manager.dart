import 'package:shared_preferences/shared_preferences.dart';

class UserManager {
  static const String _userIdKey = 'last_logged_in_user_id';

  Future<void> saveUserId(String userId) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userIdKey, userId);
    print('👤 UserID salvo localmente: $userId');
  }

  Future<String?> getLastUserId() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userIdKey);
  }

  Future<void> clearUserId() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userIdKey);
    print('🗑️ UserID local removido.');
  }
}
