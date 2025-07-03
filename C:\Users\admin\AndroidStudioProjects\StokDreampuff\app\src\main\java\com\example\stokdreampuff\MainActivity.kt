package com.example.stokdreampuff

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.example.stokdreampuff.R // <-- Ini baris import baru yang krusial

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val myWebView: WebView = findViewById(R.id.webview)
        
        // Baris ini penting agar semua link yang diklik tetap terbuka di dalam aplikasi
        myWebView.webViewClient = WebViewClient()
        
        // Baris ini mengaktifkan JavaScript, wajib agar React bisa berjalan
        myWebView.settings.javaScriptEnabled = true
        
        // Menggunakan URL yang benar, dimulai dari halaman utama (login)
        myWebView.loadUrl("https://stokharianproduk.vercel.app/") 
    }
}
