package com.example.aurabank.ui.auth

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOutCubic
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.aurabank.ui.components.AuraInput
import com.example.aurabank.ui.components.Gold
import com.example.aurabank.ui.components.Ink
import com.example.aurabank.ui.components.Muted
import com.example.aurabank.ui.components.CozyParticleAnimation
import com.example.aurabank.ui.components.Parchment
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun SignUpScreen(
    onSignUpSuccess: () -> Unit,
    onBack: () -> Unit = {}
) {
    val viewModel: SignUpViewModel = viewModel(factory = SignUpViewModel.Factory)
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.success) {
        if (uiState.success) onSignUpSuccess()
    }

    // Show confirmation message instead of navigating
    if (uiState.awaitingConfirmation) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier.fillMaxSize().background(Parchment),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 36.dp)
            ) {
                Text("✦", color = Gold, fontSize = 32.sp)
                Spacer(Modifier.height(16.dp))
                Text("Check your email", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Ink)
                Spacer(Modifier.height(8.dp))
                Text("We sent a confirmation link.\nConfirm then sign in.", fontSize = 14.sp, color = Muted, letterSpacing = 0.3.sp)
                Spacer(Modifier.height(32.dp))
                Text(
                    text = "Back to sign in",
                    color = Gold,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onBack() }
                )
            }
        }
        return
    }

    var name            by remember { mutableStateOf("") }
    var org             by remember { mutableStateOf("") }
    var email           by remember { mutableStateOf("") }
    var password        by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val passwordsMatch = password.isNotEmpty() && password == confirmPassword

    val titleAlpha = remember { Animatable(0f) }
    val titleSlide = remember { Animatable(20f) }
    val formAlpha  = remember { Animatable(0f) }
    val formSlide  = remember { Animatable(28f) }

    LaunchedEffect(Unit) {
        launch {
            delay(200)
            launch { titleSlide.animateTo(0f, tween(550, easing = EaseOutCubic)) }
            titleAlpha.animateTo(1f, tween(550))
        }
        launch {
            delay(450)
            launch { formSlide.animateTo(0f, tween(650, easing = EaseOutCubic)) }
            formAlpha.animateTo(1f, tween(650))
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Parchment)
    ) {
        val screenHeight = maxHeight

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CozyParticleAnimation(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(screenHeight * 0.22f)
            )

            Spacer(Modifier.height(24.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 36.dp)
                    .alpha(titleAlpha.value)
                    .offset(y = titleSlide.value.dp)
            ) {
                Text("Create", fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Ink, letterSpacing = (-1.5).sp)
                Text("Account", fontSize = 40.sp, fontWeight = FontWeight.Light, color = Gold, letterSpacing = (-1.5).sp, modifier = Modifier.offset(y = (-8).dp))
                Spacer(Modifier.height(6.dp))
                Text("Join the social economy", fontSize = 13.sp, color = Muted, letterSpacing = 0.4.sp)
            }

            Spacer(Modifier.height(28.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 36.dp)
                    .alpha(formAlpha.value)
                    .offset(y = formSlide.value.dp)
            ) {
                // → user.name
                AuraInput(
                    value = name,
                    onValueChange = { name = it },
                    label = "FULL NAME",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text)
                )

                // → user.org (optional)
                AuraInput(
                    value = org,
                    onValueChange = { org = it },
                    label = "ORGANISATION  ·  optional",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text)
                )

                // → Supabase Auth
                AuraInput(
                    value = email,
                    onValueChange = { email = it },
                    label = "EMAIL",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )

                // → Supabase Auth
                AuraInput(
                    value = password,
                    onValueChange = { password = it },
                    label = "PASSWORD",
                    visualTransformation = if (passwordVisible) VisualTransformation.None
                                           else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingContent = {
                        Text(
                            text = if (passwordVisible) "hide" else "show",
                            color = Muted,
                            fontSize = 11.sp,
                            letterSpacing = 0.8.sp,
                            modifier = Modifier.clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) { passwordVisible = !passwordVisible }
                        )
                    }
                )

                // Validation only — not stored
                AuraInput(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = "CONFIRM PASSWORD",
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingContent = {
                        if (confirmPassword.isNotEmpty()) {
                            Text(
                                text = if (passwordsMatch) "✓" else "✗",
                                color = if (passwordsMatch) Gold else Muted,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                )

                Spacer(Modifier.height(8.dp))

                // Error message
                if (uiState.error != null) {
                    Text(
                        text = uiState.error!!,
                        color = Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }

                // Create account button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(26.dp))
                        .background(
                            if (!passwordsMatch && confirmPassword.isNotEmpty()) Ink.copy(alpha = 0.4f)
                            else Ink
                        )
                        .clickable(enabled = !uiState.isLoading && (confirmPassword.isEmpty() || passwordsMatch)) {
                            viewModel.signUp(email, password, name, org)
                        },
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            color = Parchment,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp)
                        )
                    } else {
                        Text("Create account", color = Parchment, fontSize = 15.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.8.sp)
                    }
                }

                Spacer(Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text("Already have an account?  ", color = Muted, fontSize = 13.sp)
                    Text(
                        text = "Sign in",
                        color = Gold,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onBack() }
                    )
                }

                Spacer(Modifier.height(40.dp))
            }
        }
    }
}
