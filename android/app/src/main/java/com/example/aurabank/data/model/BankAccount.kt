package com.example.aurabank.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BankAccount(
    val id: String,
    val name: String,
    @SerialName("total_aura") val totalAura: Long,
    @SerialName("aura_debt") val auraDebt: Long = 0,
    @SerialName("user_id") val userId: String
)
