
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

// Caminhos corrigidos baseados na estrutura do seu projeto
import 'java/services/push_notification_service.dart';
import 'java/services/user_manager.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱➡️ Mensagem em segundo plano recebida (HANDLER): ${message.messageId}');

  final UserManager userManager = UserManager();
  final String? lastLoggedInUserId = await userManager.getLastUserId();
  final String? targetUserId = message.data['userIdTarget'];

  print('Handler BG - Target UserID do payload: $targetUserId');
  print('Handler BG - Último UserID logado localmente: $lastLoggedInUserId');

  if (targetUserId != null && targetUserId.isNotEmpty && targetUserId == lastLoggedInUserId) {
    print('✅ Handler BG: Notificação para o usuário ativo ($lastLoggedInUserId): ${message.notification?.title}');
  } else {
    if (targetUserId == null || targetUserId.isEmpty) {
      print('⚠️ Handler BG: Notificação recebida sem userIdTarget no payload de dados.');
    } else if (lastLoggedInUserId == null) {
      print('⚠️ Handler BG: Notificação recebida para $targetUserId, mas nenhum usuário logado localmente.');
    } else {
      print('⚠️ Handler BG: Notificação para $targetUserId, mas o usuário ativo é $lastLoggedInUserId. Ignorando.');
    }
  }
}

// Global instance of PushNotificationService to access the token
final PushNotificationService pushService = PushNotificationService();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  if (kDebugMode) {
    print("🚀 App Check: Inicializando com o provedor de DEPURAÇÃO.");
    try {
      await FirebaseAppCheck.instance.activate(androidProvider: AndroidProvider.debug);
      print("👍 App Check (Debug) ativado com sucesso.");
    } catch (e) {
      print("❌ Erro ao ativar App Check (Debug): $e");
    }
  } else {
    print("🚀 App Check: Inicializando com o provedor Play Integrity (Release).");
    try {
      await FirebaseAppCheck.instance.activate(androidProvider: AndroidProvider.playIntegrity);
      print("👍 App Check (Release) ativado com sucesso.");
    } catch (e) {
      print("❌ Erro ao ativar App Check (Release): $e");
    }
  }

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  try {
    await pushService.initialize();
  } catch (e) {
    print("❌ Erro ao inicializar PushNotificationService: $e");
  }

  try {
    await pushService.checkForInitialMessage();
  } catch (e) {
    print("❌ Erro ao verificar mensagem inicial: $e");
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebViewPage(),
    );
  }
}

class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> {
  late final WebViewController _controller;
  final UserManager _userManager = UserManager();
  final String _flutterReceiverChannel = "FlutterReceiver";

  @override
  void initState() {
    super.initState();

    // Lógica de comunicação revisada
    final WebViewController controller = WebViewController();

    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {},
          onPageFinished: (String url) {
            print("🌐 Página WebView carregada: $url");
            // Agora o app Flutter anuncia sua presença na webview
            _announceFlutterPresence(controller);
          },
          onWebResourceError: (WebResourceError error) {
            print("❌ Erro no WebView: Code=${error.errorCode}, Description='${error.description}', URL='${error.url}'");
          },
        ),
      )
      ..addJavaScriptChannel(
        _flutterReceiverChannel,
        onMessageReceived: (JavaScriptMessage message) {
          // A webview nos enviou o UID do usuário!
          print("✅ Mensagem recebida da Webview no canal '$_flutterReceiverChannel': ${message.message}");
          final String newUserId = message.message;
          _registerFcmTokenForUser(newUserId);
        },
      )
      ..loadRequest(Uri.parse('https://www.check2b.com/'));

    _controller = controller;
  }

  // O App Flutter se apresenta para a página
  void _announceFlutterPresence(WebViewController controller) {
    print("🤝 Anunciando a presença do Flutter para a página web...");
    controller.runJavaScript('window.flutterAppIsReady && window.flutterAppIsReady();');
  }

  // Lógica centralizada para registrar o token
  Future<void> _registerFcmTokenForUser(String newUserId) async {
    final String? fcmToken = pushService.currentToken;
    if (fcmToken == null) {
      print("⚠️ Token FCM ainda não disponível. Não foi possível registrar.");
      return;
    }

    final String? lastUserId = await _userManager.getLastUserId();

    if (newUserId.isNotEmpty && newUserId != lastUserId) {
      print("🚀 Novo login detectado (UID: $newUserId). Enviando token FCM para a função JS da web...");

      await _controller.runJavaScript('window.saveFcmToken("$fcmToken", "$newUserId")');

      await _userManager.saveUserId(newUserId);
      print("✅ Sucesso! Token enviado e UID ($newUserId) salvo localmente.");
    } else {
      print("✅ Token já registrado para o usuário $newUserId nesta sessão.");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
