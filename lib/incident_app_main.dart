import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

void main() {
  runApp(const IncidentCenterApp());
}

class IncidentCenterApp extends StatelessWidget {
  const IncidentCenterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'OtoTR Olay Merkezi',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFC31924), brightness: Brightness.light),
        scaffoldBackgroundColor: const Color(0xFFF4F5F7),
        useMaterial3: true,
        cardTheme: const CardThemeData(elevation: 0, margin: EdgeInsets.zero),
      ),
      home: const IncidentCenterHome(),
    );
  }
}

class IncidentCenterHome extends StatefulWidget {
  const IncidentCenterHome({super.key});

  @override
  State<IncidentCenterHome> createState() => _IncidentCenterHomeState();
}

class _IncidentCenterHomeState extends State<IncidentCenterHome> {
  final _plateController = TextEditingController(text: '06 KAZ 26');
  final _serverController = TextEditingController(text: 'http://10.0.2.2:8787');
  bool _busy = false;
  bool _demoMode = true;
  String _status = 'Demo modu hazır';
  List<Map<String, dynamic>> _matches = const [];
  List<Map<String, dynamic>> _sources = const [
    {
      'id': 'trt-haber',
      'name': 'TRT Haber — Türkiye',
      'type': 'rss_news',
      'enabled': true,
      'totalArticlesFound': 12,
      'totalImagesScanned': 31,
      'totalPlateCandidates': 4,
      'lastSuccessfulScanAt': '2026-08-29T00:03:00Z',
    }
  ];

