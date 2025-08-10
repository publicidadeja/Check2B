import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:cloud_functions/cloud_functions.dart'; // <<< CORRIGIDO

import 'services/push_notification_service.dart';
import 'services/user_manager.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱➡️ Mensagem em segundo plano recebida (HANDLER): ${message.messageId}');
}

final PushNotificationService pushService = PushNotificationService();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // --- INÍCIO APP CHECK ---
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
  // --- FIM APP CHECK ---

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final UserManager userManager = UserManager();

  try {
    await pushService.initialize();
  } catch (e) {
    print("❌ Erro ao inicializar PushNotificationService: $e");
  }

  String? lastUserId = await userManager.getLastUserId();
  if (lastUserId != null) {
    print("Último usuário logado encontrado: $lastUserId.");
  }

  try {
    await pushService.checkForInitialMessage();
  } catch (e) {
    print("❌ Erro ao verificar mensagem inicial: $e");
  }

  runApp(MyApp(userManager: userManager));
}

class MyApp extends StatelessWidget {
  final UserManager userManager;
  const MyApp({super.key, required this.userManager});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebViewPage(userManager: userManager),
    );
  }
}

class WebViewPage extends StatefulWidget {
  final UserManager userManager;
  const WebViewPage({super.key, required this.userManager});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            print("🌐 Página WebView carregada: $url");
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
        'FlutterLogin',
        onMessageReceived: (JavaScriptMessage message) async {
          String userIdFromWeb = message.message;
          if (userIdFromWeb.isNotEmpty) {
            print('🆔 ID do usuário recebido do WebView: $userIdFromWeb');
            
            // --- NOVA LÓGICA DE SALVAMENTO DE TOKEN ---
            String? fcmToken = pushService.currentToken;
            if (fcmToken != null) {
              print('✅ Enviando token FCM para o backend via Cloud Function...');
              try {
                // Instancia a função 'saveFcmToken' que criamos
                HttpsCallable callable = FirebaseFunctions.instanceFor(region: 'us-central1').httpsCallable('saveFcmToken');
                
                // Chama a função com os dados necessários
                final result = await callable.call(<String, dynamic>{
                  'userId': userIdFromWeb,
                  'token': fcmToken,
                });
                
                print('✅ Sucesso! Resposta da Cloud Function: ${result.data}');
                if (mounted) {
                   ScaffoldMessenger.of(context).showSnackBar(
                     const SnackBar(content: Text('Token de notificação registrado!')),
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
            } else {
              print('⚠️ Token FCM ainda não disponível para enviar ao backend.');
            }
            // --- FIM DA NOVA LÓGICA ---
          }
        },
      )
      ..addJavaScriptChannel(
        'FlutterLogout',
        onMessageReceived: (JavaScriptMessage message) async {
          print('🚪 Logout solicitado pelo WebView.');
          await widget.userManager.clearUserAndUnsubscribeFromTopic();
        },
      )
      ..loadRequest(Uri.parse('https://www.check2b.com/'));
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
