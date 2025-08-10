import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
// import 'package:cloud_functions/cloud_functions.dart'; // Removido, não é mais necessário

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
  final UserManager _userManager = UserManager(); // Instância do UserManager

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
            // Nova lógica para verificar o cookie de login
            _checkLoginAndRegisterToken(); 
          },
          onWebResourceError: (WebResourceError error) {
            print("❌ Erro no WebView: Code=${error.errorCode}, Description='${error.description}', URL='${error.url}'");
          },
        ),
      )
      ..setOnConsoleMessage((JavaScriptConsoleMessage consoleMessage) {
        print('CONTEÚDO DO CONSOLE WEBVIEW: [${consoleMessage.level.name}] ${consoleMessage.message}');
      })
      // O canal 'FlutterLogout' é mantido para limpar o estado local do app
      ..addJavaScriptChannel(
        'FlutterLogout',
        onMessageReceived: (JavaScriptMessage message) async {
          print('🚪 Logout solicitado pelo WebView.');
          await _userManager.clearUserId();
        },
      )
      ..loadRequest(Uri.parse('https://www.check2b.com/'));
  }

  // Nova função para ler o cookie e registrar o token
  Future<void> _checkLoginAndRegisterToken() async {
    try {
      // Script JS para ler o cookie 'user-uid'
      final jsResult = await _controller.runJavaScriptReturningResult("document.cookie.split('; ').find(row => row.startsWith('user-uid='))?.split('=')[1]");
      
      final String? userIdFromCookie = jsResult?.toString().replaceAll('"', '');

      if (userIdFromCookie != null && userIdFromCookie.isNotEmpty) {
        print('🆔 UID do usuário encontrado no cookie: $userIdFromCookie');

        // Verifica se o token já foi salvo para este usuário nesta sessão
        final lastSavedUserId = await _userManager.getLastUserId();
        if (lastSavedUserId == userIdFromCookie) {
          print('✅ Token já registrado para $userIdFromCookie nesta sessão.');
          return;
        }

        // Se for um novo login, obtém o token FCM e chama a função JS na web
        String? fcmToken = pushService.currentToken;
        if (fcmToken != null) {
          print('🚀 Enviando token FCM para a função JS da web...');
          // Chama a função JS exposta em `auth.ts`
          await _controller.runJavaScript('window.saveFcmToken("$fcmToken", "$userIdFromCookie")');
          
          // Salva localmente que o token foi registrado para este usuário
          await _userManager.saveUserId(userIdFromCookie);
          
          print('✅ Sucesso! Token enviado e UID salvo localmente.');

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Notificações configuradas!'), duration: Duration(seconds: 2)),
            );
          }
        } else {
          print('⚠️ Token FCM ainda não disponível para registrar.');
        }
      } else {
        print('🍪 Nenhum cookie de usuário encontrado. Usuário não logado.');
        await _userManager.clearUserId(); // Garante que o estado local está limpo
      }
    } catch (e) {
      print('❌ Erro ao executar JS para ler cookie ou registrar token: $e');
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
