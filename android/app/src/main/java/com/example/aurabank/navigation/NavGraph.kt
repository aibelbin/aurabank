package com.example.aurabank.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.aurabank.di.AppModule
import com.example.aurabank.ui.auth.LoginScreen
import com.example.aurabank.ui.auth.SignUpScreen
import com.example.aurabank.ui.home.HomeScreen
import com.example.aurabank.ui.splash.SplashScreen
import com.example.aurabank.ui.submit.SubmitScreen

sealed class Screen(val route: String) {
    object Login   : Screen("login")
    object SignUp  : Screen("signup")
    object Home    : Screen("home")
    object Submit  : Screen("submit")
}

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    var splashDone by remember { mutableStateOf(false) }

    val startDest = remember {
        if (AppModule.authRepository.currentSession() != null) Screen.Home.route
        else Screen.Login.route
    }

    Box(modifier = Modifier.fillMaxSize()) {

        // Login (or Home) renders at full size from frame 1
        NavHost(navController = navController, startDestination = startDest) {

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
                HomeScreen(
                    onSubmitClick = { navController.navigate(Screen.Submit.route) },
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Submit.route) {
                SubmitScreen(onSubmitted = { navController.popBackStack() })
            }
        }

        // SplashScreen sits on top and punches a growing hole in itself,
        // revealing the login screen beneath. When the hole fills the screen,
        // onFinished removes this overlay entirely.
        if (!splashDone) {
            SplashScreen(onFinished = { splashDone = true })
        }
    }
}