  @override
  void dispose() {
    _plateController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> _request(String path, {String method = 'GET'}) async {
    final base = _serverController.text.trim().replaceAll(RegExp(r'/+$'), '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      throw const FormatException('Sunucu adresi http:// veya https:// ile başlamalı.');
    }
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final request = await client.openUrl(method, Uri.parse('$base$path'));
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = await utf8.decoder.bind(response).join();
      final decoded = jsonDecode(body) as Map<String, dynamic>;
      if (response.statusCode < 200 || response.statusCode >= 300 || decoded['ok'] != true) {
        throw HttpException(decoded['error']?['message']?.toString() ?? 'HTTP ${response.statusCode}');
      }
      return decoded;
    } finally {
      client.close(force: true);
    }
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _status = 'Sunucu kontrol ediliyor…';
    });
    try {
      final health = await _request('/api/health');
      final sourcePayload = await _request('/api/sources');
      final rawSources = sourcePayload['data'];
      setState(() {
        _demoMode = false;
        _status = 'Sunucu bağlı • ${health['data']?['status'] ?? 'ok'}';
        _sources = rawSources is List
            ? rawSources.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
            : const [];
      });
    } catch (error) {
      setState(() {
        _demoMode = true;
        _status = 'Sunucuya bağlanılamadı; demo modu açık. ${error.toString()}';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _scanTrt() async {
    if (_demoMode) {
      setState(() => _status = 'Demo: TRT taraması simüle edildi • 4 plaka adayı');
      return;
    }
    setState(() {
      _busy = true;
      _status = 'TRT Haber taranıyor…';
    });
    try {
      await _request('/api/sources/trt-haber/scan', method: 'POST');
      setState(() => _status = 'TRT Haber taraması tamamlandı');
      await _connect();
    } catch (error) {
      setState(() => _status = 'Tarama hatası: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _lookup() async {
    final plate = _plateController.text.trim();
    if (plate.isEmpty) return;
    setState(() {
      _busy = true;
      _status = 'Plaka sorgulanıyor…';
    });
    if (_demoMode) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      setState(() {
        _matches = [
          {
            'plate': plate.toUpperCase(),
            'sourceName': 'TRT Haber — Türkiye',
            'postedAt': '2026-08-21T12:30:00Z',
            'ocrConfidence': 91,
            'status': 'approved_customer',
            'sourcePlatform': 'NEWS',
            'articleTitle': 'Demo trafik kazası görsel eşleşmesi',
          }
        ];
        _status = 'Demo: 1 doğrulanmış eşleşme bulundu';
        _busy = false;
      });
      return;
    }
    try {
      final payload = await _request('/api/plates/${Uri.encodeComponent(plate)}?audience=technician');
      final raw = payload['data']?['matches'];
      setState(() {
        _matches = raw is List
            ? raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
            : const [];
        _status = '${_matches.length} doğrulanmış eşleşme bulundu';
      });
    } catch (error) {
      setState(() => _status = 'Sorgu hatası: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF15171A),
        foregroundColor: Colors.white,
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('OtoTR', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: .4)),
          Text('Açık Kaynak Araç Olay Merkezi', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400)),
        ]),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Chip(
                label: Text(_demoMode ? 'DEMO' : 'CANLI'),
                backgroundColor: _demoMode ? Colors.amber.shade100 : Colors.green.shade100,
                side: BorderSide.none,
              ),
            ),
          )
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _connect,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _serverCard(),
              const SizedBox(height: 14),
              _statusCard(),
              const SizedBox(height: 14),
              _lookupCard(),
              const SizedBox(height: 18),
              const Text('Kaynaklar', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              ..._sources.map(_sourceCard),
              const SizedBox(height: 18),
              const Text('Plaka Eşleşmeleri', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              if (_matches.isEmpty)
                const _EmptyResult()
              else
                ..._matches.map(_matchCard),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.radar), label: 'Olay Merkezi'),
          NavigationDestination(icon: Icon(Icons.fact_check_outlined), label: 'Doğrulama'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Ayarlar'),
        ],
      ),
    );
  }

  Widget _serverCard() => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Sunucu bağlantısı', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            TextField(
              controller: _serverController,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'OtoTR API adresi',
                hintText: 'http://192.168.1.50:8787',
                border: OutlineInputBorder(),
                helperText: 'Gerçek telefonda PC’nin yerel IP adresini kullanın.',
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _busy ? null : _connect,
                icon: const Icon(Icons.link),
                label: const Text('Bağlantıyı test et'),
              ),
            ),
          ]),
        ),
      );

  Widget _statusCard() => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: _demoMode ? const Color(0xFFFFF4D6) : const Color(0xFFE6F6EA),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          Icon(_demoMode ? Icons.info_outline : Icons.check_circle_outline),
          const SizedBox(width: 10),
          Expanded(child: Text(_status)),
          if (_busy) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
        ]),
      );

  Widget _lookupCard() => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Ekspertize giren aracı sorgula', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Yalnız tam plaka eşleşmesi ve onaylı kayıtlar gösterilir.'),
            const SizedBox(height: 10),
            TextField(
              controller: _plateController,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.directions_car), labelText: 'Plaka', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _busy ? null : _lookup,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFC31924)),
                icon: const Icon(Icons.search),
                label: const Text('Doğrulanmış kaydı ara'),
              ),
            ),
          ]),
        ),
      );

  Widget _sourceCard(Map<String, dynamic> source) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(color: const Color(0xFFC31924), borderRadius: BorderRadius.circular(10)),
                  alignment: Alignment.center,
                  child: const Text('H', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(source['name']?.toString() ?? 'Haber kaynağı', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text(source['type']?.toString() ?? 'rss_news', style: const TextStyle(fontSize: 12)),
                ])),
                Icon(source['enabled'] == false ? Icons.pause_circle_outline : Icons.check_circle, color: source['enabled'] == false ? Colors.grey : Colors.green),
              ]),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                _miniMetric('Haber', source['totalArticlesFound']),
                _miniMetric('Görsel', source['totalImagesScanned']),
                _miniMetric('Plaka', source['totalPlateCandidates']),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _scanTrt,
                  icon: const Icon(Icons.radar),
                  label: const Text('TRT Haber’i şimdi tara'),
                ),
              ),
            ]),
          ),
        ),
      );

  Widget _miniMetric(String label, dynamic value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
        child: Text('$label: ${value ?? 0}', style: const TextStyle(fontWeight: FontWeight.w700)),
      );

  Widget _matchCard(Map<String, dynamic> match) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.verified, color: Colors.green),
                const SizedBox(width: 8),
                Expanded(child: Text(match['plate']?.toString() ?? _plateController.text, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900))),
                Text('OCR %${match['ocrConfidence'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 8),
              Text(match['sourceName']?.toString() ?? (match['sourcePlatform'] == 'NEWS' ? 'Haber Sitesi' : 'X')),
              const SizedBox(height: 4),
              Text(match['articleTitle']?.toString() ?? match['postText']?.toString() ?? 'Doğrulanmış açık kaynak olay kaydı'),
              const SizedBox(height: 10),
              const Text('Bu kayıt resmî hasar/Tramer kaydı değildir; açık kaynak görsel eşleşmesidir.', style: TextStyle(fontSize: 12, color: Colors.black54)),
            ]),
          ),
        ),
      );
}

class _EmptyResult extends StatelessWidget {
  const _EmptyResult();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(26),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: const Column(children: [
          Icon(Icons.manage_search, size: 42, color: Colors.black45),
          SizedBox(height: 8),
          Text('Henüz eşleşme yok', style: TextStyle(fontWeight: FontWeight.w800)),
          SizedBox(height: 4),
          Text('Bir plaka sorgulayın veya TRT Haber taramasını çalıştırın.', textAlign: TextAlign.center),
        ]),
      );
}
