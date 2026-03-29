package com.example.aurabank.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Transaction(
    val id: Long,
    val name: String,
    @SerialName("submitter_id") val submitterId: String?,
    @SerialName("gainer_id") val gainerId: String?,
    @SerialName("loser_id") val loserId: String?,
    @SerialName("expected_aura") val expectedAura: Long,
    val description: String?,
    @SerialName("video_link") val videoLink: String?,
    val status: String
)
