package com.example.ototr_branch_app

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "com.ototr/registration_scanner"
    private val scanRequestCode = 4107
    private var pendingResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "scanRegistration" -> startRegistrationScan(result)
                    else -> result.notImplemented()
                }
            }
    }

    private fun startRegistrationScan(result: MethodChannel.Result) {
        if (pendingResult != null) {
            result.error("SCAN_IN_PROGRESS", "Ruhsat tarama zaten devam ediyor.", null)
            return
        }
        pendingResult = result
        val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(2)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()
        GmsDocumentScanning.getClient(options)
            .getStartScanIntent(this)
            .addOnSuccessListener { intentSender ->
                try {
                    startIntentSenderForResult(
                        intentSender,
                        scanRequestCode,
                        null,
                        0,
                        0,
                        0
                    )
                } catch (error: IntentSender.SendIntentException) {
                    pendingResult = null
                    result.error("SCANNER_UNAVAILABLE", error.localizedMessage, null)
                }
            }
            .addOnFailureListener { error ->
                pendingResult = null
                result.error("SCANNER_UNAVAILABLE", error.localizedMessage, null)
            }
    }

    @Deprecated("Android activity result callback used for FlutterActivity compatibility.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != scanRequestCode) return
        val flutterResult = pendingResult ?: return
        pendingResult = null
        if (resultCode != Activity.RESULT_OK) {
            flutterResult.success(mapOf("cancelled" to true))
            return
        }
        val scanResult = GmsDocumentScanningResult.fromActivityResultIntent(data)
        val pages = scanResult?.pages.orEmpty().take(2)
        if (pages.isEmpty()) {
            flutterResult.success(mapOf("cancelled" to true))
            return
        }
        recognizePages(pages.map { it.imageUri }, flutterResult)
    }

    private fun recognizePages(uris: List<Uri>, result: MethodChannel.Result) {
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        val evidence = mutableListOf<Map<String, Any>>()
        fun process(index: Int) {
            if (index >= uris.size) {
                result.success(
                    mapOf(
                        "cancelled" to false,
                        "imagePaths" to uris.map { it.toString() },
                        "evidence" to evidence
                    )
                )
                recognizer.close()
                return
            }
            val pageNumber = index + 1
            val image = InputImage.fromFilePath(this, uris[index])
            recognizer.process(image)
                .addOnSuccessListener { text ->
                    evidence.addAll(evidenceForPage(text, pageNumber, image.width, image.height))
                    process(index + 1)
                }
                .addOnFailureListener { error ->
                    recognizer.close()
                    result.error("OCR_FAILED", error.localizedMessage, null)
                }
        }
        process(0)
    }

    private fun evidenceForPage(
        text: Text,
        page: Int,
        width: Int,
        height: Int
    ): List<Map<String, Any>> {
        val items = mutableListOf<Map<String, Any>>()
        text.textBlocks.forEachIndexed { blockIndex, block ->
            items.add(evidenceItem("page${page}-block${blockIndex + 1}", block.text, block.boundingBox, page, width, height))
            block.lines.forEachIndexed { lineIndex, line ->
                items.add(evidenceItem("page${page}-line${lineIndex + 1}", line.text, line.boundingBox, page, width, height))
                line.elements.forEachIndexed { elementIndex, element ->
                    items.add(
                        evidenceItem(
                            "page${page}-line${lineIndex + 1}-element${elementIndex + 1}",
                            element.text,
                            element.boundingBox,
                            page,
                            width,
                            height
                        )
                    )
                }
            }
        }
        return items
    }

    private fun evidenceItem(
        id: String,
        text: String,
        rect: Rect?,
        page: Int,
        width: Int,
        height: Int
    ): Map<String, Any> {
        val safeWidth = width.coerceAtLeast(1).toDouble()
        val safeHeight = height.coerceAtLeast(1).toDouble()
        val bbox = if (rect == null) {
            listOf(0.0, 0.0, 0.0, 0.0)
        } else {
            listOf(
                rect.left / safeWidth,
                rect.top / safeHeight,
                rect.right / safeWidth,
                rect.bottom / safeHeight
            )
        }
        return mapOf("id" to id, "text" to text, "bbox" to bbox, "page" to page)
    }
}
