form.addEventListener('submit', (event) => {
  event.preventDefault()
  const input = document.getElementById('input')
  socket.emit('chat', input.value)
  input.value = ''
})

createGameRoomBtn.addEventListener('click', () => {
  createGameRoom()
})

document.body.addEventListener('click', () => {
  const bgm = document.getElementById('bgm')
  bgm.play()
})

let socket

// 로비 소켓, 룸 소켓 공용 채팅 이벤트 리스너
const addChatEventListener = () => {
  socket.on('chat', (msg) => {
    const messages = document.getElementById('messages')
    const li = document.createElement('li')
    li.textContent = msg
    messages.appendChild(li)
    messages.scrollTop = messages.scrollHeight
  })
}
