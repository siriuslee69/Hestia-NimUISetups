(() => {
  const title = document.getElementById('chat-title');
  const roomLabel = document.getElementById('chat-room-label');
  const composer = document.getElementById('composer');
  const input = document.getElementById('chat-input');
  const stack = document.getElementById('message-stack');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Chat Mission Control ready.'
  });

  document.querySelectorAll('.server-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.server-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
    });
  });

  document.querySelectorAll('.channel-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.channel-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const room = button.dataset.room;
      title.textContent = room;
      roomLabel.textContent = 'Room: ' + room;
      window.HestiaWidgets.showToast('Joined ' + room + '.');
    });
  });

  composer.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    const node = document.createElement('article');
    node.className = 'message outgoing';
    node.innerHTML = '<strong>you</strong><p></p>';
    node.querySelector('p').textContent = text;
    stack.appendChild(node);
    input.value = '';
    stack.scrollTop = stack.scrollHeight;
  });
})();
