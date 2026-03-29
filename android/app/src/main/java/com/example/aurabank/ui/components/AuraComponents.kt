package com.example.aurabank.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// ── Shared brand palette ───────────────────────────────────────────────────
val Parchment = Color(0xFFF7F4EF)
val Ink       = Color(0xFF1C1A16)
val Gold      = Color(0xFFC9A84C)
val Muted     = Color(0xFF8A8070)
val LineIdle  = Color(0xFFD4C9B4)

// ── Scene element data ─────────────────────────────────────────────────────

private data class CloudData(
    val startX: Float,  // initial x as fraction of width
    val yFrac: Float,   // y as fraction of height
    val speed: Float,   // drift speed (fraction of width per second)
    val scale: Float    // size multiplier
)

private data class StarData(
    val xFrac: Float,
    val yFrac: Float,
    val phase: Float
)

private data class FireflyData(
    val xFrac: Float,
    val phase: Float,
    val speed: Float,
    val driftPhase: Float
)

// ── Pixel nature scene animation ───────────────────────────────────────────
//
// Calm golden-hour landscape:
//   sky gradient → twinkling stars → glowing sun with pixel rays →
//   drifting pixel clouds → rolling hills → pixel trees → fireflies

@Composable
fun CozyParticleAnimation(modifier: Modifier = Modifier) {

    val clouds = remember {
        listOf(
            CloudData(0.04f, 0.17f, 0.018f, 1.00f),
            CloudData(0.50f, 0.09f, 0.010f, 0.65f),
            CloudData(0.76f, 0.22f, 0.013f, 0.80f)
        )
    }
    val stars = remember {
        listOf(
            StarData(0.10f, 0.06f, 0.00f),
            StarData(0.27f, 0.13f, 0.40f),
            StarData(0.49f, 0.04f, 0.70f),
            StarData(0.59f, 0.16f, 0.20f),
            StarData(0.20f, 0.19f, 0.55f)
        )
    }
    val fireflies = remember {
        val phi = 0.6180339887f
        List(9) { i ->
            FireflyData(
                xFrac      = (i * phi) % 1f,
                phase      = (i * 0.17f) % 1f,
                speed      = 0.022f + (i % 4) * 0.006f,
                driftPhase = i * 0.23f
            )
        }
    }

    var time by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) {
        val start = System.currentTimeMillis()
        while (true) {
            time = System.currentTimeMillis() - start
            delay(16L)
        }
    }

    Canvas(modifier = modifier) {
        val t  = time / 1000f
        val w  = size.width
        val h  = size.height
        val px = w / 88f   // 1 "pixel" unit ≈ 1/88th of screen width

        // ── Sky ──────────────────────────────────────────────────────────
        drawRect(
            brush = Brush.verticalGradient(
                colorStops = arrayOf(
                    0.00f to Color(0xFFCCA050),
                    0.30f to Color(0xFFDFBB78),
                    0.62f to Color(0xFFEDD9A8),
                    0.85f to Color(0xFFF3EAD4),
                    1.00f to Color(0xFFF7F4EF)
                )
            )
        )

        // ── Twinkling stars ───────────────────────────────────────────────
        stars.forEach { star ->
            val twinkle = (sin((t * 1.1f + star.phase * 7f) * PI).toFloat() * 0.5f + 0.5f)
            val alpha   = twinkle * 0.55f + 0.15f
            val sx = w * star.xFrac
            val sy = h * star.yFrac
            drawRect(
                color    = Color(0xFFFFF5C8).copy(alpha = alpha),
                topLeft  = Offset(sx - px * 0.8f, sy - px * 0.8f),
                size     = Size(px * 1.6f, px * 1.6f)
            )
        }

        // ── Sun ───────────────────────────────────────────────────────────
        val sunCx  = w * 0.76f
        val sunCy  = h * 0.19f
        val sn     = px * 6f
        val pulse  = sin(t * 0.7) .toFloat() * 0.04f + 0.96f

        // Outer halo
        drawCircle(
            brush  = Brush.radialGradient(
                listOf(Color(0xFFFFD870).copy(alpha = 0.20f * pulse), Color.Transparent),
                center = Offset(sunCx, sunCy), radius = sn * 4.2f
            ),
            radius = sn * 4.2f, center = Offset(sunCx, sunCy)
        )
        // Inner glow
        drawCircle(
            brush  = Brush.radialGradient(
                listOf(Color(0xFFFFEA98).copy(alpha = 0.45f * pulse), Color.Transparent),
                center = Offset(sunCx, sunCy), radius = sn * 2.2f
            ),
            radius = sn * 2.2f, center = Offset(sunCx, sunCy)
        )
        // Sun body (pixel square)
        drawRect(
            color   = Color(0xFFF5C840),
            topLeft = Offset(sunCx - sn / 2f, sunCy - sn / 2f),
            size    = Size(sn, sn)
        )
        // 8 pixel rays
        val rayDist = sn * 1.55f
        val rayS    = px * 2f
        for (i in 0 until 8) {
            val rad = i * PI / 4.0
            val rx  = (sunCx + cos(rad) * rayDist - rayS / 2).toFloat()
            val ry  = (sunCy + sin(rad) * rayDist - rayS / 2).toFloat()
            drawRect(
                color   = Color(0xFFF5C840).copy(alpha = 0.72f),
                topLeft = Offset(rx, ry),
                size    = Size(rayS, rayS)
            )
        }

        // ── Drifting pixel clouds ─────────────────────────────────────────
        clouds.forEach { cloud ->
            // wrap: 0.0 → 1.1, then reset to -0.1
            val cx = ((cloud.startX + t * cloud.speed) % 1.1f - 0.05f) * w
            val cy = h * cloud.yFrac
            val cs = px * cloud.scale * 2.8f  // one cloud "pixel"

            // Each cloud is a small grid of pixel squares
            // Layout (grid coords, 1 unit = cs):
            //   row -1: . . [3] [3] . .
            //   row  0: . [2] [2] [2] [2] .
            //   row +1: [1] [1] [1] [1] [1] [1]
            fun cp(col: Float, row: Float, w2: Float = 1f, h2: Float = 1f) =
                drawRect(
                    color   = Color(0xFFFFF8EC).copy(alpha = 0.84f),
                    topLeft = Offset(cx + col * cs, cy + row * cs),
                    size    = Size(cs * w2 + 0.5f, cs * h2 + 0.5f)
                )
            cp(0f,  1f, 6f, 1f)
            cp(1f,  0f, 4f, 1f)
            cp(2f, -1f, 2f, 1f)
        }

        // ── Rolling back hills ────────────────────────────────────────────
        val hillBase = h * 0.68f
        val backHillPath = Path().apply {
            moveTo(0f, h)
            lineTo(0f, hillBase)
            lineTo(w * 0.06f, hillBase - h * 0.07f)
            lineTo(w * 0.14f, hillBase - h * 0.16f)
            lineTo(w * 0.22f, hillBase - h * 0.22f)
            lineTo(w * 0.30f, hillBase - h * 0.24f)
            lineTo(w * 0.38f, hillBase - h * 0.18f)
            lineTo(w * 0.45f, hillBase - h * 0.10f)
            lineTo(w * 0.52f, hillBase - h * 0.13f)
            lineTo(w * 0.60f, hillBase - h * 0.22f)
            lineTo(w * 0.68f, hillBase - h * 0.28f)
            lineTo(w * 0.76f, hillBase - h * 0.24f)
            lineTo(w * 0.84f, hillBase - h * 0.14f)
            lineTo(w * 0.92f, hillBase - h * 0.06f)
            lineTo(w * 1.00f, hillBase)
            lineTo(w, h)
            close()
        }
        drawPath(backHillPath, Color(0xFF8DAA6A))

        // Darker accent strip along the top edge of back hills
        val rimPath = Path().apply {
            moveTo(0f, hillBase)
            lineTo(w * 0.06f, hillBase - h * 0.07f)
            lineTo(w * 0.14f, hillBase - h * 0.16f)
            lineTo(w * 0.22f, hillBase - h * 0.22f)
            lineTo(w * 0.30f, hillBase - h * 0.24f)
            lineTo(w * 0.38f, hillBase - h * 0.18f)
            lineTo(w * 0.45f, hillBase - h * 0.10f)
            lineTo(w * 0.52f, hillBase - h * 0.13f)
            lineTo(w * 0.60f, hillBase - h * 0.22f)
            lineTo(w * 0.68f, hillBase - h * 0.28f)
            lineTo(w * 0.76f, hillBase - h * 0.24f)
            lineTo(w * 0.84f, hillBase - h * 0.14f)
            lineTo(w * 0.92f, hillBase - h * 0.06f)
            lineTo(w * 1.00f, hillBase)
            // thicken downward by a few px
            lineTo(w * 1.00f, hillBase + px * 2f)
            lineTo(w * 0.92f, hillBase - h * 0.06f + px * 2f)
            lineTo(w * 0.84f, hillBase - h * 0.14f + px * 2f)
            lineTo(w * 0.76f, hillBase - h * 0.24f + px * 2f)
            lineTo(w * 0.68f, hillBase - h * 0.28f + px * 2f)
            lineTo(w * 0.60f, hillBase - h * 0.22f + px * 2f)
            lineTo(w * 0.52f, hillBase - h * 0.13f + px * 2f)
            lineTo(w * 0.45f, hillBase - h * 0.10f + px * 2f)
            lineTo(w * 0.38f, hillBase - h * 0.18f + px * 2f)
            lineTo(w * 0.30f, hillBase - h * 0.24f + px * 2f)
            lineTo(w * 0.22f, hillBase - h * 0.22f + px * 2f)
            lineTo(w * 0.14f, hillBase - h * 0.16f + px * 2f)
            lineTo(w * 0.06f, hillBase - h * 0.07f + px * 2f)
            lineTo(0f, hillBase + px * 2f)
            close()
        }
        drawPath(rimPath, Color(0xFF6B8A50))

        // ── Front hill ────────────────────────────────────────────────────
        val frontBase = h * 0.80f
        val frontPath = Path().apply {
            moveTo(0f, h)
            lineTo(0f, frontBase)
            lineTo(w * 0.12f, frontBase - h * 0.04f)
            lineTo(w * 0.28f, frontBase - h * 0.10f)
            lineTo(w * 0.42f, frontBase - h * 0.16f)
            lineTo(w * 0.54f, frontBase - h * 0.19f)
            lineTo(w * 0.65f, frontBase - h * 0.15f)
            lineTo(w * 0.78f, frontBase - h * 0.07f)
            lineTo(w * 0.90f, frontBase - h * 0.02f)
            lineTo(w * 1.00f, frontBase)
            lineTo(w, h)
            close()
        }
        drawPath(frontPath, Color(0xFF6B8A52))

        // ── Ground ────────────────────────────────────────────────────────
        drawRect(
            color   = Color(0xFF597040),
            topLeft = Offset(0f, h * 0.87f),
            size    = Size(w, h * 0.13f)
        )

        // ── Pixel trees ───────────────────────────────────────────────────
        fun drawTree(tx: Float, ty: Float, th: Float) {
            val tw   = th * 0.13f
            val trH  = th * 0.36f
            // Trunk
            drawRect(Color(0xFF7A5230), Offset(tx - tw / 2f, ty - trH), Size(tw, trH))
            // Three canopy layers (wide at bottom, narrow at top)
            val canopyLayers = listOf(
                Triple(0.52f, 0.30f, Color(0xFF4A7A38)),
                Triple(0.36f, 0.26f, Color(0xFF4A7A38)),
                Triple(0.20f, 0.20f, Color(0xFF5C9848))
            )
            var yOff = trH
            canopyLayers.forEach { (widthFrac, heightFrac, color) ->
                val lw = th * widthFrac
                val lh = th * heightFrac
                yOff += lh - px * 1.5f
                drawRect(color, Offset(tx - lw / 2f, ty - yOff), Size(lw, lh))
            }
        }

        // Left tree (on back hill peak area)
        drawTree(w * 0.17f, h * 0.600f, h * 0.20f)
        // Right tree (smaller, further right)
        drawTree(w * 0.83f, h * 0.610f, h * 0.15f)
        // Tiny tree on front hill
        drawTree(w * 0.56f, h * 0.720f, h * 0.10f)

        // ── Fireflies ─────────────────────────────────────────────────────
        fireflies.forEach { ff ->
            val cycle = (t * ff.speed + ff.phase) % 1f
            val ffX   = w * ff.xFrac +
                sin((cycle * 2f * PI * 1.3 + ff.driftPhase * 5.0).toFloat() * 1f) * px * 9f
            // Rise from ground level to about mid-screen
            val ffY   = h * 0.89f - cycle * h * 0.52f

            val fadeFrac = 0.12f
            val alpha = 0.70f *
                minOf(1f, cycle / fadeFrac) *
                minOf(1f, (1f - cycle) / fadeFrac)
            if (alpha <= 0f) return@forEach

            // Soft glow
            drawCircle(
                brush  = Brush.radialGradient(
                    listOf(Color(0xFFCCE855).copy(alpha = alpha * 0.38f), Color.Transparent),
                    center = Offset(ffX, ffY), radius = px * 5.5f
                ),
                radius = px * 5.5f, center = Offset(ffX, ffY)
            )
            // Pixel body
            drawRect(
                color   = Color(0xFFCCE855).copy(alpha = alpha),
                topLeft = Offset(ffX - px, ffY - px),
                size    = Size(px * 2f, px * 2f)
            )
        }
    }
}

// ── Underline input field ──────────────────────────────────────────────────

@Composable
fun AuraInput(
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
