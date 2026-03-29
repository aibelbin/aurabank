package com.example.aurabank.ui.auth

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseInOutSine
import androidx.compose.animation.core.EaseOutCubic
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ── Palette ────────────────────────────────────────────────────────────────
private val Parchment = Color(0xFFF7F4EF)
private val Ink       = Color(0xFF1C1A16)
private val Gold      = Color(0xFFC9A84C)
private val Muted     = Color(0xFF8A8070)
private val LineIdle  = Color(0xFFD4C9B4)

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    var email           by remember { mutableStateOf("") }
    var password        by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Entrance animations
    val titleAlpha  = remember { Animatable(0f) }
    val titleSlide  = remember { Animatable(20f) }
    val formAlpha   = remember { Animatable(0f) }
    val formSlide   = remember { Animatable(28f) }

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

            // ── Animated orb (top ~32%) ────────────────────────────────────
            OrbAnimation(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(screenHeight * 0.32f)
            )

            Spacer(Modifier.height(28.dp))

            // ── Title block ────────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 36.dp)
                    .alpha(titleAlpha.value)
                    .offset(y = titleSlide.value.dp)
            ) {
                Text(
                    text = "Aura",
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink,
                    letterSpacing = (-1.5).sp
                )
                Text(
                    text = "Bank",
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Light,
                    color = Gold,
                    letterSpacing = (-1.5).sp,
                    modifier = Modifier.offset(y = (-10).dp)
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Your social currency",
                    fontSize = 13.sp,
                    color = Muted,
                    letterSpacing = 0.4.sp
                )
            }

            Spacer(Modifier.height(36.dp))

            // ── Form ───────────────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 36.dp)
                    .alpha(formAlpha.value)
                    .offset(y = formSlide.value.dp)
            ) {
                AuraInput(
                    value = email,
                    onValueChange = { email = it },
                    label = "EMAIL",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )

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

                Spacer(Modifier.height(4.dp))

                Text(
                    text = "Forgot password?",
                    color = Muted,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .align(Alignment.End)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {}
                )

                Spacer(Modifier.height(32.dp))

                // Primary sign-in button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(26.dp))
                        .background(Ink)
                        .clickable { onLoginSuccess() },
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Sign in",
                        color = Parchment,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 0.8.sp
                    )
                }

                Spacer(Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text("New here?  ", color = Muted, fontSize = 13.sp)
                    Text(
                        text = "Create account",
                        color = Gold,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {}
                    )
                }

                Spacer(Modifier.height(40.dp))
            }
        }
    }
}

// ── Breathing orb with pulsing rings ──────────────────────────────────────

@Composable
private fun OrbAnimation(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "orb")

    // Three staggered pulse rings
    val r1 by transition.animateFloat(
        0.38f, 1f,
        infiniteRepeatable(tween(3200, easing = EaseInOutSine), RepeatMode.Restart),
        label = "r1"
    )
    val a1 by transition.animateFloat(
        0.55f, 0f,
        infiniteRepeatable(tween(3200, easing = EaseInOutSine), RepeatMode.Restart),
        label = "a1"
    )
    val r2 by transition.animateFloat(
        0.38f, 1f,
        infiniteRepeatable(tween(3200, delayMillis = 1050, easing = EaseInOutSine), RepeatMode.Restart),
        label = "r2"
    )
    val a2 by transition.animateFloat(
        0.55f, 0f,
        infiniteRepeatable(tween(3200, delayMillis = 1050, easing = EaseInOutSine), RepeatMode.Restart),
        label = "a2"
    )
    val r3 by transition.animateFloat(
        0.38f, 1f,
        infiniteRepeatable(tween(3200, delayMillis = 2100, easing = EaseInOutSine), RepeatMode.Restart),
        label = "r3"
    )
    val a3 by transition.animateFloat(
        0.55f, 0f,
        infiniteRepeatable(tween(3200, delayMillis = 2100, easing = EaseInOutSine), RepeatMode.Restart),
        label = "a3"
    )
    // Core breathe
    val core by transition.animateFloat(
        0.90f, 1.10f,
        infiniteRepeatable(tween(2600, easing = EaseInOutSine), RepeatMode.Reverse),
        label = "core"
    )

    Canvas(modifier = modifier) {
        val cx = size.width / 2f
        val cy = size.height / 2f
        val maxR = minOf(size.width, size.height) * 0.36f

        // Ambient background glow
        drawCircle(
            brush = Brush.radialGradient(
                listOf(Gold.copy(alpha = 0.07f), Color.Transparent),
                center = Offset(cx, cy),
                radius = maxR * 2f
            ),
            radius = maxR * 2f,
            center = Offset(cx, cy)
        )

        // Pulsing rings
        for ((scale, alpha) in listOf(r1 to a1, r2 to a2, r3 to a3)) {
            drawCircle(
                color = Gold.copy(alpha = alpha * 0.30f),
                radius = maxR * scale,
                center = Offset(cx, cy),
                style = Stroke(width = 1.2f)
            )
        }

        // Soft glow halo around core
        drawCircle(
            brush = Brush.radialGradient(
                listOf(
                    Gold.copy(alpha = 0.40f),
                    Gold.copy(alpha = 0.10f),
                    Color.Transparent
                ),
                center = Offset(cx, cy),
                radius = maxR * 0.30f * core
            ),
            radius = maxR * 0.30f * core,
            center = Offset(cx, cy)
        )

        // Solid core orb
        drawCircle(
            color = Gold.copy(alpha = 0.88f),
            radius = maxR * 0.13f * core,
            center = Offset(cx, cy)
        )

        // Specular highlight
        drawCircle(
            color = Color.White.copy(alpha = 0.45f),
            radius = maxR * 0.045f * core,
            center = Offset(cx - maxR * 0.045f, cy - maxR * 0.045f)
        )
    }
}

// ── Underline text input ───────────────────────────────────────────────────

@Composable
private fun AuraInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingContent: @Composable (() -> Unit)? = null
) {
    var focused by remember { mutableStateOf(false) }

    val lineColor by animateColorAsState(
        targetValue = if (focused) Gold else LineIdle,
        animationSpec = tween(220),
        label = "line_$label"
    )
    val labelColor by animateColorAsState(
        targetValue = if (focused || value.isNotEmpty()) Gold else Muted,
        animationSpec = tween(220),
        label = "label_$label"
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = labelColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 1.5.sp
        )
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier
                    .weight(1f)
                    .onFocusChanged { focused = it.isFocused },
                textStyle = TextStyle(
                    color = Ink,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Normal,
                    letterSpacing = 0.2.sp
                ),
                keyboardOptions = keyboardOptions,
                visualTransformation = visualTransformation,
                singleLine = true,
                cursorBrush = SolidColor(Gold)
            ) { it() }

            if (trailingContent != null) {
                Spacer(Modifier.width(10.dp))
                trailingContent()
            }
        }
        Spacer(Modifier.height(8.dp))
        HorizontalDivider(color = lineColor, thickness = 1.dp)
        Spacer(Modifier.height(20.dp))
    }
}
