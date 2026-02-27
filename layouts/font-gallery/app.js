(() => {
  const fonts = [
    'Art Of Creation',
    'Atom Braille',
    'Cafeina Dig',
    'Circle Things 2',
    'Halo Covenant',
    'Cropbats',
    'Epta Glyphs',
    'Fondi KPZ',
    'Galaxy Dingbats',
    'Hexacode',
    'Maze',
    'Omnic Sans',
    'Planets',
    'Rune',
    'Square Things 2',
    'SVG Font 1',
    'Zuptype Pica',
    'Zuptype Sim'
  ];

  const input = document.getElementById('sample-input');
  const list = document.getElementById('font-list');
  const count = document.getElementById('font-count');

  function renderRows(text) {
    list.innerHTML = '';
    fonts.forEach(name => {
      const row = document.createElement('article');
      row.className = 'font-row';

      const label = document.createElement('div');
      label.className = 'font-name';
      label.textContent = name;

      const sample = document.createElement('div');
      sample.className = 'font-sample';
      sample.style.fontFamily = `"${name}", sans-serif`;
      sample.textContent = text || ' ';

      row.append(label, sample);
      list.appendChild(row);
    });
  }

  window.HestiaWidgets.boot({
    welcomeMessage: 'Font gallery ready.'
  });

  count.textContent = fonts.length + ' fonts';
  renderRows(input.value);
  input.addEventListener('input', () => {
    renderRows(input.value);
  });
})();
