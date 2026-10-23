/* Unit 1 content. Pure data: no DOM access, so tools can require it in Node. */
(function (root) {
  const OLD_ACTIONS = ['walk', 'run', 'jump', 'clap', 'dance', 'sing', 'kick', 'wave', 'wobble'];
  const NEW_ACTIONS = ['crawl', 'point', 'pat', 'shake', 'turn', 'snap', 'poke'];
  const ALL_ACTIONS = OLD_ACTIONS.concat(NEW_ACTIONS);
  const FEELINGS = ['happy', 'sad', 'angry', 'hungry', 'sleepy'];

  const action = (id, zh, sentenceZh, tip, contrast) => ({
    id,
    kind: 'action',
    en: id,
    zh,
    pose: id,
    face: 'happy',
    sentence: { en: 'I can ' + id + '.', zh: sentenceZh },
    audio: { word: id, can: 'can_' + id },
    contrast: contrast || [],
    tip
  });

  const feeling = (id, zh, sentenceZh, tip) => ({
    id,
    kind: 'feeling',
    en: id,
    zh,
    pose: 'wave',
    face: id,
    sentence: { en: 'I feel ' + id + '.', zh: sentenceZh },
    audio: { word: id, feel: 'feel_' + id, im: 'im_' + id },
    contrast: [],
    tip
  });

  const actions = {
    walk: action('walk', '走', '我会走。', '在家里慢慢走；run 才是跑。', ['run', 'jump']),
    run: action('run', '跑', '我会跑。', '在安全的地方跑；run 比 walk 快。', ['walk', 'jump']),
    jump: action('jump', '跳', '我会跳。', '双脚离地跳一下；落地要轻。', ['run', 'clap']),
    clap: action('clap', '拍手', '我会拍手。', '跟着节奏拍手，可以快慢变化。', ['dance', 'sing']),
    dance: action('dance', '跳舞', '我会跳舞。', '放一段音乐，随便跳一跳。', ['sing', 'clap']),
    sing: action('sing', '唱歌', '我会唱歌。', '唱一句孩子熟悉的歌。', ['dance', 'clap']),
    kick: action('kick', '踢', '我会踢。', '用软球，轻轻踢；注意周围。', ['jump', 'run']),
    wave: action('wave', '挥手', '我会挥手。', '挥手说 hello 或 bye-bye。', ['clap', 'point']),
    wobble: action('wobble', '摇晃', '我会摇晃。', '像果冻一样慢慢左右晃；shake 是快速抖。', ['shake']),
    crawl: action('crawl', '爬', '我会爬。', '在地上爬；climb 才是往上爬。', ['walk', 'run']),
    point: action('point', '指', '我会指。', '伸出一根手指指东西。', ['pat', 'poke']),
    pat: action('pat', '轻拍', '我会轻拍。', '轻轻拍，不要用力打。', ['point', 'poke']),
    shake: action('shake', '摇动', '我会摇动。', '快速抖动手或身体；和 wobble 的慢晃对比。', ['wobble']),
    turn: action('turn', '转圈', '我会转圈。', '原地慢慢转一圈，注意周围安全。', ['dance', 'wobble']),
    snap: action('snap', '打响指', '我会打响指。', '对 3 岁孩子偏难，看和试就好，不要求成功。', ['clap', 'pat']),
    poke: action('poke', '戳', '我会戳。', '用手指轻轻戳气球或玩偶，不戳人。', ['point', 'pat'])
  };

  const feelings = {
    happy: feeling('happy', '开心', '我感到开心。', '笑一笑，说 I feel happy.'),
    sad: feeling('sad', '难过', '我感到难过。', '嘴角向下，说 I feel sad.'),
    angry: feeling('angry', '生气', '我感到生气。', '皱眉、握拳；可以夸张一点。'),
    hungry: feeling('hungry', '饿了', '我饿了。', '摸摸肚子，说 I feel hungry.'),
    sleepy: feeling('sleepy', '困了', '我困了。', '打个哈欠，说 I feel sleepy.')
  };

  const items = Object.assign({}, actions, feelings);

  const phrase = (id, en, zh, note) => ({ id, en, zh, audio: id, note: note || '' });

  const phrases = {
    q_name: phrase('q_name', "What's your name?", '你叫什么名字？'),
    a_name: phrase('a_name', 'My name is George.', '我叫 George。', '原录音只说 My name is …，没有 George；停顿时请家长示范 George，孩子只说名字也可以。'),
    q_how: phrase('q_how', 'How are you?', '你好吗？'),
    q_age: phrase('q_age', 'How old are you?', '你几岁了？'),
    a_age: phrase('a_age', 'I am 3 years old.', '我三岁。', 'George 今年 3 岁；原录音正好示范 I am 3 years old.。'),
    q_bg: phrase('q_bg', 'Are you a boy or a girl?', '你是男孩还是女孩？'),
    a_girl: phrase('a_girl', 'I am a girl.', '我是女孩。'),
    a_boy: phrase('a_boy', 'I am a boy.', '我是男孩。'),
    q_feel: phrase('q_feel', 'How do you feel?', '你感觉怎么样？'),
    q_can: phrase('q_can', 'What can you do?', '你会做什么？'),
    cheer: phrase('cheer', 'Great job!', '太棒了！'),
    lets: phrase('lets', "Let's do it.", '我们一起做吧。'),
    again: phrase('again', 'Again.', '再来一次。'),
    boy: phrase('boy', 'boy', '男孩'),
    girl: phrase('girl', 'girl', '女孩')
  };

  const say = (audioKey, en, zh, prompt, note) => ({
    type: 'sayIt',
    audioKey,
    en,
    zh,
    prompt: prompt || '轮到你了',
    note: note || '',
    allowRecord: true
  });

  const units = root.BEAR_UNITS = root.BEAR_UNITS || {};

  units.unit1 = {
    id: 'unit1',
    order: 1,
    title: "Bear's English Playtime",
    zhTitle: '小熊英语游戏',
    subtitle: '动作与表达',
    description: '跟小熊一起学动作、感觉和自我介绍；听、做、说，一步一步来。',
    items,
    phrases,
    chapters: [
      {
        id: 'self-intro',
        order: 1,
        title: 'Hello, Bear!',
        zhTitle: '自我介绍',
        icon: 'wave',
        motif: 'speech',
        badge: { id: 'badge-hello', label: 'Hello!', icon: 'heart' },
        stickerIds: [],
        tip: '这一章是家长带答：先听小熊问，再示范回答；不要求孩子说完整句。',
        phases: [
          {
            id: 'hello',
            title: 'Hello',
            zhTitle: '打招呼',
            activities: [
              {
                type: 'introChat',
                turns: [
                  {
                    q: 'q_name',
                    answers: [{ phrase: 'a_name' }],
                    zh: '你叫什么名字？',
                    note: '原录音在 My name is … 处停顿；请家长接着示范 George，孩子可以只说 George。'
                  },
                  {
                    q: 'q_how',
                    answers: [
                      { item: 'happy', mode: 'im' },
                      { item: 'sad', mode: 'im' }
                    ],
                    zh: '你好吗？',
                    note: '开心选 happy，难过选 sad。'
                  }
                ]
              },
              say('a_name', 'My name is George.', '我叫 George。', '轮到 George 说名字了', '原录音在名字处停顿，家长接着示范 George；孩子只说 George 也可以。')
            ]
          },
          {
            id: 'about-me',
            title: 'About Me',
            zhTitle: '关于我',
            activities: [
              {
                type: 'introChat',
                turns: [
                  {
                    q: 'q_age',
                    answers: [{ phrase: 'a_age' }],
                    zh: '你几岁了？',
                    note: 'George 今年 3 岁，跟着原录音说 I am 3 years old.。'
                  },
                  {
                    q: 'q_bg',
                    answers: [
                      { phrase: 'a_boy', word: 'boy' },
                      { phrase: 'a_girl', word: 'girl' }
                    ],
                    zh: '你是男孩还是女孩？',
                    note: '先点小词听 boy / girl，再听完整句。'
                  }
                ]
              }
            ]
          },
          {
            id: 'feelings',
            title: 'Feelings',
            zhTitle: '感觉',
            activities: [
              {
                type: 'faceMatch',
                pool: FEELINGS,
                rounds: 3,
                choices: 3,
                intro: 'q_feel'
              },
              say('feel_happy', 'I feel happy.', '我感到开心。', '说说你的感觉', '也可以换成 sad / hungry / sleepy。')
            ]
          }
        ]
      },
      {
        id: 'action-words',
        order: 2,
        title: 'Move & Play',
        zhTitle: '动作词',
        icon: 'run',
        motif: 'leaf',
        badge: { id: 'badge-move', label: 'Move!', icon: 'sound-wave' },
        stickerIds: OLD_ACTIONS.slice(),
        tip: '每个动作先听、再做；做完一个就休息一下，不要求一次学完。',
        phases: [
          {
            id: 'move-1',
            title: 'Move 1',
            zhTitle: '第一组动作',
            activities: [
              { type: 'doIt', items: ['walk', 'run', 'jump'] },
              { type: 'findIt', mode: 'word', pool: ['walk', 'run', 'jump'], rounds: 3, choices: 2 }
            ]
          },
          {
            id: 'move-2',
            title: 'Move 2',
            zhTitle: '第二组动作',
            activities: [
              { type: 'doIt', items: ['clap', 'dance', 'sing'] },
              { type: 'findIt', mode: 'word', pool: ['clap', 'dance', 'sing'], rounds: 3, choices: 2 }
            ]
          },
          {
            id: 'move-3',
            title: 'Move 3',
            zhTitle: '第三组动作',
            activities: [
              { type: 'doIt', items: ['kick', 'wave', 'wobble'] },
              { type: 'findIt', mode: 'word', pool: ALL_ACTIONS.slice(0, 9), rounds: 4, choices: 3 }
            ]
          }
        ]
      },
      {
        id: 'i-can',
        order: 3,
        title: 'I Can!',
        zhTitle: 'I can',
        icon: 'star',
        motif: 'speech',
        badge: { id: 'badge-ican', label: 'I can!', icon: 'star' },
        stickerIds: [],
        tip: '这一章不学新词，练“I can + 动作”的完整句；先听懂，再跟说。',
        phases: [
          {
            id: 'listen',
            title: 'Listen',
            zhTitle: '听句子',
            activities: [
              {
                type: 'findIt',
                mode: 'sentence',
                pool: ['walk', 'run', 'jump'],
                rounds: 3,
                choices: 2,
                intro: 'q_can'
              }
            ]
          },
          {
            id: 'practice',
            title: 'Practice',
            zhTitle: '练一练',
            activities: [
              {
                type: 'findIt',
                mode: 'sentence',
                pool: ['clap', 'dance', 'sing', 'kick', 'wave'],
                rounds: 4,
                choices: 3
              }
            ]
          },
          {
            id: 'say',
            title: 'Say It',
            zhTitle: '说一说',
            activities: [
              say('can_walk', 'I can walk.', '我会走。', '跟我说：I can walk.'),
              say('can_jump', 'I can jump.', '我会跳。', '跟我说：I can jump.'),
              say('can_dance', 'I can dance.', '我会跳舞。', '跟我说：I can dance.'),
              {
                type: 'findIt',
                mode: 'sentence',
                pool: ALL_ACTIONS.slice(0, 9),
                rounds: 3,
                choices: 3
              }
            ]
          }
        ]
      },
      {
        id: 'new-actions',
        order: 4,
        title: 'More Moves',
        zhTitle: '新动作',
        icon: 'crawl',
        motif: 'leaf',
        badge: { id: 'badge-more', label: 'More!', icon: 'sparkle' },
        stickerIds: NEW_ACTIONS.slice(),
        tip: 'point / pat / poke 容易混，先分开做；snap 对 3 岁偏难，看和试就好。',
        phases: [
          {
            id: 'new-1',
            title: 'New Moves 1',
            zhTitle: '第一组新动作',
            activities: [
              { type: 'doIt', items: ['crawl', 'point', 'pat'] },
              { type: 'findIt', mode: 'word', pool: ['crawl', 'point', 'pat'], rounds: 3, choices: 2 }
            ]
          },
          {
            id: 'new-2',
            title: 'New Moves 2',
            zhTitle: '第二组新动作',
            activities: [
              { type: 'doIt', items: ['poke', 'shake', 'turn'] },
              { type: 'findIt', mode: 'word', pool: ['poke', 'shake', 'turn'], rounds: 3, choices: 2 }
            ]
          },
          {
            id: 'new-3',
            title: 'Snap + Review',
            zhTitle: '打响指 + 复习',
            activities: [
              { type: 'doIt', items: ['snap'] },
              {
                type: 'findIt',
                mode: 'word',
                pool: NEW_ACTIONS.slice(),
                rounds: 4,
                choices: 3
              }
            ]
          }
        ]
      },
      {
        id: 'new-i-can',
        order: 5,
        title: 'I Can Do More!',
        zhTitle: '新 I can',
        icon: 'trophy',
        motif: 'speech',
        badge: { id: 'badge-ican2', label: 'I can do more!', icon: 'trophy' },
        stickerIds: [],
        tip: '用新动作练完整句；孩子说不全时，说 “I can …” + 动作也可以。',
        phases: [
          {
            id: 'sentences-1',
            title: 'Sentences 1',
            zhTitle: '句子 1',
            activities: [
              {
                type: 'findIt',
                mode: 'sentence',
                pool: ['crawl', 'point', 'pat', 'poke'],
                rounds: 4,
                choices: 3,
                intro: 'q_can'
              }
            ]
          },
          {
            id: 'sentences-2',
            title: 'Sentences 2',
            zhTitle: '句子 2',
            activities: [
              {
                type: 'findIt',
                mode: 'sentence',
                pool: ['shake', 'turn', 'snap'],
                rounds: 3,
                choices: 2
              },
              {
                type: 'findIt',
                mode: 'sentence',
                pool: NEW_ACTIONS.slice(),
                rounds: 3,
                choices: 3
              }
            ]
          },
          {
            id: 'say',
            title: 'Say It',
            zhTitle: '说一说',
            activities: [
              say('can_crawl', 'I can crawl.', '我会爬。', '跟我说：I can crawl.'),
              say('can_point', 'I can point.', '我会指。', '跟我说：I can point.'),
              say('can_shake', 'I can shake.', '我会摇动。', '跟我说：I can shake.'),
              {
                type: 'findIt',
                mode: 'sentence',
                pool: NEW_ACTIONS.slice(),
                rounds: 3,
                choices: 3
              }
            ]
          }
        ]
      }
    ],
    showtime: {
      id: 'showtime',
      title: 'Showtime',
      zhTitle: '毕业演出',
      icon: 'trophy',
      activities: [
        { type: 'findIt', mode: 'word', pool: ALL_ACTIONS.slice(), rounds: 4, choices: 3 },
        { type: 'findIt', mode: 'sentence', pool: ALL_ACTIONS.slice(), rounds: 4, choices: 3 },
        { type: 'doIt', items: ['jump', 'crawl', 'clap', 'wave'] }
      ]
    },
    playground: {
      actions: ALL_ACTIONS.slice(),
      feelings: FEELINGS.slice(),
      challenges: [
        { type: 'findIt', mode: 'word', pool: ALL_ACTIONS.slice(), rounds: 5, choices: 3 },
        { type: 'findIt', mode: 'sentence', pool: ALL_ACTIONS.slice(), rounds: 5, choices: 3 },
        { type: 'doIt', items: ['walk', 'run', 'jump', 'clap', 'dance', 'kick', 'crawl', 'wave'] }
      ]
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = units.unit1;
})(typeof globalThis !== 'undefined' ? globalThis : this);
