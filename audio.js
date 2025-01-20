let micMuted = false; // Keep track of mic mute state
let speakerMuted = false; // Keep track of speaker mute state
document.querySelector('#mic-btn').addEventListener('click',toggleMic)
document.querySelector('#speaker-btn').addEventListener('click',toggleSpeaker)
// Toggle the microphone mute state
function toggleMic() {
    micMuted = !micMuted;
    const micIcon = document.getElementById('mic-icon');
    
    if (micMuted) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-microphone-slash');
        // Mute the microphone in WebRTC (example)
        localStream.getAudioTracks().forEach(track => track.enabled = false); // Assuming localStream is your stream
    } else {
        micIcon.classList.remove('fa-microphone-slash');
        micIcon.classList.add('fa-microphone');
        // Unmute the microphone in WebRTC
        localStream.getAudioTracks().forEach(track => track.enabled = true);
    }

    // Optionally, you can also send this change to the backend
    updateMicStatus(micMuted);
}

// Toggle the speaker mute state
function toggleSpeaker() {
    speakerMuted = !speakerMuted;
    const speakerIcon = document.getElementById('speaker-icon');

    if (speakerMuted) {
        speakerIcon.classList.remove('fa-volume-up');
        speakerIcon.classList.add('fa-volume-mute');
        // Mute the speaker (example using WebRTC)
        remoteStream.getAudioTracks().forEach(track => track.enabled = false); // Assuming remoteStream is the remote stream
    } else {
        speakerIcon.classList.remove('fa-volume-mute');
        speakerIcon.classList.add('fa-volume-up');
        // Unmute the speaker
        remoteStream.getAudioTracks().forEach(track => track.enabled = true);
    }

    // Optionally, you can also send this change to the backend
    updateSpeakerStatus(speakerMuted);
}

// Example function to send the updated mic status to the backend
function updateMicStatus(isMuted) {
    fetch('/api/mic-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ micMuted: isMuted })
    })
    .then(response => response.json())
    .then(data => console.log('Mic status updated:', data))
    .catch(error => console.error('Error updating mic status:', error));
}

// Example function to send the updated speaker status to the backend
function updateSpeakerStatus(isMuted) {
    fetch('/api/speaker-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ speakerMuted: isMuted })
    })
    .then(response => response.json())
    .then(data => console.log('Speaker status updated:', data))
    .catch(error => console.error('Error updating speaker status:', error));
}