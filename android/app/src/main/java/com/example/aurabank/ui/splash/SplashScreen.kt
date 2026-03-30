package com.example.aurabank.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.text.font.FontWeight
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.pow
import kotlin.math.sqrt

private val Background  = Color(0xFFD2BFB2)
private val PhoneBody   = Color(0xFFFFFFFF)
private val Screen      = Color(0xFFE3CA91)
private val CupBody     = Color(0xFFFFFFFF)
private val CoffeeFill  = Color(0xFFB38D54)
private val Foam        = Color(0xFFF0E0C0)
private val FaceColor   = Color(0xFF47231F)
private val Blush       = Color(0xFFE688A4)
private val Handle      = Color(0xFFD4C4A8)

@Composable
fun SplashScreen(onFinished: () -> Unit) {

    val enterScale      = remember { Animatable(0f) }
    val fillLevel       = remember { Animatable(0f) }
    val faceAlpha       = remember { Animatable(0f) }
    val steamPhase      = remember { Animatable(0f) }
    val dropCenterYFrac = remember { Animatable(0.58f) }
    val dropRadius      = remember { Animatable(0f) }

    var screenSize by remember { mutableStateOf(Size.Zero) }

    LaunchedEffect(Unit) {
        delay(100)

        // 1 — Phone bounces in
        launch {
            enterScale.animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessMedium
                )
            )
        }

        // 2 — Coffee fills (starts 250ms after entrance)
        delay(250)
        launch {
            fillLevel.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 1500, easing = FastOutSlowInEasing)
            )
        }

        // 3 — Face fades in once cup is mostly full (~1300ms total)
        delay(950)
        launch {
            faceAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 450)
            )
        }

        // 4 — Steam loops (~1700ms total)
        delay(400)
        launch {
            while (true) {
                steamPhase.snapTo(0f)
                steamPhase.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 1200, easing = LinearEasing)
                )
            }
        }

        // 5 — Drop transition (~2400ms total)
        delay(700)

        // Small drop flies up from cup area toward screen center
        launch {
            dropCenterYFrac.animateTo(
                targetValue = 0.43f,
                animationSpec = tween(durationMillis = 180, easing = FastOutSlowInEasing)
            )
        }

        // Slight overlap then blast open to fill screen
        delay(80)
        val targetRadius = if (screenSize != Size.Zero)
            sqrt(screenSize.width.pow(2) + screenSize.height.pow(2))
        else 2800f

        dropRadius.animateTo(
            targetValue = targetRadius,
            animationSpec = tween(durationMillis = 360, easing = FastOutSlowInEasing)
        )

        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
            .background(Background)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            screenSize = size

            if (enterScale.value <= 0.01f) return@Canvas

            val w  = size.width
            val h  = size.height
            val cx = w / 2f
            val cy = h * 0.43f

            withTransform({
                scale(enterScale.value, enterScale.value, pivot = Offset(cx, cy))
            }) {

                // ── Phone body ──────────────────────────────────────────────
                val phoneW = w * 0.62f
                val phoneH = h * 0.54f
                val phoneL = cx - phoneW / 2f
                val phoneT = cy - phoneH / 2f
                val phoneCorner = phoneW * 0.08f

                drawRoundRect(
                    color = PhoneBody,
                    topLeft = Offset(phoneL, phoneT),
                    size = Size(phoneW, phoneH),
                    cornerRadius = CornerRadius(phoneCorner)
                )

                // Home bar
                drawRoundRect(
                    color = Color(0xFFCCCCCC),
                    topLeft = Offset(cx - phoneW * 0.13f, phoneT + phoneH * 0.965f),
                    size = Size(phoneW * 0.26f, phoneH * 0.012f),
                    cornerRadius = CornerRadius(999f)
                )

                // ── Screen ──────────────────────────────────────────────────
                val screenPadX = phoneW * 0.055f
                val screenL    = phoneL + screenPadX
                val screenT    = phoneT + phoneH * 0.07f
                val screenW    = phoneW - screenPadX * 2f
                val screenH    = phoneH * 0.84f

                drawRoundRect(
                    color = Screen,
                    topLeft = Offset(screenL, screenT),
                    size = Size(screenW, screenH),
                    cornerRadius = CornerRadius(phoneCorner * 0.6f)
                )

                // ── Cup ─────────────────────────────────────────────────────
                val cupW  = screenW * 0.60f
                val cupH  = screenH * 0.44f
                val cupL  = screenL + (screenW - cupW) / 2f
                val cupT  = screenT + screenH * 0.28f
                val cupCR = cupW * 0.09f

                drawRoundRect(
                    color = CupBody,
                    topLeft = Offset(cupL, cupT),
                    size = Size(cupW, cupH),
                    cornerRadius = CornerRadius(cupCR)
                )

                // ── Coffee fill (clipped to cup) ─────────────────────────────
                val cf      = fillLevel.value
                val fillH   = cupH * cf
                val fillTop = cupT + cupH - fillH

                val cupClip = Path().apply {
                    addRoundRect(RoundRect(cupL, cupT, cupL + cupW, cupT + cupH, CornerRadius(cupCR)))
                }

                clipPath(cupClip) {
                    drawRect(CoffeeFill, Offset(cupL, fillTop), Size(cupW, fillH))

                    if (cf > 0.05f) {
                        val foamH = cupH * 0.06f
                        val foamPath = Path().apply {
                            moveTo(cupL, fillTop)
                            val segments = 6
                            val segW = cupW / segments
                            for (i in 0 until segments) {
                                val x1 = cupL + segW * i + segW * 0.5f
                                val y1 = fillTop + if (i % 2 == 0) -foamH * 0.5f else foamH * 0.5f
                                val x2 = cupL + segW * (i + 1)
                                quadraticTo(x1, y1, x2, fillTop)
                            }
                            lineTo(cupL + cupW, fillTop + foamH)
                            lineTo(cupL, fillTop + foamH)
                            close()
                        }
                        drawPath(foamPath, Foam)
                    }
                }

                // ── Handle ──────────────────────────────────────────────────
                drawArc(
                    color = Handle,
                    startAngle = -70f,
                    sweepAngle = 140f,
                    useCenter = false,
                    topLeft = Offset(cupL + cupW * 0.80f, cupT + cupH * 0.28f),
                    size = Size(cupW * 0.32f, cupH * 0.44f),
                    style = Stroke(width = cupW * 0.055f, cap = StrokeCap.Round)
                )

                // ── Face ────────────────────────────────────────────────────
                val fa = faceAlpha.value
                if (fa > 0f) {
                    val faceCx    = cupL + cupW / 2f
                    val faceCy    = cupT + cupH * 0.45f
                    val eyeSpacing = cupW * 0.14f
                    val eyeR      = cupW * 0.045f

                    // Left eye
                    drawCircle(FaceColor.copy(alpha = fa), eyeR, Offset(faceCx - eyeSpacing, faceCy))
                    drawCircle(Color.White.copy(alpha = fa), eyeR * 0.35f,
                        Offset(faceCx - eyeSpacing + eyeR * 0.3f, faceCy - eyeR * 0.3f))
                    // Right eye
                    drawCircle(FaceColor.copy(alpha = fa), eyeR, Offset(faceCx + eyeSpacing, faceCy))
                    drawCircle(Color.White.copy(alpha = fa), eyeR * 0.35f,
                        Offset(faceCx + eyeSpacing + eyeR * 0.3f, faceCy - eyeR * 0.3f))

                    // Smile
                    val smileW = cupW * 0.16f
                    val smileY = faceCy + cupH * 0.10f
                    val smilePath = Path().apply {
                        moveTo(faceCx - smileW / 2f, smileY)
                        cubicTo(
                            faceCx - smileW * 0.2f, smileY + cupH * 0.07f,
                            faceCx + smileW * 0.2f, smileY + cupH * 0.07f,
                            faceCx + smileW / 2f, smileY
                        )
                    }
                    drawPath(smilePath, FaceColor.copy(alpha = fa),
                        style = Stroke(width = cupW * 0.025f, cap = StrokeCap.Round))

                    // Blush
                    val blushW = cupW * 0.08f
                    val blushH = cupW * 0.05f
                    val blushY = faceCy + cupH * 0.06f
                    drawOval(Blush.copy(alpha = fa * 0.65f),
                        Offset(faceCx - eyeSpacing - blushW * 0.7f, blushY), Size(blushW, blushH))
                    drawOval(Blush.copy(alpha = fa * 0.65f),
                        Offset(faceCx + eyeSpacing - blushW * 0.3f, blushY), Size(blushW, blushH))
                }

                // ── Steam ────────────────────────────────────────────────────
                if (cf > 0.5f) {
                    val steamBase = cupT - cupH * 0.02f
                    val steamR    = cupW * 0.028f
                    for (i in 0 until 3) {
                        val phase  = (steamPhase.value + i * 0.333f) % 1f
                        val steamX = cupL + cupW * (0.35f + i * 0.15f)
                        val steamY = steamBase - phase * cupH * 0.35f
                        drawCircle(
                            color = Color.White.copy(alpha = (1f - phase) * 0.55f),
                            radius = steamR * (1f + phase * 0.4f),
                            center = Offset(steamX, steamY)
                        )
                    }
                }
            }

            // Punch a transparent hole that grows to reveal the login screen beneath.
            // CompositingStrategy.Offscreen on the parent Box makes BlendMode.Clear
            // actually cut through to transparent (and the NavHost shows through).
            if (dropRadius.value > 0f) {
                drawCircle(
                    color = Color.Black,
                    radius = dropRadius.value,
                    center = Offset(size.width / 2f, size.height * dropCenterYFrac.value),
                    blendMode = BlendMode.Clear
                )
            }
        }
    }
}
