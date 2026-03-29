package com.example.aurabank.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.aurabank.di.AppModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SignUpUiState(
    val isLoading: Boolean           = false,
    val error: String?               = null,
    val success: Boolean             = false,
    val awaitingConfirmation: Boolean = false  // email confirmation required
)

class SignUpViewModel(
    private val authRepository: com.example.aurabank.data.repository.AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SignUpUiState())
    val uiState: StateFlow<SignUpUiState> = _uiState.asStateFlow()

    fun signUp(email: String, password: String, name: String, org: String) {
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Name, email and password are required.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val sessionReady = authRepository.signUp(email, password, name, org)
                if (sessionReady) {
                    _uiState.update { it.copy(isLoading = false, success = true) }
                } else {
                    _uiState.update { it.copy(isLoading = false, awaitingConfirmation = true) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Sign up failed.") }
            }
        }
    }

    fun clearError() = _uiState.update { it.copy(error = null) }

    companion object {
        val Factory = viewModelFactory {
            initializer { SignUpViewModel(AppModule.authRepository) }
        }
    }
}
