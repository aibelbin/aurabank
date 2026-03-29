package com.example.aurabank.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.aurabank.di.AppModule
import com.example.aurabank.ui.components.Ink
import com.example.aurabank.ui.components.Muted
import com.example.aurabank.ui.components.Parchment
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(onSubmitClick: () -> Unit, onLogout: () -> Unit = {}) {
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Parchment)
            .padding(24.dp)
    ) {
        Text(
            text = "Home — coming soon",
            color = Ink,
            fontSize = 18.sp,
            modifier = Modifier.align(Alignment.Center)
        )

        // DEV: logout button
        Text(
            text = "Sign out",
            color = Muted,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) {
                    scope.launch {
                        AppModule.authRepository.signOut()
                        onLogout()
                    }
                }
        )
    }
}
