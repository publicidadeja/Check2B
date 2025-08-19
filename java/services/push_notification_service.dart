import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:webview_flutter/webview_flutter.dart'; // Importar WebViewController

// --- INÍCIO DO HANDLER DE BACKGROUND ---
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(); // Garante que o Firebase está inicializado
  print("--- 🔔 [BACKGROUND HANDLER] Mensagem Recebida! ---");
  print("🔔 ID da Mensagem: ${message.messageId}");
  if (message.notification != null) {
    print("🔔 Notificação: Título='${message.notification?.title}', Corpo='${message.notification?.body}'");
  }
}
// --- FIM DO HANDLER DE BACKGROUND ---

class PushNotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  String? _cachedToken;
  WebViewController? _webViewController;

  String? get currentToken => _cachedToken;

  Future<void> initialize() async {
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ Permissão de notificação concedida pelo usuário.');
      
      // Obtém o token e o armazena em cache
      _cachedToken = await _firebaseMessaging.getToken();
      print("🔑 FCM Token Obtido (e cacheado pelo SDK): $_cachedToken");

      // Tenta injetar o cookie imediatamente, caso a WebView já esteja pronta
      if (_webViewController != null) {
        setCookieOnWebView(_webViewController!);
      }

      // Listener para quando o token for atualizado
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        print("🔄 FCM Token ATUALIZADO (Refresh): $newToken");
        _cachedToken = newToken;
        // Se a WebView já existe, injeta o novo token
        if (_webViewController != null) {
          setCookieOnWebView(_webViewController!);
        }
      });

      // Listener para mensagens em primeiro plano
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print("--- 📱 [FOREGROUND] Mensagem Recebida! ---");
        if (message.notification != null) {
          print("📱 Notificação: Título='${message.notification?.title}', Corpo='${message.notification?.body}'");
        }
      });

      // Listener para quando o usuário toca na notificação
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print("--- 🚀 [APP ABERTO PELA NOTIFICAÇÃO] Mensagem! ---");
        // Lógica para lidar com a abertura do app
      });

    } else {
      print("❌ Permissão de notificação NEGADA pelo usuário.");
    }
  }

  // Método para injetar o token como cookie na WebView
  void setCookieOnWebView(WebViewController controller) {
    _webViewController = controller; // Armazena a referência do controller
    if (_cachedToken != null) {
      print('🍪➡️ Injetando cookie fcmToken na Web: $_cachedToken');
      _webViewController!.runJavaScript(
        'document.cookie = "fcmToken=${_cachedToken};path=/;max-age=31536000";' // max-age = 1 ano
      );
    } else {
      print('⚠️ Token FCM ainda não disponível, não foi possível injetar o cookie.');
    }
  }

  // Método para verificar se o app foi aberto por uma notificação quando estava TERMINADO
  Future<void> checkForInitialMessage() async {
    RemoteMessage? initialMessage = await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      print("--- 🏁 [APP ABERTO DE TERMINADO PELA NOTIFICAÇÃO] Mensagem! ---");
    }
  }
}
