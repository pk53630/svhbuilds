package com.buildingmaintenance.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.buildingmaintenance.app.ui.AppNavHost

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BuildingMaintenanceApp()
        }
    }
}

@Composable
fun BuildingMaintenanceApp() {
    MaterialTheme {
        Surface(modifier = Modifier) {
            AppNavHost()
        }
    }
}
