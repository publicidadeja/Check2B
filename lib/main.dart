import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:check2b_mobile_app/services/push_notification_service.dart';
import 'package:check2b_mobile_app/services/user_manager.dart';

// --- BACKGROUND HANDLER ---
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱➡️ Mensagem em segundo plano recebida (HANDLER): ${message.messageId}');
  // A lógica de filtragem de usuário pode ser adicionada aqui se necessário,
  // mas geralmente o backend já envia para o token/tópico correto.
}

// Global instance of PushNotificationService
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

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      // Adiciona o canal de comunicação ANTES de carregar a página
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage message) {
          final String userId = message.message;
          print('✅ Handshake: UID recebido da página web: $userId');
          // Agora que temos o UID, podemos salvar o token FCM
          _saveTokenForUser(userId);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {},
          onPageFinished: (String url) {
            print("🌐 Página WebView carregada: $url");
            _handlePageFinished(url); // Passa a URL para o manipulador
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

  // Novo método para salvar o token
  Future<void> _saveTokenForUser(String userId) async {
    String? fcmToken = pushService.currentToken;
    if (fcmToken == null) {
      print('⚠️ Token FCM ainda não disponível. Não foi possível registrar.');
      return;
    }

    String? lastUserId = await _userManager.getLastUserId();
    if (userId.isNotEmpty && userId != lastUserId) {
       print('🚀 ID de usuário mudou. Enviando token FCM para a função da Cloud...');
       try {
        await pushService.saveTokenToDatabase(userId);
        await _userManager.saveUserId(userId);
        print('✅ Sucesso! Token enviado e UID salvo localmente.');
       } catch (e) {
         print('❌ Falha ao salvar token no banco de dados: $e');
       }
    } else {
        print('✅ Token já registrado para $userId ou UID é inválido.');
    }
  }


  Future<void> _handlePageFinished(String url) async {
    // Se a página carregada for uma página do dashboard (não login)
    // E o app Flutter estiver sendo executado, ele anuncia que está pronto.
    if (!url.contains('/login') && mounted) {
      print('🤝 Handshake: Página do colaborador detectada. Anunciando que o app Flutter está pronto...');
      // A página web irá detectar este chamado e responder através do FlutterChannel.
      await _controller.runJavaScript('window.flutterAppIsReady && window.flutterAppIsReady()');
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
