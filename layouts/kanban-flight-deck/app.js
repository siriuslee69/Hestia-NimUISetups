(() => {
  const boardLabel = document.getElementById('board-sprint-label');
  const taskFocus = document.getElementById('task-focus');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Kanban Flight Deck ready.'
  });

  document.querySelectorAll('.project-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.project-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
    });
  });

  document.querySelectorAll('.sprint-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.sprint-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      boardLabel.textContent = button.dataset.sprint + ' board';
      window.HestiaWidgets.showToast('Loaded ' + button.dataset.sprint + '.');
    });
  });

  document.querySelectorAll('.task-card').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.task-card').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      taskFocus.textContent = button.dataset.task;
    });
  });
})();
