package com.example.stokdreampuff

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val myWebView: WebView = findViewById(R.id.webview)
        
        // Baris ini penting agar semua link yang diklik tetap terbuka di dalam aplikasi
        myWebView.webViewClient = WebViewClient()
        
        // Baris ini mengaktifkan JavaScript, wajib agar React bisa berjalan
        myWebView.settings.javaScriptEnabled = true
        
        // URL aplikasi web-mu yang akan dimuat
        myWebView.loadUrl("https://stokharianproduk.vercel.app/")
    }
}
