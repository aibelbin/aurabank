package com.example.aurabank.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.aurabank.ui.auth.LoginScreen
import com.example.aurabank.ui.home.HomeScreen
import com.example.aurabank.ui.submit.SubmitScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Submit : Screen("submit")
}

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = Screen.Login.route) {
        composable(Screen.Login.route) {
            LoginScreen(onLoginSuccess = { navController.navigate(Screen.Home.route) })
        }
        composable(Screen.Home.route) {
            HomeScreen(onSubmitClick = { navController.navigate(Screen.Submit.route) })
        }
        composable(Screen.Submit.route) {
            SubmitScreen(onSubmitted = { navController.popBackStack() })
        }
    }
}
