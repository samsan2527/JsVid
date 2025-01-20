const userName = "SamSan-"+Math.floor(Math.random() * 100000)
const password = "x";
document.querySelector('#user-name').innerHTML = userName;

//if trying it on a phone, use this instead...
const socket = io.connect('https://samvid.netlify.app/',{
    //const socket = io.connect('https://192.168.80.233:8181/',{
//const socket = io.connect('https://localhost:8181/',{
    auth: {
        userName,password
    }
})

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;

let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

//when a client initiates a call
const call = async e=>{
    getAudioDevices();
    await fetchUserMedia();

    //peerConnection is all set with our STUN servers sent over
    await createPeerConnection();

    //create offer time!
    try{
        console.log("Creating offer...")
        const offer = await peerConnection.createOffer();
        console.log(offer);
        peerConnection.setLocalDescription(offer);
        didIOffer = true;
        socket.emit('newOffer',offer); //send offer to signalingServer
    }catch(err){
        console.log(err)
    }

}

const answerOffer = async(offerObj)=>{
    await fetchUserMedia()
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({}); //just to make the docs happy
    await peerConnection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
    console.log(offerObj)
    console.log(answer)
    // console.log(peerConnection.signalingState) //should be have-local-pranswer because CLIENT2 has set its local desc to it's answer (but it won't be)
    //add the answer to the offerObj so the server knows which offer this is related to
    offerObj.answer = answer 
    //emit the answer to the signaling server, so it can emit to CLIENT1
    //expect a response from the server with the already existing ICE candidates
    const offerIceCandidates = await socket.emitWithAck('newAnswer',offerObj)
    offerIceCandidates.forEach(c=>{
        peerConnection.addIceCandidate(c);
        console.log("======Added Ice Candidate======")
    })
    console.log(offerIceCandidates)
}

const addAnswer = async(offerObj)=>{
    //addAnswer is called in socketListeners when an answerResponse is emitted.
    //at this point, the offer and answer have been exchanged!
    //now CLIENT1 needs to set the remote
    await peerConnection.setRemoteDescription(offerObj.answer)
    // console.log(peerConnection.signalingState)
}

const fetchUserMedia = ()=>{
    return new Promise(async(resolve, reject)=>{
        try{
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                 audio: true,
            });
            localVideoEl.srcObject = stream;
            localStream = stream;    
            resolve();    
        }catch(err){
            console.log(err);
            reject()
        }
    })
}

const createPeerConnection = (offerObj)=>{
    return new Promise(async(resolve, reject)=>{
        //RTCPeerConnection is the thing that creates the connection
        //we can pass a config object, and that config object can contain stun servers
        //which will fetch us ICE candidates
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideoEl.srcObject = remoteStream;


        localStream.getTracks().forEach(track=>{
            //add localtracks so that they can be sent once the connection is established
            peerConnection.addTrack(track,localStream);
        })

        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log(event);
            console.log(peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate',e=>{
            console.log('........Ice candidate found!......')
            console.log(e)
            if(e.candidate){
                socket.emit('sendIceCandidateToSignalingServer',{
                    iceCandidate: e.candidate,
                    iceUserName: userName,
                    didIOffer,
                })    
            }
        })
        
        peerConnection.addEventListener('track',e=>{
            console.log("Got a track from the other peer!! How excting")
            console.log(e)
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track,remoteStream);
                console.log("Here's an exciting moment... fingers cross")
            })
        })

        if(offerObj){
            //this won't be set when called from call();
            //will be set when we call from answerOffer()
            // console.log(peerConnection.signalingState) //should be stable because no setDesc has been run yet
            await peerConnection.setRemoteDescription(offerObj.offer)
            // console.log(peerConnection.signalingState) //should be have-remote-offer, because client2 has setRemoteDesc on the offer
        }
        resolve();
    })
}

const addNewIceCandidate = iceCandidate=>{
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}


document.querySelector('#call').addEventListener('click',call)
document.querySelector('#screenshare').addEventListener('click',startScreenSharing)
document.querySelector('#stopscreen').addEventListener('click',stopScreenSharing)


//sam's code

const getAudioDevices = async () => {
    try {
        // Request user permission for media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter audio input (microphones) and output (speakers) devices
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

        console.log('Audio Inputs:', audioInputs);
        console.log('Audio Outputs:', audioOutputs);

        debugger; // Pause execution for inspection
        return { audioInputs, audioOutputs };
    } catch (error) {
        console.error('Error accessing audio devices:', error);
        return { audioInputs: [], audioOutputs: [] };
    }
};


async function startScreenSharing() {
    try {
        // Get the screen share stream
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,  // Request video stream for screen sharing
            audio: false  // Set to true if you want to capture audio along with the screen
        });

        // Show the captured stream in a video element (optional)
        const videoElement = document.getElementById('screen-video');
        videoElement.srcObject = screenStream;

        // Get the video track from the screen stream
        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Replace the existing video track (if there is one) with the new screen track
        const currentStream = yourPeerConnection.getLocalStreams()[0]; // Assuming you have a peer connection
        const currentVideoTrack = currentStream.getVideoTracks()[0];
        
        // Stop the old video track
        currentVideoTrack.stop();

        // Remove the old video track and add the new screen track
        currentStream.removeTrack(currentVideoTrack);
        currentStream.addTrack(screenVideoTrack);

        // Optionally, update the video track on the peer connection
        yourPeerConnection.addStream(currentStream);

    } catch (error) {
        console.error('Error starting screen sharing:', error);
    }
}

function stopScreenSharing() {
    const screenStream = document.getElementById('screen-video').srcObject;
    const screenTracks = screenStream.getTracks();

    screenTracks.forEach(track => track.stop());

    document.getElementById('screen-video').srcObject = null;
}

