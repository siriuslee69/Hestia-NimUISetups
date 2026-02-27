(() => {
  const title = document.getElementById('media-title');
  const meta = document.getElementById('media-meta');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Media Review Studio ready.'
  });

  document.querySelectorAll('.asset-item').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.asset-item').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      title.textContent = button.dataset.title;
      meta.textContent = button.dataset.meta;
      window.HestiaWidgets.showToast('Loaded asset: ' + button.dataset.title);
    });
  });
})();
