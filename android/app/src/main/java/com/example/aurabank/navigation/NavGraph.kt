package com.example.aurabank.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.aurabank.di.AppModule
import com.example.aurabank.ui.auth.LoginScreen
import com.example.aurabank.ui.auth.SignUpScreen
import com.example.aurabank.ui.home.HomeScreen
import com.example.aurabank.ui.submit.SubmitScreen

sealed class Screen(val route: String) {
    object Login  : Screen("login")
    object SignUp : Screen("signup")
    object Home   : Screen("home")
    object Submit : Screen("submit")
}

@Composable
fun NavGraph() {
    val navController = rememberNavController()

    // If a valid session already exists (returning user), skip straight to Home
    LaunchedEffect(Unit) {
        if (AppModule.authRepository.currentSession() != null) {
            navController.navigate(Screen.Home.route) {
                popUpTo(Screen.Login.route) { inclusive = true }
            }
        }
    }

    NavHost(navController = navController, startDestination = Screen.Login.route) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess  = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onCreateAccount = { navController.navigate(Screen.SignUp.route) }
            )
        }
        composable(Screen.SignUp.route) {
            SignUpScreen(
                onSignUpSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Home.route) {
            HomeScreen(onSubmitClick = { navController.navigate(Screen.Submit.route) })
        }
        composable(Screen.Submit.route) {
            SubmitScreen(onSubmitted = { navController.popBackStack() })
        }
    }
}
