
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package.flutter/foundation.dart';

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

// Global instance of PushNotificationService to access the token
final PushNotificationService pushService = PushNotificationService();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // --- INÍCIO DA INICIALIZAÇÃO DO FIREBASE APP CHECK ---
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
  // --- FIM DA INICIALIZAÇÃO DO FIREBASE APP CHECK ---

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
  final UserManager _userManager = UserManager(); // Instancia o UserManager

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
          onPageFinished: (String url) {
            print("🌐 Página WebView carregada: $url");
            _handlePageFinished(url); // Chama a nova função de handshake
          },
          onWebResourceError: (WebResourceError error) {
            print("❌ Erro no WebView: Code=${error.errorCode}, Description='${error.description}', URL='${error.url}'");
          },
        ),
      )
      ..setOnConsoleMessage((JavaScriptConsoleMessage consoleMessage) {
        print('CONTEÚDO DO CONSOLE WEBVIEW: [${consoleMessage.level.name}] ${consoleMessage.message}');
      })
      // NOVO CANAL: Usado pela página web para enviar o UID para o Flutter
      ..addJavaScriptChannel(
        'FlutterReceiver',
        onMessageReceived: (JavaScriptMessage message) {
          String userIdFromWeb = message.message;
          print('🆔 Mensagem recebida no canal FlutterReceiver: $userIdFromWeb');
          _saveTokenForUser(userIdFromWeb);
        },
      )
      ..loadRequest(Uri.parse('https://www.check2b.com/'));
  }
  
  // Função para salvar o token FCM se o usuário for novo
  Future<void> _saveTokenForUser(String userIdFromWeb) async {
    if (userIdFromWeb.isEmpty || userIdFromWeb == 'null') {
      print('🚪 Nenhum usuário logado na web. Limpando dados locais se necessário.');
      await _userManager.clearUserId();
      return;
    }

    String? lastUserId = await _userManager.getLastUserId();
    String? fcmToken = pushService.currentToken;

    if (userIdFromWeb != lastUserId) {
      if (fcmToken != null) {
        print('🚀 Novo login detectado ($userIdFromWeb). Enviando token FCM para a função JS da web...');
        try {
          // Chama a função JS exposta pela página web (MobileLayout)
          await _controller.runJavaScript('window.saveFcmToken("$fcmToken", "$userIdFromWeb")');
          await _userManager.saveUserId(userIdFromWeb); // Salva o UID localmente para evitar repetições
          print('✅ Sucesso! Token enviado e UID ($userIdFromWeb) salvo localmente.');
        } catch (e) {
          print('❌ Erro CRÍTICO ao chamar window.saveFcmToken: $e');
        }
      } else {
        print('⚠️ Token FCM ainda não disponível para enviar ao backend para o usuário $userIdFromWeb.');
      }
    } else {
      print('✅ Token já registrado para $userIdFromWeb nesta sessão.');
    }
  }

  // NOVA LÓGICA: Inicia o "handshake" quando a página do dashboard carrega
  Future<void> _handlePageFinished(String url) async {
    // Só age se estivermos na página do colaborador (após o login)
    if (url.contains('/colaborador')) {
      print('🤝 Handshake: Página do colaborador detectada. Anunciando que o app Flutter está pronto...');
      try {
        await _controller.runJavaScript('window.flutterAppIsReady();');
      } catch(e) {
        print('⚠️ Falha ao anunciar que o Flutter está pronto (window.flutterAppIsReady pode não existir ainda). Tentará novamente na próxima navegação.');
      }
    } else if (url.contains('/login')) {
        print('🚪 Na página de login. Limpando último usuário salvo.');
        await _userManager.clearUserId();
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
