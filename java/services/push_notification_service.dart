import 'package:firebase_core/firebase_core.dart'; // Necessário para o background handler
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart'; // Para kDebugMode, se você quiser diferenciar logs
import 'package:webview_flutter/webview_flutter.dart'; // Importado para usar o WebViewController

// --- INÍCIO DO HANDLER DE BACKGROUND ---
// Este handler DEVE ser uma função de nível superior (fora de qualquer classe).
// Geralmente é colocado no main.dart, mas pode ser aqui se você importar Firebase.initializeApp() etc.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Se você estiver usando outros plugins do Firebase em segundo plano, como o Firestore,
  // certifique-se de inicializar o Firebase antes de usá-los.
  // Se você já chamou Firebase.initializeApp() no seu main(),
  // pode ser que não precise chamar de novo aqui, mas é uma boa prática para garantir.
  // await Firebase.initializeApp(); // Descomente se necessário e importe 'package:firebase_core/firebase_core.dart';

  print("--- 🔔 [BACKGROUND HANDLER] Mensagem Recebida! ---");
  print("🔔 ID da Mensagem: ${message.messageId}");

  if (message.data.isNotEmpty) {
    print("🔔 Dados da Mensagem: ${message.data}");
  }

  if (message.notification != null) {
    print("🔔 Notificação: Título='${message.notification?.title}', Corpo='${message.notification?.body}'");
  }
  print("--- 🔔 [BACKGROUND HANDLER] Fim da Mensagem ---");

  // Aqui você pode, por exemplo, mostrar uma notificação local se necessário,
  // ou processar os dados da mensagem.
}
// --- FIM DO HANDLER DE BACKGROUND ---


class PushNotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  String? _cachedToken;

  String? get currentToken => _cachedToken;

  Future<void> initialize() async {
    // Configura o handler de mensagens em background ANTES de qualquer outra coisa
    // relacionada ao FirebaseMessaging, idealmente no seu main.dart,
    // mas se for aqui, garanta que seja chamado cedo.
    // FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler); // Movido para main.dart geralmente

    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ Permissão de notificação concedida pelo usuário.');
      _cachedToken = await _firebaseMessaging.getToken();
      print("🔑 FCM Token Obtido (e cacheado pelo SDK): $_cachedToken");

      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        print("🔄 FCM Token ATUALIZADO (Refresh): $newToken");
        _cachedToken = newToken;
        // TODO: Envie este novo token para o seu servidor/WebView
        // Ex:  seuWebViewJavaScriptChannel?.invokeMethod('updateFcmToken', newToken);
      });

      // Listener para mensagens recebidas enquanto o app está em PRIMEIRO PLANO
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print("--- 📱 [FOREGROUND] Mensagem Recebida! ---");
        print("📱 ID da Mensagem: ${message.messageId}");

        if (message.data.isNotEmpty) {
          print("📱 Dados da Mensagem: ${message.data}");
        }

        if (message.notification != null) {
          print("📱 Notificação: Título='${message.notification?.title}', Corpo='${message.notification?.body}'");
          // Se o app está em primeiro plano, o Android e iOS geralmente não mostram
          // a notificação na bandeja por padrão. Você precisaria usar um plugin como
          // flutter_local_notifications para exibi-la aqui, se desejado.
          // Ex: showLocalNotification(message.notification?.title, message.notification?.body);
        }
        print("--- 📱 [FOREGROUND] Fim da Mensagem ---");
      });

      // Listener para quando o usuário TOCA na notificação e ABRE o app
      // (quando o app estava em SEGUNDO PLANO ou TERMINADO)
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print("--- 🚀 [APP ABERTO PELA NOTIFICAÇÃO] Mensagem! ---");
        print("🚀 ID da Mensagem: ${message.messageId}");

        if (message.data.isNotEmpty) {
          print("🚀 Dados da Mensagem: ${message.data}");
          // Ex: Navegue para uma tela específica com base nos dados
          // if (message.data['screen'] == 'chat') { navigatorKey.currentState.pushNamed('/chat_screen', arguments: message.data['chat_id']); }
        }

        if (message.notification != null) {
          print("🚀 Notificação: Título='${message.notification?.title}', Corpo='${message.notification?.body}'");
        }
        print("--- 🚀 [APP ABERTO PELA NOTIFICAÇÃO] Fim da Mensagem ---");
        // ... (lógica existente para lidar com a abertura do app) ...
      });

    } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
      print('⚠️ Permissão de notificação provisória concedida (iOS). O usuário precisará confirmá-la.');
    } else {
      print("❌ Permissão de notificação NEGADA pelo usuário.");
    }
  }

  // Método para verificar se o app foi aberto por uma notificação quando estava TERMINADO
  Future<void> checkForInitialMessage() async {
    RemoteMessage? initialMessage = await _firebaseMessaging.getInitialMessage();

    if (initialMessage != null) {
      print("--- 🏁 [APP ABERTO DE TERMINADO PELA NOTIFICAÇÃO] Mensagem! ---");
      print("🏁 ID da Mensagem: ${initialMessage.messageId}");

      if (initialMessage.data.isNotEmpty) {
        print("🏁 Dados da Mensagem: ${initialMessage.data}");
        // Ex: Lógica similar ao onMessageOpenedApp para navegação
      }
      if (initialMessage.notification != null) {
        print("🏁 Notificação: Título='${initialMessage.notification?.title}', Corpo='${initialMessage.notification?.body}'");
      }
      print("--- 🏁 [APP ABERTO DE TERMINADO PELA NOTIFICAÇÃO] Fim da Mensagem ---");
      // ... (lógica existente para lidar com a abertura do app de um estado terminado) ...
    }
  }

  /// NOVO MÉTODO: Injeta o token FCM cacheado como um cookie na WebView fornecida.
  Future<void> setCookieOnWebView(WebViewController controller) async {
    if (_cachedToken != null) {
      print('🍪➡️ Injetando cookie fcmToken na WebView: $_cachedToken');
      // Define um cookie acessível via JavaScript no site
      // max-age está em segundos (1 ano)
      await controller.runJavaScript(
        'document.cookie = "fcmToken=${_cachedToken};path=/;max-age=31536000";'
      );
    } else {
      print('⚠️ Token FCM ainda não disponível, não foi possível injetar o cookie.');
    }
  }
}