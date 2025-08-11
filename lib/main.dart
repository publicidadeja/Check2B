import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'dart:async'; // Import for Timer

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
  String? _lastLoggedInUserId;

  @override
  void initState() {
    super.initState();
    _userManager.getLastUserId().then((id) {
        setState(() {
            _lastLoggedInUserId = id;
        });
    });

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..addJavaScriptChannel(
        'FCMConnector',
        onMessageReceived: (JavaScriptMessage message) {
          print("🤝 Mensagem recebida da Web: ${message.message}");
          // A web nos informa o UID do usuário que acabou de logar
          final String userIdFromWeb = message.message;
          _handleUserLoginFromWeb(userIdFromWeb);
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
  
  void _handleUserLoginFromWeb(String userId) async {
    print("👨‍💻 Usuário logado na Web! UID: $userId. Salvando localmente...");
    await _userManager.setLastUserId(userId);
    setState(() {
        _lastLoggedInUserId = userId;
    });

    // Agora que sabemos que o usuário está logado, podemos iniciar a sincronização do token
    _startFcmSyncAttempts();
  }


  @override
  void dispose() {
    _fcmRetryTimer?.cancel();
    super.dispose();
  }

  void _handlePageFinished(String url) async {
    _fcmRetryTimer?.cancel();
    
    // Anuncia a presença do canal de comunicação para a página web
    await _controller.runJavaScript(
        'window.FCMConnector = { getFcmToken: function() { return new Promise((resolve, reject) => { FCMConnectorRaw.postMessage("GET_FCM_TOKEN").then(resolve, reject); }); } };'
    );
     print('🤝 Canal FCMConnector injetado na WebView.');

    // Se a URL for a do dashboard E já tivermos um usuário logado localmente,
    // tentamos sincronizar o token. Isso cobre os casos de reabertura do app.
    if (url.contains('/colaborador/dashboard') && _lastLoggedInUserId != null) {
      print('🔄 Página do dashboard carregada com usuário já logado ($_lastLoggedInUserId). Tentando sincronizar token FCM...');
      _startFcmSyncAttempts();
    } else {
      print('🚪 Página carregada. Aguardando login do usuário pela web...');
    }
  }

  void _startFcmSyncAttempts() async {
    // Garante que temos o token FCM antes de tentar
    final String? fcmToken = pushService.currentToken;
    if (fcmToken == null || _lastLoggedInUserId == null) {
      print("⚠️ Tentativa de sincronização falhou: Token FCM ou User ID nulos.");
      return;
    }

    int attempts = 0;
    const maxAttempts = 5;
    const retryDelay = Duration(seconds: 2);

    _fcmRetryTimer?.cancel(); // Cancela qualquer timer anterior
    _fcmRetryTimer = Timer.periodic(retryDelay, (timer) async {
      attempts++;
      print('⏳ Tentativa $attempts/$maxAttempts de enviar o token FCM para a Web...');
      
      try {
        // Agora chamamos a função 'saveFcmToken' que existe na web
        await _controller.runJavaScript(
          'if (typeof window.saveFcmToken === "function") { window.saveFcmToken("$_lastLoggedInUserId", "$fcmToken"); }'
        );
        print('✅ Tentativa de envio do token concluída. A web agora é responsável por salvar.');
        // Assumimos que a chamada foi bem-sucedida e paramos de tentar.
        // A lógica de salvamento real está na web agora.
        timer.cancel();
      } catch (e) {
        print('❌ Erro ao executar JS para enviar o token na tentativa $attempts: $e');
        if (attempts >= maxAttempts) {
          print('❌ Falha! Máximo de tentativas atingido.');
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
