(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  const moduleFrames = core.helpers.moduleFrames;

  function getChatHistory(frame) {
    return frame?.querySelector?.('[data-chat-history]') || null;
  }

  function nextChatEntryId() {
    core.state.chatEntryCounter += 1;
    return `chat-entry-${core.state.chatEntryCounter}`;
  }

  function ensureChatEntryId(entry) {
    if (!entry.dataset.chatEntryId) {
      entry.dataset.chatEntryId = nextChatEntryId();
    }
    return entry.dataset.chatEntryId;
  }

  function excerpt(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (value.length <= 160) {
      return value;
    }
    return `${value.slice(0, 157)}...`;
  }

  function historyEntryText(entry) {
    const bubble = entry.querySelector('.mod-chat-bubble-text') || entry.querySelector('.mod-chat-bubble');
    return (bubble?.textContent || '').trim();
  }

  function ensureBubbleText(entry) {
    const bubble = entry.querySelector('.mod-chat-bubble');
    if (!bubble) {
      return null;
    }

    let text = bubble.querySelector('.mod-chat-bubble-text');
    if (text) {
      return text;
    }

    text = document.createElement('div');
    text.className = 'mod-chat-bubble-text';
    const content = [...bubble.childNodes]
      .filter(node => !(node instanceof HTMLElement && node.matches('.mod-chat-quote-link')))
      .map(node => node.textContent || '')
      .join('')
      .trim();
    text.textContent = content;
    bubble.querySelector('.mod-chat-quote-link')?.after(text);
    if (!text.parentElement) {
      bubble.appendChild(text);
    }
    return text;
  }

  function ensureQuoteAction(entry) {
    const head = entry.querySelector('.mod-chat-entry-head');
    if (!head) {
      return null;
    }

    let button = head.querySelector('[data-chat-quote-trigger]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'mod-chat-quote-action';
      button.dataset.chatQuoteTrigger = '';
      button.textContent = 'Quote';
      head.appendChild(button);
    }
    return button;
  }

  function ensureHistoryEntry(entry) {
    ensureChatEntryId(entry);
    ensureBubbleText(entry);
    ensureQuoteAction(entry);
  }

  function closeHistoryMenus(root = document) {
    root.querySelectorAll('[data-chat-options-menu]').forEach(menu => {
      menu.classList.remove('is-open');
    });
    root.querySelectorAll('[data-chat-options-toggle]').forEach(toggle => {
      toggle.classList.remove('is-open');
    });
  }

  function closeTagMenus(root = document) {
    root.querySelectorAll('[data-chat-toolbar-shell]').forEach(shell => {
      shell.classList.remove('is-tag-open');
    });
  }

  function syncToolbarScrollButton(shell) {
    const scrollport = shell.querySelector('[data-chat-toolbar-scrollport]');
    const button = shell.querySelector('[data-chat-toolbar-scroll]');
    if (!scrollport || !button) {
      return;
    }

    const maxScroll = Math.max(0, scrollport.scrollWidth - scrollport.clientWidth);
    const atEnd = scrollport.scrollLeft >= maxScroll - 4;
    button.hidden = maxScroll <= 4;
    button.classList.toggle('is-reset', maxScroll > 4 && atEnd);
    button.textContent = atEnd ? '<' : '>';
    button.setAttribute('aria-label', atEnd ? 'Reset toolbar scroll' : 'Scroll toolbar');
  }

  function syncHistoryViewButtons(history) {
    const frame = history.closest('[data-module-kind="chat-history"]');
    if (!frame) {
      return;
    }
    frame.querySelectorAll('[data-chat-history-menu] .mod-view-btn').forEach(button => {
      button.classList.toggle('is-active', button.dataset.view === history.dataset.chatView);
    });
  }

  function syncHistoryListTag(entry) {
    const head = entry.querySelector('.mod-chat-entry-head');
    const meta = entry.querySelector('.mod-chat-meta-row');
    if (!head || !meta) {
      return;
    }

    let rotor = head.querySelector('.mod-chat-list-tag');
    if (!rotor) {
      rotor = document.createElement('span');
      rotor.className = 'mod-chat-list-tag';
      head.appendChild(rotor);
    }

    const tags = [...meta.querySelectorAll('.mod-meta-pill')]
      .map(pill => (pill.textContent || '').trim())
      .filter(Boolean);

    entry._chatListTags = tags;
    if (tags.length === 0) {
      rotor.hidden = true;
      rotor.textContent = '';
      return;
    }

    const index = Number(entry.dataset.chatListTagIndex || '0') % tags.length;
    entry.dataset.chatListTagIndex = String(index);
    rotor.hidden = false;
    rotor.textContent = tags[index];
  }

  function syncHistoryEntries(history) {
    history.querySelectorAll('.mod-chat-entry').forEach(entry => {
      ensureHistoryEntry(entry);
      syncHistoryListTag(entry);
    });
  }

  function rotateHistoryListTags(history) {
    history.querySelectorAll('.mod-chat-entry').forEach(entry => {
      const tags = entry._chatListTags || [];
      if (tags.length <= 1) {
        syncHistoryListTag(entry);
        return;
      }

      const next = (Number(entry.dataset.chatListTagIndex || '0') + 1) % tags.length;
      entry.dataset.chatListTagIndex = String(next);
      syncHistoryListTag(entry);
    });
  }

  function syncHistorySettings(history) {
    const frame = history.closest('[data-module-kind="chat-history"]');
    if (!frame) {
      return;
    }
    frame.querySelectorAll('[data-chat-setting]').forEach(select => {
      const key = select.dataset.chatSetting;
      const value = history.dataset[`chat${key.charAt(0).toUpperCase()}${key.slice(1)}`];
      if (value) {
        select.value = value;
      }
    });
    syncHistoryViewButtons(history);
  }

  function syncComposerHeight(panel) {
    const select = panel.querySelector('[data-chat-compose-setting="lines"]');
    if (!select) {
      return;
    }
    panel.dataset.chatLines = select.value === '1' ? '1' : '2';
  }

  function selectedTags(panel) {
    return [...panel.querySelectorAll('[data-chat-tag].is-active')].map(button => button.dataset.chatTag);
  }

  function nearestModuleFrame(frame, kind) {
    const matches = moduleFrames().filter(candidate => candidate.dataset.moduleKind === kind);
    if (matches.length === 0) {
      return null;
    }
    if (!frame) {
      return matches[0];
    }

    const sourceRect = frame.getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top + sourceRect.height / 2;

    matches.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aDx = aRect.left + aRect.width / 2 - sourceX;
      const aDy = aRect.top + aRect.height / 2 - sourceY;
      const bDx = bRect.left + bRect.width / 2 - sourceX;
      const bDy = bRect.top + bRect.height / 2 - sourceY;
      return aDx * aDx + aDy * aDy - (bDx * bDx + bDy * bDy);
    });

    return matches[0];
  }

  function nearestHistory(frame) {
    const historyFrame = nearestModuleFrame(frame, 'chat-history');
    return historyFrame ? getChatHistory(historyFrame) : null;
  }

  function nearestComposer(frame) {
    return nearestModuleFrame(frame, 'chat-compose');
  }

  function chatQuoteData(entry) {
    return {
      entryId: ensureChatEntryId(entry),
      author: (entry.querySelector('.mod-chat-author')?.textContent || '').trim(),
      stamp: (entry.querySelector('.mod-chat-stamp')?.textContent || '').trim(),
      text: excerpt(historyEntryText(entry))
    };
  }

  function focusChatEntry(entryId) {
    if (!entryId) {
      return;
    }

    const entry = document.querySelector(`.mod-chat-entry[data-chat-entry-id="${entryId}"]`);
    if (!entry) {
      return;
    }

    entry.scrollIntoView({ block: 'center', behavior: 'smooth' });
    entry.classList.add('is-quote-target');
    window.clearTimeout(entry._chatQuoteFlashTimer);
    entry._chatQuoteFlashTimer = window.setTimeout(() => {
      entry.classList.remove('is-quote-target');
    }, 1400);
  }

  function currentComposerQuote(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    if (!panel || !panel.dataset.chatQuoteEntryId) {
      return null;
    }

    return {
      entryId: panel.dataset.chatQuoteEntryId,
      author: panel.dataset.chatQuoteAuthor || '',
      stamp: panel.dataset.chatQuoteStamp || '',
      text: panel.dataset.chatQuoteText || ''
    };
  }

  function clearComposerQuote(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const preview = frame.querySelector('[data-chat-quote-preview]');
    if (!panel || !preview) {
      return;
    }

    delete panel.dataset.chatQuoteEntryId;
    delete panel.dataset.chatQuoteAuthor;
    delete panel.dataset.chatQuoteStamp;
    delete panel.dataset.chatQuoteText;
    preview.hidden = true;
  }

  function setComposerQuote(frame, entry) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const preview = frame.querySelector('[data-chat-quote-preview]');
    const source = frame.querySelector('[data-chat-quote-preview-source]');
    const text = frame.querySelector('[data-chat-quote-preview-text]');
    const textarea = frame.querySelector('.mod-chat-textarea');
    if (!panel || !preview || !source || !text) {
      return;
    }

    const quote = chatQuoteData(entry);
    panel.dataset.chatQuoteEntryId = quote.entryId;
    panel.dataset.chatQuoteAuthor = quote.author;
    panel.dataset.chatQuoteStamp = quote.stamp;
    panel.dataset.chatQuoteText = quote.text;
    source.textContent = quote.stamp ? `${quote.author} ${quote.stamp}` : quote.author;
    text.textContent = quote.text;
    preview.hidden = false;

    if (textarea) {
      textarea.focus();
    }
  }

  function appendChatEntry(frame, text) {
    const history = nearestHistory(frame);
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const model = panel ? panel.querySelector('[data-chat-compose-setting="model"]') : null;
    const channel = panel ? panel.querySelector('[data-chat-compose-setting="channel"]') : null;
    const article = document.createElement('article');
    const head = document.createElement('div');
    const author = document.createElement('span');
    const stamp = document.createElement('span');
    const bubble = document.createElement('div');
    const bubbleText = document.createElement('div');
    const meta = document.createElement('div');
    const tags = selectedTags(panel || frame);
    const values = tags.length > 0 ? tags : ['draft'];
    const quote = currentComposerQuote(frame);

    if (!history || text.trim().length === 0) {
      return;
    }

    article.className = 'mod-chat-entry is-participant-b';
    article.dataset.chatEntryId = nextChatEntryId();
    head.className = 'mod-chat-entry-head';
    author.className = 'mod-chat-author';
    stamp.className = 'mod-chat-stamp';
    bubble.className = 'mod-chat-bubble';
    bubbleText.className = 'mod-chat-bubble-text';
    meta.className = 'mod-chat-meta-row';

    author.textContent = `${model ? model.value : 'Atlas Fast'} / ${channel ? channel.value : 'Ops'}`;
    stamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubbleText.textContent = text;

    if (quote) {
      const quoteLink = document.createElement('button');
      const quoteLabel = document.createElement('span');
      const quoteSource = document.createElement('span');
      const quoteText = document.createElement('span');

      article.dataset.chatQuoteRef = quote.entryId;
      quoteLink.type = 'button';
      quoteLink.className = 'mod-chat-quote-link';
      quoteLink.dataset.chatQuoteJump = quote.entryId;
      quoteLabel.className = 'mod-chat-quote-label';
      quoteLabel.textContent = 'Quoted message';
      quoteSource.className = 'mod-chat-quote-source';
      quoteSource.textContent = quote.stamp ? `${quote.author} ${quote.stamp}` : quote.author;
      quoteText.className = 'mod-chat-quote-text';
      quoteText.textContent = quote.text;
      quoteLink.appendChild(quoteLabel);
      quoteLink.appendChild(quoteSource);
      quoteLink.appendChild(quoteText);
      bubble.appendChild(quoteLink);
    }

    bubble.appendChild(bubbleText);

    values.forEach(value => {
      const pill = document.createElement('span');
      pill.className = 'mod-meta-pill';
      pill.textContent = value;
      meta.appendChild(pill);
    });

    head.appendChild(author);
    head.appendChild(stamp);
    article.appendChild(head);
    article.appendChild(bubble);
    article.appendChild(meta);
    ensureQuoteAction(article);
    syncHistoryListTag(article);
    history.appendChild(article);
    history.scrollTop = history.scrollHeight;
    clearComposerQuote(frame);
  }

  function bindHistoryModule(frame) {
    const history = getChatHistory(frame);
    const historyMenu = frame.querySelector('[data-chat-history-menu]');
    const optionsToggle = frame.querySelector('[data-chat-options-toggle]');
    const optionsMenu = frame.querySelector('[data-chat-options-menu]');

    if (!history) {
      return;
    }

    if (frame.dataset.chatHistoryBound === 'true') {
      syncHistoryEntries(history);
      syncHistorySettings(history);
      return;
    }

    frame.dataset.chatHistoryBound = 'true';
    syncHistoryEntries(history);
    if (!history._chatListTimer) {
      history._chatListTimer = window.setInterval(() => {
        rotateHistoryListTags(history);
      }, 2600);
    }

    syncHistorySettings(history);

    history.addEventListener('click', event => {
      const quoteTrigger = event.target.closest('[data-chat-quote-trigger]');
      if (quoteTrigger) {
        const entry = quoteTrigger.closest('.mod-chat-entry');
        const composeFrame = nearestComposer(frame);
        if (entry && composeFrame) {
          event.preventDefault();
          setComposerQuote(composeFrame, entry);
        }
        return;
      }

      const quoteJump = event.target.closest('[data-chat-quote-jump]');
      if (quoteJump) {
        event.preventDefault();
        focusChatEntry(quoteJump.dataset.chatQuoteJump || '');
      }
    });

    if (historyMenu) {
      historyMenu.querySelectorAll('.mod-view-btn').forEach(button => {
        button.addEventListener('click', () => {
          historyMenu.querySelectorAll('.mod-view-btn').forEach(candidate => {
            candidate.classList.remove('is-active');
          });
          button.classList.add('is-active');
          history.dataset.chatView = button.dataset.view || 'details';
          syncHistoryEntries(history);
        });
      });
    }

    frame.querySelectorAll('[data-chat-setting]').forEach(select => {
      select.addEventListener('change', () => {
        const key = select.dataset.chatSetting;
        history.dataset[`chat${key.charAt(0).toUpperCase()}${key.slice(1)}`] = select.value;
        syncHistoryEntries(history);
      });
    });

    if (optionsToggle && optionsMenu) {
      optionsToggle.addEventListener('click', event => {
        const isOpen = optionsMenu.classList.contains('is-open');
        event.stopPropagation();
        closeHistoryMenus(frame);
        optionsMenu.classList.toggle('is-open', !isOpen);
        optionsToggle.classList.toggle('is-open', !isOpen);
      });

      optionsMenu.addEventListener('click', event => {
        event.stopPropagation();
      });
    }
  }

  function bindComposer(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const textarea = frame.querySelector('.mod-chat-textarea');
    const send = frame.querySelector('[data-chat-send]');
    const lineSelect = frame.querySelector('[data-chat-compose-setting="lines"]');
    const enterSend = frame.querySelector('[data-chat-compose-setting="enter-send"]');
    const toolbarShell = frame.querySelector('[data-chat-toolbar-shell]');
    const toolbarScrollport = frame.querySelector('[data-chat-toolbar-scrollport]');
    const toolbarScroll = frame.querySelector('[data-chat-toolbar-scroll]');
    const tagToggle = frame.querySelector('[data-chat-tag-toggle]');
    const tagMenu = frame.querySelector('[data-chat-tag-menu]');
    const quotePreviewJump = frame.querySelector('[data-chat-quote-preview-jump]');
    const quoteClear = frame.querySelector('[data-chat-quote-clear]');

    if (!panel || !textarea || !send) {
      return;
    }

    syncComposerHeight(panel);
    if (toolbarShell) {
      requestAnimationFrame(() => syncToolbarScrollButton(toolbarShell));
    }

    if (panel.dataset.chatComposeBound === 'true') {
      return;
    }

    panel.dataset.chatComposeBound = 'true';

    if (lineSelect) {
      lineSelect.addEventListener('change', () => {
        syncComposerHeight(panel);
      });
    }

    if (toolbarShell && toolbarScrollport && toolbarScroll) {
      const step = () => Math.max(160, Math.round(toolbarScrollport.clientWidth * 0.72));
      const sync = () => syncToolbarScrollButton(toolbarShell);

      toolbarScroll.addEventListener('click', () => {
        const maxScroll = Math.max(0, toolbarScrollport.scrollWidth - toolbarScrollport.clientWidth);
        if (maxScroll <= 4) {
          return;
        }

        if (toolbarScrollport.scrollLeft >= maxScroll - 4) {
          toolbarScrollport.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          toolbarScrollport.scrollBy({ left: step(), behavior: 'smooth' });
        }
      });

      toolbarScrollport.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(sync);
        observer.observe(toolbarShell);
        observer.observe(toolbarScrollport);
      }

      requestAnimationFrame(sync);
    }

    if (tagToggle && toolbarShell && tagMenu) {
      tagToggle.addEventListener('click', event => {
        const isOpen = toolbarShell.classList.contains('is-tag-open');
        event.stopPropagation();
        closeTagMenus(frame);
        toolbarShell.classList.toggle('is-tag-open', !isOpen);
      });

      tagMenu.addEventListener('click', event => {
        event.stopPropagation();
      });
    }

    frame.querySelectorAll('[data-chat-tag]').forEach(button => {
      button.addEventListener('click', () => {
        button.classList.toggle('is-active');
      });
    });

    if (quotePreviewJump) {
      quotePreviewJump.addEventListener('click', () => {
        focusChatEntry(panel.dataset.chatQuoteEntryId || '');
      });
    }

    if (quoteClear) {
      quoteClear.addEventListener('click', () => {
        clearComposerQuote(frame);
        textarea.focus();
      });
    }

    send.addEventListener('click', () => {
      appendChatEntry(frame, textarea.value);
      textarea.value = '';
      textarea.focus();
    });

    textarea.addEventListener('keydown', event => {
      const canSend = enterSend ? enterSend.checked : true;
      if (event.key === 'Enter' && !event.shiftKey && canSend) {
        event.preventDefault();
        send.click();
      }
    });
  }

  function initChatFrame(root = document) {
    root.querySelectorAll('[data-module-kind="chat-history"]').forEach(frame => {
      bindHistoryModule(frame);
    });
    root.querySelectorAll('[data-module-kind="chat-compose"]').forEach(frame => {
      bindComposer(frame);
    });

    if (document.body.dataset.chatUiBound === 'true') {
      return;
    }

    document.body.dataset.chatUiBound = 'true';
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-module-kind="chat-history"]') &&
          !event.target.closest('[data-module-kind="chat-compose"]')) {
        closeHistoryMenus(root);
        closeTagMenus(root);
        return;
      }

      if (!event.target.closest('[data-chat-options-menu]') && !event.target.closest('[data-chat-options-toggle]')) {
        closeHistoryMenus(root);
      }

      if (!event.target.closest('[data-chat-toolbar-shell]')) {
        closeTagMenus(root);
      }
    });
  }

  core.modules.chat = {
    init: initChatFrame,
    closeHistoryMenus,
    closeTagMenus,
    cleanupFrame(frame) {
      closeHistoryMenus(frame);
      closeTagMenus(frame);
      const history = getChatHistory(frame);
      if (history && history._chatListTimer) {
        window.clearInterval(history._chatListTimer);
        history._chatListTimer = null;
      }
    }
  };
})();