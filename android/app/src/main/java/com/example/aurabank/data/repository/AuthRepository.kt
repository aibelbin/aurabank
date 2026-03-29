package com.example.aurabank.data.repository

import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class AuthRepository(
    private val auth: Auth,
    private val postgrest: Postgrest
) {
    // ── Sign in ────────────────────────────────────────────────────────────
    suspend fun signIn(email: String, password: String) {
        auth.signInWith(Email) {
            this.email    = email
            this.password = password
        }
    }

    // ── Sign up ────────────────────────────────────────────────────────────
    // Creates the Auth account, then writes a row to both `user` and `bank`
    // tables so the new user starts with 100 aura.
    // NOTE: requires RLS policies (or RLS disabled) that allow authenticated
    // inserts for the user's own row.
    suspend fun signUp(email: String, password: String, name: String, org: String): Boolean {
        auth.signUpWith(Email) {
            this.email    = email
            this.password = password
        }

        val userId = auth.currentUserOrNull()?.id

        return if (userId != null) {
            // Email confirmation is off — session is live, create rows immediately
            createUserRows(userId, name, org)
            true  // fully signed up
        } else {
            // Email confirmation is on — rows will be created on first sign-in
            false // confirmation email sent
        }
    }

    // Called after sign-in if the user row doesn't exist yet (first login after email confirm)
    suspend fun ensureUserRows(name: String, org: String) {
        val userId = auth.currentUserOrNull()?.id ?: return
        val existing = postgrest.from("user")
            .select { filter { eq("id", userId) } }
            .decodeSingleOrNull<com.example.aurabank.data.model.User>()
        if (existing == null) {
            createUserRows(userId, name, org)
        }
    }

    private suspend fun createUserRows(userId: String, name: String, org: String) {
        postgrest.from("user").insert(
            buildJsonObject {
                put("id",         userId)
                put("name",       name)
                put("org",        org)
                put("total_aura", 100)
            }
        )
        postgrest.from("bank").insert(
            buildJsonObject {
                put("name",       name)
                put("user_id",    userId)
                put("total_aura", 100)
            }
        )
    }

    // ── Session ────────────────────────────────────────────────────────────
    fun currentSession() = auth.currentSessionOrNull()
}
