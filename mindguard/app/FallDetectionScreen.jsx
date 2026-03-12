import { Accelerometer } from 'expo-sensors';

let subscription = null;

export const startMotionMonitoring = ({ source, onFallDetected, onSample, updateInterval }) => {
    if (source === 'simulated') {
        const intervalId = setInterval(() => {
            const isFall = Math.random() > 0.95;
            const sample = {
                activity: isFall ? 'Impact detected' : 'Resting',
                confidence: isFall ? 92 : 85,
                magnitude: isFall ? 3.1 : 1.0,
                severity: isFall ? 'Critical' : 'Normal',
                source: 'simulated',
                suspectedFall: isFall,
                timestamp: new Date().toISOString(),
                vector: { x: 0, y: 0, z: 1 }
            };

            onSample(sample);

            if (isFall) {
                onFallDetected(sample);
            }
        }, updateInterval);

        return () => clearInterval(intervalId);
    }

    Accelerometer.setUpdateInterval(updateInterval);

    subscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        let activity = 'Resting';
        let confidence = 80;
        let severity = 'Normal';
        let suspectedFall = false;

        if (magnitude > 2.8) {
            activity = 'Impact detected';
            confidence = 95;
            severity = 'Critical';
            suspectedFall = true;
        } else if (magnitude > 1.8) {
            activity = 'Active';
            confidence = 85;
        } else if (magnitude > 1.2 && magnitude <= 1.8) {
            activity = 'Walking';
            confidence = 88;
        }

        const sample = {
            activity,
            confidence,
            magnitude: parseFloat(magnitude.toFixed(2)),
            severity,
            source: 'wearable',
            suspectedFall,
            timestamp: new Date().toISOString(),
            vector: { x, y, z }
        };

        onSample(sample);

        if (suspectedFall) {
            onFallDetected(sample);
        }
    });

    return () => {
        if (subscription) {
            subscription.remove();
            subscription = null;
        }
    };
};

export const createManualFallSample = (source) => {
    return {
        activity: 'Impact detected',
        confidence: 99,
        magnitude: 3.45,
        severity: 'Critical',
        source,
        suspectedFall: true,
        timestamp: new Date().toISOString(),
        vector: { x: 1.2, y: 2.1, z: 2.5 }
    };
};