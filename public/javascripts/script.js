const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer();
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// 유저의 브라우저로부터 Media Device들을 받아오는 과정
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    /*
    Media Device를 받아오는데 성공하면 stream을 넘겨받을 수 있다.
    addVideoStream은 받아온 스트림을 나의 브라우저에 추가 시킨다.
    */
    addVideoStream(myVideo, stream);

    /*
    그 후 누군가 나에게 요청을 보내면 받기 위해 event를 on 해준다.
    call.answer는 나에게 응답을 준 다른 peer의 요청에 수락하는 코드이다.
    이 과정에서 나의 stream을 다른 동료에게 보내준다.
    answer가 발생하면 'stream'이라는 이벤트를 통해 다른 유저의 stream을 받아올 수 있다.
    call.on('stream')에서는 다른 유저의 stream을 나의 브라우저에 추가 시키는 콜백 함수가 실행된다.
    */
    myPeer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    /*
    user-connected 이벤트가 발생하면 새롭게 접속한 유저에게 call 요청을 보낸다.
    call 요청은 각각의 peer가 가지고 있는 userId를 통해 할 수 있는데 이 userId를 서버로부터 받아온 후 call을 보내는 것이다.
    */
    socket.on('user-connected', (userId) => {
      connectToNewUser(userId, stream);
    });
});

/*
유저가 나간 경우에 socket.io에서는 자동으로 'disconnect' 이벤트를 발생시킨다.
이 경우 다른 peer의 stream을 close 시키는 코드이다.
*/
socket.on('user-disconnected', (userId) => {
  if (peers[userId]) peers[userId].close();
});

/*
peer 서버와 정상적으로 통신이 된 경우 'open' 이벤트가 발생된다.
open 이벤트가 발생하면 url의 uuid를 통해 유저를 room에 join 시킨다.
간단하게 설명하면 유저가 들어오면 room에 join 시킨다고 보면 된다.
*/
myPeer.on('open', (id) => {
  socket.emit('join-room', ROOM_ID, id);
});

/*
위에서 간략하게 설명했는데 다시 한 번 설명하자면 다음과 같다.
새로운 유저가 접속하면 그 유저의 stream을 내 화면에 추가 시켜야 화상 통화가 가능하기에
그 유저에게 요청을 보낸다. => myPeer.call(userId, stream)
상대 유저가 answer를 했을 때 'stream' 이벤트가 발생되는데 이를 통해 상대 유저의 stream을 받아오고
나의 화면에 상대 유저의 stream을 추가 시킨다. call.on('stream')
상대가 나가서 상대의 stream에 대해 'close' 이벤트가 발생하면 상대의 video를 내 화면에서 remove 시킨다.
*/
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}
