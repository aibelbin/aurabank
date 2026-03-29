package com.example.aurabank

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.aurabank.navigation.NavGraph
import com.example.aurabank.ui.theme.AurabankTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AurabankTheme {
                NavGraph()
            }
        }
    }
}
