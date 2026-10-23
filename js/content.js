/* Read-only helpers over unit data. Shared by screens, games and content checks. */
(function (root) {
  const BEAR = root.BEAR = root.BEAR || {};

  function units() {
    return root.BEAR_UNITS || {};
  }

  function listUnits() {
    const order = root.BEAR_UNIT_ORDER || Object.keys(units());
    return order.map((id) => units()[id]).filter(Boolean);
  }

  function getUnit(unitId) {
    if (unitId) return units()[unitId] || null;
    return listUnits()[0] || null;
  }

  function getChapter(unit, chapterId) {
    if (!unit) return null;
    if (chapterId === unit.showtime.id) return unit.showtime;
    return unit.chapters.find((c) => c.id === chapterId) || null;
  }

  function getItem(unit, itemId) {
    return (unit && unit.items && unit.items[itemId]) || null;
  }

  function getItems(unit, ids) {
    return (ids || []).map((id) => getItem(unit, id)).filter(Boolean);
  }

  function getPhrase(unit, phraseId) {
    return (unit && unit.phrases && unit.phrases[phraseId]) || null;
  }

  function itemAudioKey(item, mode) {
    if (!item || !item.audio) return null;
    if (mode === 'word') return item.audio.word || null;
    if (mode === 'sentence') return item.audio.can || item.audio.feel || item.audio.word || null;
    if (mode === 'feel') return item.audio.feel || null;
    if (mode === 'im') return item.audio.im || null;
    return item.audio.word || null;
  }

  function itemLabel(item, mode) {
    if (!item) return '';
    if (mode === 'sentence' || mode === 'feel' || mode === 'im') {
      return (item.sentence && item.sentence.en) || item.en;
    }
    return item.en;
  }

  function itemZh(item, mode) {
    if (!item) return '';
    if (mode === 'sentence' || mode === 'feel' || mode === 'im') {
      return (item.sentence && item.sentence.zh) || item.zh;
    }
    return item.zh;
  }

  function answerAudioKey(unit, answer) {
    if (!answer) return null;
    if (answer.phrase) {
      const p = getPhrase(unit, answer.phrase);
      return p ? p.audio : null;
    }
    if (answer.item) {
      return itemAudioKey(getItem(unit, answer.item), answer.mode || 'word');
    }
    return null;
  }

  function answerLabel(unit, answer) {
    if (!answer) return '';
    if (answer.phrase) {
      const p = getPhrase(unit, answer.phrase);
      return p ? { en: p.en, zh: p.zh } : { en: '', zh: '' };
    }
    if (answer.item) {
      const item = getItem(unit, answer.item);
      return {
        en: itemLabel(item, answer.mode || 'word'),
        zh: itemZh(item, answer.mode || 'word')
      };
    }
    return { en: '', zh: '' };
  }

  function activityAudioKeys(unit, activity) {
    const out = [];
    if (!activity) return out;
    if (activity.intro) out.push(activity.intro);
    if (activity.type === 'findIt') {
      (activity.pool || []).forEach((id) => {
        const key = itemAudioKey(getItem(unit, id), activity.mode);
        if (key) out.push(key);
      });
    } else if (activity.type === 'doIt') {
      (activity.items || []).forEach((id) => {
        const item = getItem(unit, id);
        if (!item) return;
        if (item.audio.word) out.push(item.audio.word);
        if (item.audio.can || item.audio.feel) out.push(item.audio.can || item.audio.feel);
      });
    } else if (activity.type === 'faceMatch') {
      (activity.pool || []).forEach((id) => {
        const item = getItem(unit, id);
        if (!item) return;
        if (item.audio.feel) out.push(item.audio.feel);
        if (item.audio.im) out.push(item.audio.im);
      });
    } else if (activity.type === 'introChat') {
      (activity.turns || []).forEach((turn) => {
        if (turn.q) out.push(turn.q);
        (turn.answers || []).forEach((answer) => {
          const key = answerAudioKey(unit, answer);
          if (key) out.push(key);
          if (answer.word) out.push(answer.word);
        });
      });
    } else if (activity.type === 'sayIt') {
      if (activity.audioKey) out.push(activity.audioKey);
    }
    return out.filter(Boolean);
  }

  function chapterActivities(unit, chapter) {
    if (!chapter) return [];
    if (chapter.phases) {
      return chapter.phases.reduce((all, phase) => all.concat(phase.activities || []), []);
    }
    return chapter.activities || [];
  }

  function chapterAudioKeys(unit, chapter) {
    const seen = Object.create(null);
    const out = [];
    chapterActivities(unit, chapter).forEach((activity) => {
      activityAudioKeys(unit, activity).forEach((key) => {
        if (!seen[key]) {
          seen[key] = 1;
          out.push(key);
        }
      });
    });
    if (chapter.phases) out.push('lets');
    return out;
  }

  function showtimeUnlocked(store, unit) {
    if (!store || !unit) return false;
    const chapters = store.chapterSummary(unit.id, unit.chapters);
    return chapters.totalChapters > 0 && chapters.done === chapters.totalChapters;
  }

  function validateUnit(unit, audioMap) {
    const errors = [];
    if (!unit) return ['unit missing'];
    const knownAudio = audioMap || root.BEAR_AUDIO || {};
    const itemIds = Object.keys(unit.items || {});
    const chapterIds = Object.create(null);

    const checkAudio = (key, where) => {
      if (!key) return;
      if (!knownAudio[key]) errors.push(where + ': audio key "' + key + '" missing');
    };
    const checkItem = (id, where) => {
      if (!unit.items[id]) errors.push(where + ': item "' + id + '" missing');
    };

    (unit.chapters || []).forEach((chapter) => {
      if (chapterIds[chapter.id]) errors.push('duplicate chapter id: ' + chapter.id);
      chapterIds[chapter.id] = 1;
      if (!Array.isArray(chapter.phases) || chapter.phases.length !== 3) {
        errors.push('chapter ' + chapter.id + ': expected 3 phases');
      }
      if (chapter.badge && !chapter.badge.icon) errors.push('chapter ' + chapter.id + ': badge icon missing');
      (chapter.stickerIds || []).forEach((id) => checkItem(id, 'chapter ' + chapter.id + ' sticker'));
      (chapter.phases || []).forEach((phase) => {
        const where = 'chapter ' + chapter.id + ' / ' + phase.id;
        if (!Array.isArray(phase.activities) || !phase.activities.length) {
          errors.push(where + ': no activities');
        }
        (phase.activities || []).forEach((activity, i) => {
          const at = where + ' activity ' + i;
          if (activity.type === 'findIt') {
            if (!activity.pool || !activity.pool.length) errors.push(at + ': empty pool');
            (activity.pool || []).forEach((id) => {
              checkItem(id, at);
              const item = unit.items[id];
              if (item) {
                const mode = activity.mode === 'sentence' ? 'sentence' : 'word';
                checkAudio(itemAudioKey(item, mode), at);
              }
            });
            if (activity.intro) checkAudio(activity.intro, at);
          } else if (activity.type === 'doIt') {
            (activity.items || []).forEach((id) => {
              checkItem(id, at);
              const item = unit.items[id];
              if (item) {
                checkAudio(item.audio && item.audio.word, at);
                checkAudio(item.audio && (item.audio.can || item.audio.feel), at);
              }
            });
          } else if (activity.type === 'faceMatch') {
            (activity.pool || []).forEach((id) => {
              checkItem(id, at);
              const item = unit.items[id];
              if (item) {
                checkAudio(item.audio && item.audio.feel, at);
                checkAudio(item.audio && item.audio.im, at);
              }
            });
            if (activity.intro) checkAudio(activity.intro, at);
          } else if (activity.type === 'introChat') {
            (activity.turns || []).forEach((turn) => {
              checkAudio(turn.q, at);
              (turn.answers || []).forEach((answer) => {
                checkAudio(answerAudioKey(unit, answer), at);
                if (answer.word) checkAudio(answer.word, at);
              });
            });
          } else if (activity.type === 'sayIt') {
            checkAudio(activity.audioKey, at);
          } else {
            errors.push(at + ': unknown type "' + activity.type + '"');
          }
        });
      });
    });

    if (!unit.showtime || !unit.showtime.activities) errors.push('showtime missing');
    (unit.showtime ? unit.showtime.activities || [] : []).forEach((activity) => {
      if (activity.type === 'findIt') {
        (activity.pool || []).forEach((id) => {
          checkItem(id, 'showtime');
          const item = unit.items[id];
          if (item) checkAudio(itemAudioKey(item, activity.mode === 'sentence' ? 'sentence' : 'word'), 'showtime');
        });
      } else if (activity.type === 'doIt') {
        (activity.items || []).forEach((id) => checkItem(id, 'showtime'));
      }
    });

    if (unit.playground) {
      (unit.playground.actions || []).forEach((id) => checkItem(id, 'playground'));
      (unit.playground.feelings || []).forEach((id) => checkItem(id, 'playground'));
      (unit.playground.challenges || []).forEach((activity) => {
        if (activity.type === 'findIt') {
          (activity.pool || []).forEach((id) => {
            checkItem(id, 'playground challenge');
            const item = unit.items[id];
            if (item) checkAudio(itemAudioKey(item, activity.mode === 'sentence' ? 'sentence' : 'word'), 'playground challenge');
          });
        } else if (activity.type === 'doIt') {
          (activity.items || []).forEach((id) => checkItem(id, 'playground challenge'));
        }
      });
    }

    itemIds.forEach((id) => {
      const item = unit.items[id];
      if (item.audio) {
        Object.keys(item.audio).forEach((k) => checkAudio(item.audio[k], 'item ' + id));
      }
    });

    return errors;
  }

  BEAR.content = {
    listUnits,
    getUnit,
    getChapter,
    getItem,
    getItems,
    getPhrase,
    itemAudioKey,
    itemLabel,
    itemZh,
    answerAudioKey,
    answerLabel,
    activityAudioKeys,
    chapterActivities,
    chapterAudioKeys,
    showtimeUnlocked,
    validateUnit
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BEAR.content;
})(typeof globalThis !== 'undefined' ? globalThis : this);
