package com.example.aurabank.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String,
    val org: String = "",
    @SerialName("total_aura") val totalAura: Long,
    @SerialName("debt_aura") val debtAura: Long = 0
)
