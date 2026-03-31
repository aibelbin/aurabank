package com.example.aurabank.ui.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.*
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlin.math.*

// ── Palette (exact SVG hex values) ──────────────────────────────────────────
private val BG      = Color(0xFFD2BFB2)
private val WHITE   = Color(0xFFFFFFFF)
private val SCREEN  = Color(0xFFE3CA91)
private val COFFEE  = Color(0xFFB38D54)
private val DARK    = Color(0xFF47231F)
private val BLUSH   = Color(0xFFE688A4)
private val SHIMMER = Color(0xFFE3E3E3)

// ── Easing curves extracted from SVG cubic-bezier values ────────────────────
private val EaseOutBack    = CubicBezierEasing(0.175f, 0.885f, 0.320f, 1.275f)
private val EaseInOut45    = CubicBezierEasing(0.445f, 0.050f, 0.550f, 0.950f)
private val EaseOutCubic   = CubicBezierEasing(0.075f, 0.820f, 0.165f, 1.000f)
private val EaseAnticipate = CubicBezierEasing(0.600f, -0.28f, 0.735f, 0.045f)
private val EaseSlowFast   = CubicBezierEasing(0.600f, 0.040f, 0.980f, 0.335f)
private val EaseStrongIn   = CubicBezierEasing(0.950f, 0.050f, 0.795f, 0.035f)
private val EaseBounce     = CubicBezierEasing(0.470f, 0.000f, 0.745f, 0.715f)
private val EaseFlatStart  = CubicBezierEasing(0.530f, 0.760f, 0.990f, 0.245f)
private val EaseSoftIn     = CubicBezierEasing(0.215f, 0.610f, 0.355f, 1.000f)

