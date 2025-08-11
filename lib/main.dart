import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

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

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..addJavaScriptChannel(
        'FCMConnector',
        onMessageReceived: (JavaScriptMessage message) {
          // This part is for messages FROM web to Flutter, not used in the getFcmToken flow.
          print('Mensagem recebida do canal FCMConnector: ${message.message}');
        }
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {},
          onPageStarted: (String url) {},
          onPageFinished: (String url) async {
            print("🌐 Página WebView carregada: $url");
            // Setup the getFcmToken function on the JS side after page loads
            await _controller.runJavaScript('''
              window.FCMConnector = {
                getFcmToken: async function() {
                  return await FCMConnector.postMessage('getFcmToken');
                }
              };
            ''');
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
      
    // The new logic to provide the token when requested
    _controller.runJavaScript('''
        window.getFcmToken = function() {
            return new Promise((resolve, reject) => {
                FCMConnector.postMessage('getFcmToken').then(token => resolve(token));
            });
        };
    ''');
    
    // Add logic to handle the 'getFcmToken' request from JS
    _controller.addJavaScriptChannel(
      'FCMConnector',
      onMessageReceived: (JavaScriptMessage message) {
        if (message.message == 'getFcmToken') {
          String? token = pushService.currentToken;
          if (token != null) {
              _controller.runJavaScript('window.FCMConnector.onFcmTokenResolved("$token")');
          } else {
              _controller.runJavaScript('window.FCMConnector.onFcmTokenRejected("Token not available")');
          }
        }
      }
    );
    
    // This is the new way to add the channel to get the token
    _controller.addJavaScriptChannel(
        'FCMTokenReceiver',
        onMessageReceived: (JavaScriptMessage message) {
            final parts = message.message.split(';');
            final token = parts[0];
            final userId = parts[1];
            _userManager.saveUserId(userId);
            // Optionally, save the token to local storage in Flutter as well
        }
    );

  }
  
  // This is a new helper for the JS channel
  Future<String> getFcmToken() async {
    return pushService.currentToken ?? "TOKEN_NOT_FOUND";
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