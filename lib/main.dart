import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:cloud_functions/cloud_functions.dart';

import 'services/push_notification_service.dart';
import 'services/user_manager.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱➡️ Mensagem em segundo plano recebida (HANDLER): ${message.messageId}');

  final UserManager userManager = UserManager();
  final String? lastLoggedInUserId = await userManager.getLastUserId();
  final String? targetUserId = message.data['userIdTarget'];

  print('Handler BG - Target UserID do payload: $targetUserId');
  print('Handler BG - Último UserID logado localmente: $lastLoggedInUserId');

  if (targetUserId != null &&
      targetUserId.isNotEmpty &&
      targetUserId == lastLoggedInUserId) {
    print(
        '✅ Handler BG: Notificação para o usuário ativo ($lastLoggedInUserId): ${message.notification?.title}');
  } else {
    if (targetUserId == null || targetUserId.isEmpty) {
      print('⚠️ Handler BG: Notificação recebida sem userIdTarget no payload de dados.');
    } else if (lastLoggedInUserId == null) {
      print(
          '⚠️ Handler BG: Notificação recebida para $targetUserId, mas nenhum usuário logado localmente.');
    } else {
      print(
          '⚠️ Handler BG: Notificação para $targetUserId, mas o usuário ativo é $lastLoggedInUserId. Ignorando.');
    }
  }
}

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

  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
  final UserManager userManager = UserManager();

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {},
          onPageFinished: (String url) async {
            print("🌐 Página WebView carregada: $url");
            
            // Nova lógica para verificar o cookie de login
            await _handleLoginCheck();
          },
          onWebResourceError: (WebResourceError error) {
            print("❌ Erro no WebView: Code=${error.errorCode}, Description='${error.description}', URL='${error.url}'");
          },
        ),
      )
      ..setOnConsoleMessage((JavaScriptConsoleMessage consoleMessage) {
        print('CONTEÚDO DO CONSOLE WEBVIEW: [${consoleMessage.level.name}] ${consoleMessage.message}');
      })
      ..addJavaScriptChannel(
        'FlutterLogout',
        onMessageReceived: (JavaScriptMessage message) async {
          print('🚪 Logout solicitado pelo WebView.');
          await userManager.clearUserId();
        },
      )
      ..loadRequest(Uri.parse('https://www.check2b.com/'));
  }

  Future<void> _handleLoginCheck() async {
    try {
      final result = await _controller.runJavaScriptReturningResult(
          "document.cookie.split('; ').find(row => row.startsWith('user-uid='))?.split('=')[1] || ''");

      final String userIdFromCookie = (result as String).replaceAll('"', '');

      if (userIdFromCookie.isNotEmpty) {
        final lastUserId = await userManager.getLastUserId();
        
        if (userIdFromCookie != lastUserId) {
          print('✅ Novo login detectado! UID do Cookie: $userIdFromCookie. UID anterior: $lastUserId');
          await userManager.saveUserId(userIdFromCookie);
          await _sendFcmToken(userIdFromCookie);
        }
      } else {
        // Se não houver cookie de UID, significa que o usuário não está logado na web
        final lastUserId = await userManager.getLastUserId();
        if (lastUserId != null) {
          print('🚪 Usuário não está mais logado na WebView, limpando ID local.');
          await userManager.clearUserId();
        }
      }
    } catch (e) {
      print('❌ Erro ao verificar o cookie de login: $e');
    }
  }

  Future<void> _sendFcmToken(String userId) async {
    String? fcmToken = pushService.currentToken;
    if (fcmToken == null) {
      print('⚠️ Token FCM ainda não disponível para enviar ao backend.');
      return;
    }

    print('✅ Enviando token FCM ($fcmToken) para o backend para o usuário $userId...');
    try {
      HttpsCallable callable = FirebaseFunctions.instanceFor(region: 'us-central1').httpsCallable('saveFcmToken');
      final result = await callable.call(<String, dynamic>{
        'userId': userId,
        'token': fcmToken,
      });
      print('✅ Sucesso! Resposta da Cloud Function: ${result.data}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notificações ativadas!')),
        );
      }
    } catch (e) {
      print('❌ Erro CRÍTICO ao chamar a Cloud Function saveFcmToken: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao registrar token: $e')),
        );
      }
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
