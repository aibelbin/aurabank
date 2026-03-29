package com.example.aurabank.di

import com.example.aurabank.data.remote.supabaseClient
import com.example.aurabank.data.repository.AuthRepository
import com.example.aurabank.data.repository.BankRepository
import com.example.aurabank.data.repository.TransactionRepository
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest

object AppModule {
    val authRepository by lazy { AuthRepository(supabaseClient.auth) }
    val bankRepository by lazy { BankRepository(supabaseClient.postgrest) }
    val transactionRepository by lazy { TransactionRepository(supabaseClient.postgrest) }
}
