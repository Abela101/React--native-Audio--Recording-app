import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Slider } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [recordedURI, setRecordedURI] = useState(null);
  const [isRecordingStopped, setIsRecordingStopped] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Start recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        await recording.startAsync();
        setRecording(recording);
        setRecordingTime(0);
        setIsRecordingStopped(false);

        const id = setInterval(() => {
          setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);
        setIntervalId(id);
      } else {
        alert('Permission to access microphone is required.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedURI(uri);
      setRecording(null);
      setIsRecordingStopped(true);

      clearInterval(intervalId);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  // Play recorded audio
  const playSound = async () => {
    if (recordedURI) {
      const { sound } = await Audio.Sound.createAsync({ uri: recordedURI });
      setSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.isPlaying) {
          setPlaybackPosition(status.positionMillis);
          setPlaybackDuration(status.durationMillis);
        }
        if (status.didJustFinish) {
          stopSound(); // Stop sound when it finishes playing
        }
      });

      await sound.playAsync();
    }
  };

  // Stop playback
  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setSound(null);
    }
  };

  // Browse and select audio file
  const browseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (result.type === 'success') {
      setRecordedURI(result.uri);
      setIsRecordingStopped(true);
    }
  };

  // Download the recorded audio
  const downloadAudio = async () => {
    if (recordedURI) {
      const filename = recordedURI.split('/').pop();
      const downloadURI = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: recordedURI, to: downloadURI });
      alert(`File saved to ${downloadURI}`);
    } else {
      alert('No recorded audio to download.');
    }
  };

  // Delete the recorded audio
  const deleteAudio = () => {
    setRecordedURI(null);
    setIsRecordingStopped(false);
  };

  // Helper function to format time in minutes and seconds
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60000);
    const seconds = ((time % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      {/* Image at the top */}
      <Image source={require('./assets/recording.jpg')} style={styles.image} />

      <Text style={styles.title}>Audio Recording App</Text>

      {/* Recording Timer */}
      {recording && (
        <Text style={styles.timer}>
          Recording: {formatTime(recordingTime * 1000)}
        </Text>
      )}

      {/* Browse from file */}
      <TouchableOpacity style={styles.button} onPress={browseFile}>
        <Text>Browse from File</Text>
      </TouchableOpacity>

      {/* Show Start/Stop Recording buttons based on recording status */}
      {!isRecordingStopped && (
        <TouchableOpacity
          style={styles.button}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
        </TouchableOpacity>
      )}

      {/* Show Play, Download, Delete buttons only after recording has stopped */}
      {isRecordingStopped && (
        <>
          {/* Playback Progress */}
          {playbackDuration > 0 && (
            <View style={styles.progressContainer}>
              <Text>Progress: {formatTime(playbackPosition)} / {formatTime(playbackDuration)}</Text>
            </View>
          )}

          {/* Play/Stop Playback - displayed after stopping recording */}
          <View style={styles.horizontalButtons}>
            <TouchableOpacity style={styles.smallButton} onPress={playSound}>
              <Text>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={stopSound}>
              <Text>Stop Playback</Text>
            </TouchableOpacity>
          </View>

          {/* Download/Delete - displayed after stopping recording */}
          <View style={styles.horizontalButtons}>
            <TouchableOpacity style={styles.smallButton} onPress={downloadAudio}>
              <Text>Download Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={deleteAudio}>
              <Text>Delete Audio</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  image: {
    width: '100%',
    height: 380,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  timer: {
    fontSize: 18,
    marginBottom: 20,
    color: 'red',
  },
  progressContainer: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  horizontalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  smallButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
  },
});