// ── SplashScreen ─────────────────────────────────────────────────────────────
// Faithfully recreates the SVGator coffee splash animation.
// Loops indefinitely; call onFinished externally to navigate away.
@Composable
fun SplashScreen(onFinished: () -> Unit = {}) {

    // Each Animatable corresponds to one animated property from the SVG.
    val charY    = remember { Animatable(1f) }   // 1=off-screen-below, 0=rest, <0=above-rest
    val charRot  = remember { Animatable(0f) }   // degrees, matches eAOImkLDEno16 "r" keys
    val coffeeF  = remember { Animatable(0f) }   // 0..1 fill fraction, derived from eAOImkLDEno12 Y
    val faceA    = remember { Animatable(0f) }   // eAOImkLDEno17 opacity
    val eyeA     = remember { Animatable(1f) }   // eAOImkLDEno21 opacity (blink)
    val eyeShift = remember { Animatable(0f) }   // -1=left, 0=center, +1=right (eAOImkLDEno21 X)
    val mouthF   = remember { Animatable(0f) }   // 0=flat/neutral, 1=smile-up (eAOImkLDEno24 morph)
    val burstA   = remember { Animatable(0f) }   // eAOImkLDEno32 opacity
    val burst1S  = remember { Animatable(0f) }   // eAOImkLDEno32 scale, 0..1 normalized
    val burst2S  = remember { Animatable(0f) }   // eAOImkLDEno33 scale, 0..1 normalized

    LaunchedEffect(Unit) {
        // ── Reset to start-of-cycle values ──────────────────────────────────
        charY.snapTo(1f);    charRot.snapTo(0f)
        coffeeF.snapTo(0f);  faceA.snapTo(0f)
        eyeA.snapTo(1f);     eyeShift.snapTo(0f)
        mouthF.snapTo(0f);   burstA.snapTo(0f)
        burst1S.snapTo(0f);  burst2S.snapTo(0f)

        // ── Run one 2340 ms cycle, all tracks in parallel ────────────────────
        coroutineScope {

                // charY — character rises from below screen, then subtle bounce
                // SVG eAOImkLDEno16 "o" y-values, mapped: 702.84=rest(0), 332.14=above(-3.7 raw)
                // Visually the character enters from below and overshoots, then settles.
                launch {
                    charY.animateTo(0.04f, keyframes {
                        durationMillis = 2340
                        1.00f  at 0    using EaseOutCubic   // off-screen below
                        -0.04f at 400                        // overshoots (springy arrival)
                        0.18f  at 600  using LinearEasing    // dips back down
                        0.04f  at 1050 using EaseSoftIn      // gentle settle
                        -0.07f at 1350 using LinearEasing    // small bob up
                        0.04f  at 1500 using EaseOutBack     // final settle with spring
                        0.04f  at 2340
                    })
                }

                // charRot — head tilt during entry and expression play
                // SVG eAOImkLDEno16 "r" keyframes (degrees)
                launch {
                    charRot.animateTo(0f, keyframes {
                        durationMillis = 2340
                        0f        at 0    using EaseAnticipate
                        -18f      at 280                          // harder left snap
                        -18f      at 360  using LinearEasing
                        22f       at 560  using LinearEasing      // whip right
                        -14f      at 720  using LinearEasing      // back left
                        16f       at 870  using LinearEasing      // right again
                        0f        at 1000 using EaseOutBack       // settle upright
                        0f        at 2340
                    })
                }

                // coffeeF — coffee fill rises; derived from eAOImkLDEno12 Y translation
                // SVG: yMax=1569 (empty) → yMin=1207 (full), normalised as 0→1
                launch {
                    coffeeF.animateTo(1f, keyframes {
                        durationMillis = 2340
                        0f    at 0    using EaseOutBack    // start empty
                        0.948f at 400                       // near-full on entry
                        0.649f at 790  using EaseSlowFast  // brief dip
                        1f    at 1050 using LinearEasing   // fully filled
                        1f    at 2340
                    })
                }

                // faceA — whole face/mouth group opacity (eAOImkLDEno17)
                launch {
                    faceA.animateTo(0f, keyframes {
                        durationMillis = 2340
                        0f at 200  using LinearEasing
                        1f at 400  using LinearEasing
                        1f at 1600 using LinearEasing
                        0f at 1700 using LinearEasing
                        0f at 2340
                    })
                }

                // eyeA — blink (eAOImkLDEno21 opacity)
                launch {
                    eyeA.animateTo(1f, keyframes {
                        durationMillis = 2340
                        1f at 460 using LinearEasing
                        0f at 510 using LinearEasing  // eyes close (blink)
                        0f at 740 using LinearEasing
                        1f at 790 using LinearEasing  // eyes open
                        1f at 2340
                    })
                }

                // eyeShift — eyes look left then right (eAOImkLDEno21 X translation)
                // SVG: center=555, left=453 (Δ=-102), right=657 (Δ=+102)  → normalized ±1
                launch {
                    eyeShift.animateTo(0f, keyframes {
                        durationMillis = 2340
                        0f  at 400 using LinearEasing   // centered
                        -1f at 510 using LinearEasing   // look left
                        1f  at 650 using LinearEasing   // look right
                        1f  at 790 using LinearEasing   // hold right
                        0f  at 1000 using LinearEasing  // back to center
                        0f  at 2340
                    })
                }

                // mouthF — smile morph (eAOImkLDEno24 path d interpolation)
                // 0 = neutral / frown-ish closed, 1 = smile up (happy)
                launch {
                    mouthF.animateTo(0f, keyframes {
                        durationMillis = 2340
                        0f at 210  using EaseStrongIn  // neutral small shape
                        1f at 400  using LinearEasing  // big smile on entry
                        1f at 1050 using EaseOutBack   // hold smile
                        0f at 1140 using LinearEasing  // back to neutral
                        0f at 2340
                    })
                }

                // burstA — dark burst circle opacity (eAOImkLDEno32)
                launch {
                    burstA.animateTo(1f, keyframes {
                        durationMillis = 2340
                        0f at 1080 using LinearEasing
                        1f at 1180 using LinearEasing
                        1f at 2340
                    })
                }

                // burst1S — dark burst circle scale (eAOImkLDEno32 matrix scale)
                // SVG: 1.82 → 182 (×100) between t=1600 and t=2050
                // Normalized to 0..1 where 1 = screen-filling radius
                launch {
                    burst1S.animateTo(1f, keyframes {
                        durationMillis = 2340
                        0f    at 1140 using EaseInOut45  // start tiny
                        1f    at 2050                     // fully expanded
                        1f    at 2340
                    })
                }

                // burst2S — cream overlay circle (eAOImkLDEno33)
                // Covers the dark burst with screen color, completes the loop wipe
                launch {
                    burst2S.animateTo(1f, keyframes {
                        durationMillis = 2340
                        0f at 1750 using EaseInOut45  // starts after dark burst
                        1f at 2340                     // fills entire screen by loop end
                    })
                }
        }
        // Single cycle done — navigate away
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BG)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val W = size.width
            val H = size.height

            // ── Phone body ──────────────────────────────────────────────────
            val phoneW  = W * 0.70f
            val phoneH  = H * 0.72f
            val phoneL  = (W - phoneW) / 2f
            val phoneT  = (H - phoneH) / 2f - H * 0.02f
            val phoneCR = phoneW * 0.088f

            drawRoundRect(
                color = WHITE,
                topLeft = Offset(phoneL, phoneT),
                size = Size(phoneW, phoneH),
                cornerRadius = CornerRadius(phoneCR)
            )
            // Home bar
            drawRoundRect(
                color = Color(0xFFCCCCCC),
                topLeft = Offset(W / 2f - phoneW * 0.12f, phoneT + phoneH * 0.957f),
                size = Size(phoneW * 0.24f, phoneH * 0.009f),
                cornerRadius = CornerRadius(100f)
            )
            // Front camera
            drawCircle(
                color = Color(0xFFCCCCCC),
                radius = phoneW * 0.024f,
                center = Offset(W / 2f, phoneT + phoneH * 0.025f)
            )

            // ── Screen ──────────────────────────────────────────────────────
            val scrnPad = phoneW * 0.048f
            val scrnL   = phoneL + scrnPad
            val scrnT   = phoneT + phoneH * 0.052f
            val scrnW   = phoneW - scrnPad * 2f
            val scrnH   = phoneH * 0.888f
            val scrnCR  = phoneCR * 0.65f

            drawRoundRect(
                color = SCREEN,
                topLeft = Offset(scrnL, scrnT),
                size = Size(scrnW, scrnH),
                cornerRadius = CornerRadius(scrnCR)
            )

            // ── Character group ──────────────────────────────────────────────
            // charY = 1  → character center is one cupHeight below the screen bottom (off screen)
            // charY = 0  → character at its natural resting position inside screen
            val cupW   = scrnW * 0.58f
            val cupH   = scrnH * 0.44f
            val cupCx  = scrnL + scrnW / 2f
            val cupRestCy = scrnT + scrnH * 0.60f

            val charYOffset = charY.value * cupH * 1.6f
            val charCy = cupRestCy + charYOffset

            withTransform({
                rotate(charRot.value, Offset(cupCx, charCy))
            }) {

                val cupL  = cupCx - cupW / 2f
                val cupT  = charCy - cupH * 0.35f
                val cupCR = cupW * 0.095f

                // ── Cup body path (rounded rect with larger bottom radius) ──
                val cupPath = Path().apply {
                    val r   = cupCR
                    val rb  = cupW * 0.48f     // large bottom radius for mug shape
                    val l   = cupL
                    val t   = cupT
                    val rg  = cupL + cupW
                    val bot = cupT + cupH
                    moveTo(l + r, t)
                    lineTo(rg - r, t)
                    quadraticTo(rg, t, rg, t + r)
                    lineTo(rg, bot - rb)
                    quadraticTo(rg, bot, rg - rb, bot)
                    lineTo(l + rb, bot)
                    quadraticTo(l, bot, l, bot - rb)
                    lineTo(l, t + r)
                    quadraticTo(l, t, l + r, t)
                    close()
                }

                // White cup base
                drawPath(cupPath, WHITE)

                // Coffee fill — clipped to cup, rises from bottom
                clipPath(cupPath) {
                    val fillH   = cupH * coffeeF.value
                    val fillTop = cupT + cupH - fillH
                    drawRect(COFFEE, Offset(cupL, fillTop), Size(cupW, fillH))

                    // Wave foam at the surface of coffee fill
                    if (coffeeF.value > 0.04f) {
                        val wY  = fillTop
                        val amp = cupH * 0.022f
                        val foamPath = Path().apply {
                            moveTo(cupL, wY)
                            val segs = 6
                            val sw   = cupW / segs
                            repeat(segs) { i ->
                                val px = cupL + sw * i + sw * 0.5f
                                val py = wY + if (i % 2 == 0) -amp else amp
                                quadraticTo(px, py, cupL + sw * (i + 1), wY)
                            }
                            lineTo(cupL + cupW, wY + cupH * 0.045f)
                            lineTo(cupL, wY + cupH * 0.045f)
                            close()
                        }
                        drawPath(foamPath, Color(0xFFC9A870))
                    }
                }

                // ── Mug handle ───────────────────────────────────────────────
                val hcx = cupL + cupW + cupW * 0.055f
                val hcy = cupT + cupH * 0.48f
                val hrx = cupW * 0.135f
                val hry = cupH * 0.265f
                val hStroke = cupW * 0.065f
                drawOval(
                    color = WHITE,
                    topLeft = Offset(hcx - hrx, hcy - hry),
                    size = Size(hrx * 2f, hry * 2f),
                    style = Stroke(width = hStroke)
                )
                // Erase handle overlap with cup body using screen background color
                drawOval(
                    color = SCREEN,
                    topLeft = Offset(hcx - hrx + hStroke / 2f, hcy - hry + hStroke / 2f),
                    size = Size(hrx * 2f - hStroke, hry * 2f - hStroke),
                    style = Stroke(width = hStroke * 0.35f)
                )

                // ── Face (fades in after cup enters) ─────────────────────────
                val fa = faceA.value
                if (fa > 0.01f) {
                    val faceCy     = cupT + cupH * 0.38f
                    val eyeSpacing = cupW * 0.145f
                    val eyeR       = cupW * 0.048f
                    val eyeShiftPx = eyeShift.value * eyeSpacing * 0.55f
                    val ea         = eyeA.value * fa

                    // ── Eye arc highlight above both eyes (eAOImkLDEno19) ────
                    // A grey arc (like an eyelid highlight / eyebrow) that blinks
                    // The SVG path is an open semicircle M 22.46,15.78 C ... 69.78
                    // mapped and scaled to sit above each eye
                    if (ea > 0.01f) {
                        val arcH = eyeR * 1.4f
                        val arcW = eyeR * 2.2f
                        // Left arc
                        drawArc(
                            color = SHIMMER.copy(alpha = ea),
                            startAngle = 185f,
                            sweepAngle = -175f,
                            useCenter = false,
                            topLeft = Offset(
                                cupCx - eyeSpacing + eyeShiftPx - arcW / 2f,
                                faceCy - eyeR * 1.55f - arcH / 2f
                            ),
                            size = Size(arcW, arcH),
                            style = Stroke(width = eyeR * 0.48f, cap = StrokeCap.Round)
                        )
                        // Right arc
                        drawArc(
                            color = SHIMMER.copy(alpha = ea),
                            startAngle = 185f,
                            sweepAngle = -175f,
                            useCenter = false,
                            topLeft = Offset(
                                cupCx + eyeSpacing + eyeShiftPx - arcW / 2f,
                                faceCy - eyeR * 1.55f - arcH / 2f
                            ),
                            size = Size(arcW, arcH),
                            style = Stroke(width = eyeR * 0.48f, cap = StrokeCap.Round)
                        )
                    }

                    // ── Eyes (dark circles) ──────────────────────────────────
                    drawCircle(
                        DARK.copy(alpha = ea),
                        eyeR,
                        Offset(cupCx - eyeSpacing + eyeShiftPx, faceCy)
                    )
                    drawCircle(
                        DARK.copy(alpha = ea),
                        eyeR,
                        Offset(cupCx + eyeSpacing + eyeShiftPx, faceCy)
                    )

                    // ── Blush marks ──────────────────────────────────────────
                    val bR = eyeR * 1.12f
                    val bY = faceCy + eyeR * 1.1f
                    drawOval(
                        color = BLUSH.copy(alpha = fa * 0.72f),
                        topLeft = Offset(cupCx - eyeSpacing + eyeShiftPx - bR * 1.3f, bY - bR * 0.5f),
                        size = Size(bR * 2.2f, bR)
                    )
                    drawOval(
                        color = BLUSH.copy(alpha = fa * 0.72f),
                        topLeft = Offset(cupCx + eyeSpacing + eyeShiftPx - bR * 0.9f, bY - bR * 0.5f),
                        size = Size(bR * 2.2f, bR)
                    )

                    // ── Mouth (morphs between flat and smile) ─────────────────
                    // mouthF=0 → very subtle curve / neutral (eAOImkLDEno24 shape A)
                    // mouthF=1 → clear upward smile (shape B)
                    val ms     = mouthF.value
                    val mY     = faceCy + cupH * 0.105f
                    val mHalf  = cupW * 0.092f
                    val depth  = cupH * 0.062f * ms
                    val mPath  = Path().apply {
                        moveTo(cupCx - mHalf, mY)
                        cubicTo(
                            cupCx - mHalf * 0.15f, mY + depth,
                            cupCx + mHalf * 0.15f, mY + depth,
                            cupCx + mHalf,          mY
                        )
                    }
                    drawPath(
                        mPath,
                        DARK.copy(alpha = fa),
                        style = Stroke(width = eyeR * 0.6f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                    )
                }
            }

            // ── End-of-cycle burst wipe ──────────────────────────────────────
            // Dark circle (eAOImkLDEno32): expands from cup center, color #47231F
            // Cream circle (eAOImkLDEno33): follows to reset scene with screen color
            // Both expand to fully cover the canvas, creating a wipe-loop transition.
            val burstCx  = W / 2f
            val burstCy  = H * 0.44f
            val maxR     = sqrt(W * W + H * H) * 0.52f + W * 0.05f

            if (burst1S.value > 0f) {
                drawCircle(
                    color = DARK.copy(alpha = burstA.value),
                    radius = burst1S.value * maxR,
                    center = Offset(burstCx, burstCy)
                )
            }
            if (burst2S.value > 0f) {
                drawCircle(
                    color = WHITE,
                    radius = burst2S.value * maxR,
                    center = Offset(burstCx, burstCy)
                )
            }
        }
    }
}
