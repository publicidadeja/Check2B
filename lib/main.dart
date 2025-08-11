import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'dart:async'; // Import for Timer

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
  Timer? _fcmRetryTimer;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..addJavaScriptChannel(
        'FCMConnector',
        onMessageReceived: (JavaScriptMessage message) {
          print("🤝 Mensagem recebida da Web: ${message.message}");
          if (message.message == 'GET_FCM_TOKEN') {
            _sendFcmTokenToWeb();
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {},
          onPageFinished: (String url) {
            print("🌐 Página WebView carregada: $url");
            _handlePageFinished(url);
          },
          onWebResourceError: (WebResourceError error) {
            print("❌ Erro no WebView: Code=${error.errorCode}, Description='${error.description}', URL='${error.url}'");
          },
        ),
      )
      ..setOnConsoleMessage((JavaScriptConsoleMessage consoleMessage) {
        print('CONTEÚDO DO CONSOLE WEBVIEW: [${consoleMessage.level.name}] ${consoleMessage.message}');
      })
      ..loadRequest(Uri.parse('https://www.check2b.com/'));
  }

  @override
  void dispose() {
    _fcmRetryTimer?.cancel();
    super.dispose();
  }
  
  void _sendFcmTokenToWeb() async {
    String? fcmToken = pushService.currentToken;
    if (fcmToken != null) {
      print('➡️ Enviando token FCM para a Web: $fcmToken');
      await _controller.runJavaScript('window.handleFcmToken("$fcmToken")');
    } else {
      print('⚠️ Token FCM não disponível para enviar à Web.');
      await _controller.runJavaScript('window.handleFcmToken("TOKEN_NOT_FOUND")');
    }
  }

  void _handlePageFinished(String url) async {
    _fcmRetryTimer?.cancel();
    
    // Inicia a lógica de nova tentativa se a URL for a página de login,
    // pois é ali que a sincronização do token após o login deve começar.
    if (url.contains('/login')) {
      print('🚪 Página de login carregada. Aguardando login do usuário para sincronizar token...');
      return; // Não faz nada, espera o usuário logar.
    }
    
    // Se a página carregada for qualquer outra (ou seja, após o login),
    // tenta sincronizar o token.
    final String? loggedInUserId = await _userManager.getLastUserId();
    if (loggedInUserId != null) {
      print('🔄 Página pós-login carregada. Usuário logado ($loggedInUserId). Iniciando tentativas de sincronização do token FCM...');
      _startFcmSyncAttempts();
    } else {
      print('🚪 Página pós-login carregada, mas nenhum usuário logado localmente.');
    }
  }

  void _startFcmSyncAttempts() {
    int attempts = 0;
    const maxAttempts = 5;
    const retryDelay = Duration(seconds: 2);

    _fcmRetryTimer?.cancel(); // Cancela qualquer timer anterior antes de iniciar um novo.

    _fcmRetryTimer = Timer.periodic(retryDelay, (timer) async {
      attempts++;
      print('⏳ Tentativa $attempts/$maxAttempts de sincronizar o token FCM...');
      
      try {
        // A função `window.saveFcmToken` na web agora retorna true em sucesso.
        final dynamic result = await _controller.runJavaScriptReturningResult(
          'typeof window.saveFcmToken === "function" ? window.saveFcmToken() : false'
        );
        
        final bool success = (result is bool && result) || (result is String && result == 'true');
        
        if (success) {
          print('✅ Sucesso! A Web confirmou o recebimento e salvamento do token. Parando tentativas.');
          timer.cancel();
        } else if (attempts >= maxAttempts) {
          print('❌ Falha! Máximo de tentativas atingido. A Web não confirmou o salvamento do token.');
          timer.cancel();
        }
      } catch (e) {
        print('❌ Erro ao executar JS para sincronizar token na tentativa $attempts: $e');
        if (attempts >= maxAttempts) {
          timer.cancel();
        }
      }
    });
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
