
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';

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
        'FlutterChannel', // Canal para a web se comunicar com o Flutter
        onMessageReceived: (JavaScriptMessage message) {
          // A web enviou o UID do usuário após o login
          print("🤝 Mensagem recebida da Web: ${message.message}");
          final String userId = message.message;
          if (userId.isNotEmpty && userId != "undefined") {
            _handleUserLogin(userId);
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
  
  // Função chamada pelo canal JavaScript quando a web envia o UID do usuário
  void _handleUserLogin(String userId) async {
    print("✅ UID recebido da web: $userId. Salvando localmente e iniciando sincronização do token.");
    // Aqui você poderia usar o userManager para salvar o ID se o método existisse, mas por agora vamos prosseguir.
    // await _userManager.setLastUserId(userId); 
    
    // Inicia as tentativas de enviar o token FCM para a web.
    _startFcmSyncAttempts(userId);
  }
  
  // Função chamada quando uma página termina de carregar na WebView
  void _handlePageFinished(String url) async {
    _fcmRetryTimer?.cancel(); // Cancela qualquer timer anterior
    
    print("🤝 Anunciando a presença do Flutter para a página web...");
    // Informa à página web que o canal de comunicação do Flutter está pronto
    await _controller.runJavaScript('window.flutterChannelReady = true;');
  }

  // Tenta enviar o token FCM para a web periodicamente
  void _startFcmSyncAttempts(String userId) {
    int attempts = 0;
    const maxAttempts = 5;
    const retryDelay = Duration(seconds: 2);

    _fcmRetryTimer = Timer.periodic(retryDelay, (timer) async {
      attempts++;
      print('⏳ Tentativa $attempts/$maxAttempts de sincronizar o token FCM para o usuário $userId...');
      
      String? fcmToken = pushService.currentToken;
      if (fcmToken == null) {
          print('⚠️ Token FCM ainda não disponível. Tentando obter novamente...');
          await pushService.initialize(); // Tenta obter o token novamente
          fcmToken = pushService.currentToken;
          if (fcmToken == null) {
              print('❌ Token FCM não obtido na tentativa $attempts. Tentando novamente em breve...');
              if (attempts >= maxAttempts) timer.cancel();
              return;
          }
      }

      try {
        final dynamic result = await _controller.runJavaScriptReturningResult(
          'typeof window.handleFcmToken === "function" ? window.handleFcmToken("$userId", "$fcmToken") : false'
        );
        
        final bool success = (result is bool && result) || (result is String && result.toLowerCase() == 'true');
        
        if (success) {
          print('✅ Sucesso! A Web confirmou o recebimento do token para o usuário $userId. Parando tentativas.');
          timer.cancel();
        } else if (attempts >= maxAttempts) {
          print('❌ Falha! Máximo de tentativas atingido. A Web não confirmou o recebimento.');
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

    