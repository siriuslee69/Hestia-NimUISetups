(() => {
  const subject = document.getElementById('mail-subject');
  const from = document.getElementById('mail-from');
  const body = document.getElementById('mail-body');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Mail Triage ready.'
  });

  document.querySelectorAll('.folder-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.folder-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      window.HestiaWidgets.showToast('Switched to ' + button.textContent + '.');
    });
  });

  document.querySelectorAll('.thread-item').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.thread-item').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      subject.textContent = button.dataset.subject;
      from.textContent = button.dataset.from;
      body.textContent = button.dataset.body;
    });
  });
})();
