import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { logFallEvent } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FALL_DETECT_TASK = 'background-fall-detect';

// 1. Define the task
TaskManager.defineTask(FALL_DETECT_TASK, async () => {
    try {
        console.log(`[Background Task] Running offline fall monitor check...`);
        
        // Note: expo-sensors Accelerometer cannot run fully headless in BackgroundFetch without native modules.
        // For a hackathon, we simulate a health-check/sync here, while the physical ESP32 handles true 24/7.
        // If a queued offline fall event was saved in AsyncStorage, we would push it here.
        
        const pendingFalls = await AsyncStorage.getItem('pending_falls');
        if (pendingFalls) {
            const parsed = JSON.parse(pendingFalls);
            if (parsed.length > 0) {
                // Sync to backend
                for (const fall of parsed) {
                    await logFallEvent(fall);
                }
                await AsyncStorage.removeItem('pending_falls');
                console.log(`[Background Task] Synced ${parsed.length} offline falls to server.`);
                return BackgroundFetch.BackgroundFetchResult.NewData;
            }
        }
        
        return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
        console.error("Background fetch failed:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// 2. Register the task globally
export async function registerBackgroundFallDetection() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(FALL_DETECT_TASK);
        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(FALL_DETECT_TASK, {
                minimumInterval: 60 * 15, // 15 minutes is the minimum for iOS/Android periodic fetch
                stopOnTerminate: false, // Keep running after app is swiped away
                startOnBoot: true,     // Start tracking when device reboots
            });
            console.log("Background Fall Detection Task registered.");
        }
    } catch (err) {
        console.log("Background registration error:", err);
    }
}
